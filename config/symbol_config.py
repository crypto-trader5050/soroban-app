# utils/symbol_config.py
import json
import os

CACHE_PATH = "config/symbol_tick_cache.json"

def load_symbol_config():
    if not os.path.exists(CACHE_PATH):
        raise FileNotFoundError("⚠️ symbol_tick_cache.json が見つかりません。先に生成してください。")
    with open(CACHE_PATH, "r") as f:
        return json.load(f)

def get_symbol_config(symbol: str):
    data = load_symbol_config()
    if symbol not in data:
        raise ValueError(f"{symbol} の設定がキャッシュに存在しません")
    return data[symbol]

def get_all_symbols():
    return list(load_symbol_config().keys())
