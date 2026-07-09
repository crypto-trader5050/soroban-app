import os
import json
import logging
import math
import requests
from typing import Optional
from decimal import Decimal, ROUND_UP
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Optional, Dict, List
from utils.time_utils import get_jst_now  # 上部の import セクションに追記済みなら不要
from utils.logger import logger  # ← main.py で dotenv を事前に load しておく
from utils.bybit_client import TICK_SIZES, MIN_QTY, STEP_SIZE
from utils.bybit_client import round_qty_for_symbol
from utils.realtime_orderflow_utils import get_recent_market_order_volume
from utils.realtime_orderflow_utils import get_orderflow_monitor

if TYPE_CHECKING:
    from core.entry_conditions import EntryConditionEvaluator

# =====================
# 定数定義
# =====================
API_BASE = "https://api.bybit.com"
DATA_DIR = Path("data/avg_volume")
DATA_DIR.mkdir(parents=True, exist_ok=True)
JST = timezone(timedelta(hours=9))  # 日本時間

# =====================
# データ取得
# =====================
def fetch_kline_data(symbol: str, interval: str = "1", days: int = 7) -> List[list]:
    """
    BybitのREST APIから「昨日までの過去N日分」のKlineデータ（1分足）を取得。
    ※ 直近の未確定足や未来の足を避けるため、今日の0:00（UTC）までで打ち切る。
    """
    # 今日のUTC 0:00時点まで（日本時間の今日9:00）で終了
    today_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    end_time = int(today_utc.timestamp())
    start_time = int((today_utc - timedelta(days=days)).timestamp())

    klines = []
    limit = 1000
    current_start = start_time

    while current_start < end_time:
        url = f"{API_BASE}/v5/market/kline"
        params = {
            "category": "linear",
            "symbol": symbol,
            "interval": interval,
            "start": current_start * 1000,
            "end": end_time * 1000,
            "limit": limit
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            logger.error(f"[{symbol}] APIリクエスト失敗: {e}")
            break

        if data.get("retCode") != 0 or "list" not in data.get("result", {}):
            logger.error(f"[{symbol}] APIレスポンス異常: {data}")
            break

        items = data["result"]["list"]
        if not items:
            logger.warning(f"[{symbol}] Klineデータが空。取得を終了。")
            break

        klines.extend(items)

        last_ts = int(items[-1][0]) // 1000
        if last_ts <= current_start:
            logger.warning(f"[{symbol}] タイムスタンプが進まず。ループ終了。")
            break

        current_start = last_ts + 60

    return klines

# =====================
# 集計・保存・読込
# =====================
def compute_avg_volume_per_minute(klines: List[list]) -> Dict[str, float]:
    """
    時刻（HH:MM JST）ごとの平均出来高を計算。
    """
    volumes_by_minute = {}

    for kline in klines:
        timestamp = int(kline[0]) // 1000
        volume = float(kline[5])
        dt = datetime.fromtimestamp(timestamp, JST)
        minute_key = dt.strftime("%H:%M")
        volumes_by_minute.setdefault(minute_key, []).append(volume)

    avg_volume = {
        minute: sum(vs) / len(vs)
        for minute, vs in volumes_by_minute.items() if vs
    }
    return avg_volume

def save_avg_volume(symbol: str, avg_volume: Dict[str, float]):
    path = DATA_DIR / f"{symbol}.json"
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(avg_volume, f, indent=2)
        logger.info(f"[{symbol}] 平均出来高を保存: {path}")
    except Exception as e:
        logger.error(f"[{symbol}] ファイル保存失敗: {e}")

def load_volume_data(symbol: str) -> Dict[str, float]:
    path = DATA_DIR / f"{symbol}.json"
    if not path.exists():
        logger.warning(f"[{symbol}] 平均出来高ファイルが存在しません: {path}")
        return {}

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[{symbol}] 平均出来高読み込み失敗: {e}")
        return {}

# =====================
# 初期化・更新
# =====================
def init_volume_data(symbols: List[str], days: int = 7):
    """
    複数通貨の平均出来高を初期生成（ファイル保存）。
    """
    for symbol in symbols:
        logger.info(f"[{symbol}] Klineデータ取得開始")
        klines = fetch_kline_data(symbol, days=days)
        if not klines:
            logger.warning(f"[{symbol}] Kline取得失敗 → スキップ")
            continue

        logger.info(f"[{symbol}] 平均出来高計算中（件数: {len(klines)}）")
        avg_volume = compute_avg_volume_per_minute(klines)
        save_avg_volume(symbol, avg_volume)
        logger.info(f"[{symbol}] 完了（時間帯数: {len(avg_volume)}）")

def update_all_symbols_avg_volume(symbols: List[str], days: int = 7):
    logger.info("平均出来高の一括更新を開始します。")
    init_volume_data(symbols, days)
    logger.info("平均出来高の一括更新が完了しました。")
    
def is_reverse_large_order_triggered( 
    symbol: str,
    side: str,
    orderbook: Dict[str, List[List[float]]],
    window_sec: int = 2,
    threshold_ratio: float = 0.0075,
    deviation_threshold: float = 3.5,
    entry_condition_evaluator: Optional["EntryConditionEvaluator"] = None
) -> bool:
    """
    2秒以内に逆方向成行注文が平均1分出来高の0.75%以上、
    かつ板偏差が3.5%未満ならTrueを返す
    """
        
    now = get_jst_now()
    minute_key = now.strftime("%H:%M")

    avg_volume_dict = load_volume_data(symbol)
    avg_minute_volume = avg_volume_dict.get(minute_key)

    if avg_minute_volume is None:
        logger.warning(f"[{symbol}] {minute_key} の平均出来高データが存在しません")
        return False

    threshold_volume = avg_minute_volume * threshold_ratio

    try:
        reverse_order_volume = get_recent_market_order_volume(symbol, side, window_sec)
    except RuntimeError as e:
        logger.error(f"[{symbol}] get_recent_market_order_volume エラー: {e}")
        return False

    # ✅ EntryConditionEvaluator を使って板偏差を取得
    if entry_condition_evaluator:
        deviation = entry_condition_evaluator.get_board_deviation(symbol, orderbook)
    else:
        logger.error(f"[{symbol}] EntryConditionEvaluatorが未設定です")
        return False

    logger.debug(f"[{symbol}] 逆方向成行量={reverse_order_volume:.4f}, しきい値={threshold_volume:.4f}, 板偏差={deviation:.4f}")

    return (reverse_order_volume >= threshold_volume) and (abs(deviation) < deviation_threshold)

# =====================
# CLI実行用
# =====================
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(dotenv_path="config/secrets.test.env")

    target_symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT"]
    init_volume_data(target_symbols)
    
def calculate_lot_by_stoploss_range(
    symbol: str,
    stop_loss_usdt: float,
    balance: float,
    multiplier: float = 1.0
) -> float:
    """
    ロスカット幅と資産から適正ロットを算出。
    資産の1%以内の損失になるロットを基本として倍率を掛ける。
    ※ 倍率は呼び出し側でかけて丸めること。
    """

    logger.debug(f"[LotCalc] symbol={symbol}, stop_loss_usdt={stop_loss_usdt:.6f}, balance={balance}, multiplier={multiplier}")

    tick_size = TICK_SIZES.get(symbol, 0.01)
    if tick_size == 0 or stop_loss_usdt <= 0.001:
        logger.debug(f"[LotCalc] 無効なパラメータ: tick_size={tick_size}, stop_loss_usdt={stop_loss_usdt}")
        return 0.0

    max_risk = balance * 0.01
    logger.debug(f"[LotCalc] max_risk (1% of balance) = {max_risk:.6f}")

    raw_lot = max_risk / stop_loss_usdt
    logger.debug(f"[LotCalc] raw_lot = max_risk / stop_loss_usdt = {max_risk:.6f} / {stop_loss_usdt:.6f} = {raw_lot:.6f}")

    lot = raw_lot * multiplier
    logger.debug(f"[LotCalc] lot after multiplier ({multiplier}) applied = {lot:.6f}")

    return raw_lot

def calculate_true_range(recent_prices: List[Dict[str, float]]) -> float:
    """
    TR（True Range）を計算する。
    recent_prices: List[Dict] 各要素に 'high', 'low', 'close' を含む（時系列順）
    Returns: 最も直近の TR 値（float）
    """
    if len(recent_prices) < 2:
        return 0.0  # TR 計算には最低2本必要

    current = recent_prices[-1]
    previous = recent_prices[-2]

    high = current["high"]
    low = current["low"]
    prev_close = previous["close"]

    tr = max(
        high - low,
        abs(high - prev_close),
        abs(low - prev_close)
    )

    return tr

# =====================
# ボラティリティ定義（通貨ペア別）
# =====================
VOLATILITY_LEVELS = {
    "BTCUSDT": {
        "trail_pct": 0.035,               # 利確トリガー：3.5%
        "trail_offset_pct": 0.025,        # トレール幅：2.5%
        "large_order_ratio": 0.005,       # 大口注文：0.5%
        "buy_sell_ratio_high": 1.6,
        "buy_sell_ratio_low": 0.625,
        "min_large_order_count": 3,
        "limit_cancel_deviation": 0.035,
    },
    "DOGEUSDT": {
        "trail_pct": 0.05,
        "trail_offset_pct": 0.03,
        "large_order_ratio": 0.01,
        "buy_sell_ratio_high": 1.8,
        "buy_sell_ratio_low": 0.55,
        "min_large_order_count": 2,
        "limit_cancel_deviation": 0.04,
    },
    "ETHUSDT": {
        "trail_pct": 0.025,
        "trail_offset_pct": 0.018,
        "large_order_ratio": 0.004,
        "buy_sell_ratio_high": 1.5,
        "buy_sell_ratio_low": 0.65,
        "min_large_order_count": 3,
        "limit_cancel_deviation": 0.03,
    },
    "SOLUSDT": {
        "trail_pct": 0.045,
        "trail_offset_pct": 0.03,
        "large_order_ratio": 0.006,
        "buy_sell_ratio_high": 1.7,
        "buy_sell_ratio_low": 0.6,
        "min_large_order_count": 2,
        "limit_cancel_deviation": 0.038,
    },
    "XRPUSDT": {
        "trail_pct": 0.04,
        "trail_offset_pct": 0.028,
        "large_order_ratio": 0.006,
        "buy_sell_ratio_high": 1.55,
        "buy_sell_ratio_low": 0.6,
        "min_large_order_count": 2,
        "limit_cancel_deviation": 0.035,
    }
}

def get_volatility_level(symbol: str) -> dict:
    """
    通貨ごとのボラティリティ関連設定を返す。
    """
    return VOLATILITY_LEVELS.get(symbol.upper(), VOLATILITY_LEVELS["BTCUSDT"])
