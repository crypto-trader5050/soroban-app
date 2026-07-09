import requests
import json
import sys
import os
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils.logger import setup_logger

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True, parents=True)

log_file = "symbol_info_generator.log"  # ファイル名だけ
logger = setup_logger("symbol_info_generator", log_file)

# 出力ファイルパス
CACHE_PATH = Path("config/symbol_tick_cache.json")
CACHE_PATH.parent.mkdir(exist_ok=True, parents=True)

BYBIT_INSTRUMENTS_API = "https://api.bybit.com/v5/market/instruments-info"
BYBIT_TICKERS_API = "https://api.bybit.com/v5/market/tickers"

MIN_VOLUME = 100000  # 流動性最低ライン（USD）
TOP_VOLUME_N = 50    # 出来高上位N通貨を抽出
TOP_VOLATILITY_N = 7 # その中からボラ上位N通貨を抽出

def fetch_instruments_info():
    try:
        res = requests.get(BYBIT_INSTRUMENTS_API, params={"category": "linear"})
        res.raise_for_status()
        data = res.json()
        return data.get("result", {}).get("list", [])
    except Exception as e:
        logger.error(f"❌ instruments-info API取得失敗: {e}")
        return []

def fetch_tickers():
    try:
        res = requests.get(BYBIT_TICKERS_API, params={"category": "linear"})
        res.raise_for_status()
        data = res.json()
        return data.get("result", {}).get("list", [])
    except Exception as e:
        logger.error(f"❌ tickers API取得失敗: {e}")
        return []

def calculate_volatility(ticker_item):
    try:
        last = float(ticker_item.get("lastPrice", 0))
        prev = float(ticker_item.get("prevPrice24h", 0))
        if prev == 0:
            return 0.0
        return abs(last - prev) / prev * 100
    except Exception:
        return 0.0

def generate_and_save_symbol_info():
    instruments = fetch_instruments_info()
    tickers = fetch_tickers()

    if not instruments or not tickers:
        logger.error("❌ 通貨情報取得に失敗しました。終了します。")
        return

    # tickerをシンボルで辞書化
    ticker_dict = {t["symbol"]: t for t in tickers}

    filtered = []
    for inst in instruments:
        sym = inst.get("symbol", "")
        if not sym.endswith("USDT") or sym.startswith("100"):
            continue
        ticker = ticker_dict.get(sym)
        if not ticker:
            continue
        volume24h = float(ticker.get("volume24h", 0))
        if volume24h < MIN_VOLUME:
            continue
        volat = calculate_volatility(ticker)
        filtered.append((inst, volat, volume24h))

    logger.info(f"流動性フィルター通過数: {len(filtered)}")

    # 出来高上位TOP_VOLUME_N抽出
    top_volume = sorted(filtered, key=lambda x: x[2], reverse=True)[:TOP_VOLUME_N]
    logger.info(f"出来高上位{TOP_VOLUME_N}通貨数: {len(top_volume)}")

    # その中からボラ上位TOP_VOLATILITY_N抽出
    top_volatile = sorted(top_volume, key=lambda x: x[1], reverse=True)[:TOP_VOLATILITY_N]
    logger.info(f"ボラ上位{TOP_VOLATILITY_N}通貨数: {len(top_volatile)}")

    tick_data = {}
    for inst, volat, vol24h in top_volatile:
        try:
            tick_data[inst["symbol"]] = {
                "tick_size": float(inst["priceFilter"]["tickSize"]),
                "qty_step": float(inst["lotSizeFilter"]["qtyStep"]),
                "min_qty": float(inst["lotSizeFilter"]["minOrderQty"]),
                "min_notional": float(inst["lotSizeFilter"].get("minNotionalValue", 5)),
            }
            logger.info(f"選出通貨: {inst['symbol']} | ボラ: {volat:.2f}% | 出来高24h: {vol24h:.0f}")
        except Exception as e:
            logger.warning(f"⚠️ {inst.get('symbol')} データ抽出失敗: {e}")

    if not tick_data:
        logger.error("❌ 有効な通貨が選出できませんでした")
        return

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(tick_data, f, indent=2, ensure_ascii=False)

    logger.info(f"✅ Top {len(tick_data)}通貨の設定を {CACHE_PATH} に保存しました")

def save_symbol_tick_info_to_cache(client):
    symbols = client.get_all_symbols()  # 全取引可能なシンボル取得
    tick_info = {}
    for s in symbols:
        info = client.get_symbol_info(s)
        if info:
            tick_info[s] = {
                "tick_size": info["tickSize"],
                "qty_step": info["lotSize"],
                "min_qty": info["minOrderQty"],
                "max_qty": info["maxOrderQty"],
                "max_decimal": info.get("pricePrecision", 2)  # 任意
            }
    with open("config/symbol_tick_cache.json", "w", encoding="utf-8") as f:
        json.dump(tick_info, f, indent=2)

if __name__ == "__main__":
    generate_and_save_symbol_info()
