import requests
import os
import json
from utils.logger import logger

CACHE_FILE = "config/symbol_tick_cache.json"
BYBIT_MARKET_URL = "https://api.bybit.com/v5/market/instruments-info"

def fetch_tick_size_from_bybit(symbol: str, category: str = "linear") -> dict:
    """
    Bybit APIから指定シンボルのtickSizeなどを取得。
    categoryは将来変更可能。
    """
    try:
        params = {"category": category, "symbol": symbol}
        response = requests.get(BYBIT_MARKET_URL, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        logger.info(f"[SymbolInfo] API response JSON for {symbol}: {json.dumps(data, indent=2)}")

        if data["retCode"] != 0 or not data["result"]["list"]:
            raise ValueError(f"Bybit API error: {data.get('retMsg')}")

        info = data["result"]["list"][0]
        return {
            "tick_value": float(info["priceFilter"]["tickSize"]),
            "min_qty": float(info["lotSizeFilter"]["minOrderQty"]),
            "qty_step": float(info["lotSizeFilter"]["qtyStep"]),
            "max_decimal": get_decimal_places(info["priceFilter"]["tickSize"])
        }

    except Exception as e:
        logger.error(f"[SymbolInfo] ❌ {symbol} の tickSize取得失敗: {e}")
        return {}

def get_decimal_places(number_str: str) -> int:
    if '.' not in number_str:
        return 0
    return len(number_str.rstrip('0').split('.')[-1])

def load_or_fetch_symbol_config(symbol: str) -> dict:
    # 既存の個別取得用。必要に応じて使用
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                cache = json.load(f)
        except Exception as e:
            logger.warning(f"[SymbolInfo] ⚠️ キャッシュファイル読み込み失敗: {e}")

    if symbol in cache:
        return cache[symbol]

    config = fetch_tick_size_from_bybit(symbol)
    if config:
        cache[symbol] = config
        try:
            with open(CACHE_FILE, "w") as f:
                json.dump(cache, f, indent=2)
        except Exception as e:
            logger.warning(f"[SymbolInfo] ⚠️ キャッシュファイル書き込み失敗: {e}")
        return config

    if symbol in cache:
        logger.warning(f"[SymbolInfo] ⚠️ API失敗のため古いキャッシュを使用します: {symbol}")
        return cache[symbol]

    return {}

def load_all_symbol_configs() -> dict:
    """
    キャッシュファイルの全シンボル設定を一括で読み込み。
    """
    if not os.path.exists(CACHE_FILE):
        logger.warning(f"[SymbolInfo] キャッシュファイルが存在しません: {CACHE_FILE}")
        return {}

    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            logger.info(f"[SymbolInfo] キャッシュファイルから{len(data)}件のシンボル設定を読み込みました")
            return data
    except Exception as e:
        logger.error(f"[SymbolInfo] キャッシュファイル読み込み失敗: {e}")
        return {}
