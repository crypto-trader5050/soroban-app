import csv
import os
import time
from datetime import datetime
from typing import List, Tuple
import pytz

from utils.logger import logger


def load_news_schedule(csv_path="config/news_schedule.csv") -> List[datetime]:
    news_times = []
    if not os.path.exists(csv_path):
        logger.warning(f"[TimeUtils] ニューススケジュールCSVが存在しません: {csv_path}")
        return news_times

    jst = pytz.timezone("Asia/Tokyo")

    with open(csv_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                dt_str = row.get("news_datetime")
                if not dt_str:
                    logger.warning(f"[TimeUtils] 欠落したnews_datetimeカラム: {row}")
                    continue
                dt_jst = jst.localize(datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S"))
                dt_utc = dt_jst.astimezone(pytz.utc)
                news_times.append(dt_utc)
            except Exception as e:
                logger.warning(f"[TimeUtils] Failed to parse row {row}: {e}")
    return news_times


def blackout(now: datetime, news_schedule: List[datetime], blackout_seconds: int = 30) -> bool:
    for news_time in news_schedule:
        if abs((now - news_time).total_seconds()) <= blackout_seconds:
            return True
    return False


def get_current_price(symbol: str, max_retries: int = 5, delay: float = 0.5) -> float:
    """
    Bybit APIから現在価格（lastPrice）を取得（最大 max_retries 回リトライ）。
    取得失敗や価格が0の場合はリトライし、最終的に取得できなければ0.0を返す。
    """
    from utils.bybit_client import BybitClient  # 🔁 遅延インポート
    client = BybitClient(testnet=True)

    for attempt in range(1, max_retries + 1):
        try:
            ticker = client.get_ticker(symbol)
            if ticker and "lastPrice" in ticker:
                price = float(ticker["lastPrice"])
                if price > 0:
                    return round(price, 2)
                else:
                    logger.warning(f"[TimeUtils] 取得価格が0または無効 (attempt={attempt}): {symbol} → {price}")
            else:
                logger.warning(f"[TimeUtils] tickerデータ不正 (attempt={attempt}): {symbol} → {ticker}")
        except Exception as e:
            logger.error(f"[TimeUtils] get_current_price エラー (attempt={attempt}): {e}")
        time.sleep(delay)

    logger.error(f"[TimeUtils] ❌ 現在価格取得失敗（最終）: {symbol}")
    return 0.0


def get_recent_high_low(symbol: str, seconds: int = 5) -> Tuple[float, float]:
    try:
        current_price = get_current_price(symbol)
        if current_price <= 0:
            logger.warning(f"[TimeUtils] 高値・安値計算中に価格が0または取得失敗（{symbol}）")
            return 0.0, 0.0

        high = current_price * 1.001
        low = current_price * 0.999
        return round(high, 2), round(low, 2)
    except Exception as e:
        logger.error(f"[TimeUtils] get_recent_high_low エラー: {e}")
        return 0.0, 0.0

def get_jst_now() -> datetime:
    """
    JST（日本時間）での現在時刻を返す。
    """
    return datetime.now(pytz.timezone("Asia/Tokyo"))

# グローバルキャッシュ
_recent_price_cache = {}

def update_recent_prices(symbol: str, kline: dict):
    _recent_price_cache[symbol] = {
        "high": float(kline["high"]),
        "low": float(kline["low"]),
        "close": float(kline["close"]),
        "timestamp": time.time()
    }

def get_recent_high_low(symbol: str) -> Tuple[float, float, float]:
    data = _recent_price_cache.get(symbol)
    if not data or (time.time() - data["timestamp"] > 6):
        raise ValueError(f"[time_utils] ❌ Price data for {symbol} is outdated or missing.")
    return data["high"], data["low"], data["close"]
