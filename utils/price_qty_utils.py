import os
import json
import math
from functools import lru_cache

@lru_cache(maxsize=1)
def load_symbol_tick_cache():
    """
    symbol_tick_cache.json をキャッシュして読み込み。
    ファイルパスはこのファイルの一つ上のconfigフォルダ内を想定。
    """
    path = os.path.join(os.path.dirname(__file__), '../config/symbol_tick_cache.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def get_symbol_config(symbol: str):
    """
    指定シンボルの設定情報を取得する。
    見つからなければ例外を発生させる。
    """
    data = load_symbol_tick_cache()
    if symbol not in data:
        raise ValueError(f"Symbol {symbol} is not in symbol_tick_cache.json")
    return data[symbol]

import math

def round_qty_by_mode(symbol: str, qty: float, mode: str = "floor") -> float:
    """
    qty_stepの整数倍で丸める関数。
    modeは "floor"（切り捨て）, "ceil"（切り上げ）, "round"（四捨五入）から選択可能。
    mode="floor" の場合は、切り捨て結果が0で qty>0 の時のみ切り上げる。

    Args:
        symbol: 通貨ペア文字列
        qty: 丸め対象の数量
        mode: 丸めモード（"floor", "ceil", "round"）

    Returns:
        丸め後の数量（float）
    """
    cfg = get_symbol_config(symbol)
    step = cfg["qty_step"]
    max_decimal = cfg["max_decimal"]

    if qty <= 0:
        return 0.0

    if mode == "floor":
        floored = math.floor(qty / step) * step
        floored = round(floored, max_decimal)

        if floored == 0:
            ceiled = math.ceil(qty / step) * step
            ceiled = round(ceiled, max_decimal)
            return ceiled
        else:
            return floored

    elif mode == "ceil":
        ceiled = math.ceil(qty / step) * step
        ceiled = round(ceiled, max_decimal)
        return ceiled

    elif mode == "round":
        rounded = round(qty / step) * step
        rounded = round(rounded, max_decimal)
        return rounded

    else:
        raise ValueError(f"Unknown rounding mode: {mode}")


def round_price(symbol: str, price: float) -> float:
    """
    指定symbolのtick_valueとmax_decimalに基づき価格を丸める。
    tick_valueの整数倍に丸め、小数点以下max_decimal桁に調整。
    """
    cfg = get_symbol_config(symbol)
    tick = cfg["tick_value"]
    max_decimal = cfg["max_decimal"]
    # priceをtick_value単位で丸め
    rounded = round(round(price / tick) * tick, max_decimal)
    return rounded

def get_min_qty(symbol: str) -> float:
    """
    指定symbolの最小注文数量を返す。
    symbol_tick_cache.json の "min_qty" フィールドを参照。
    """
    cfg = get_symbol_config(symbol)
    min_qty = cfg.get("min_qty", 0)
    if min_qty is None or min_qty <= 0:
        raise ValueError(f"[ERROR] 無効な min_qty: symbol={symbol}, min_qty={min_qty}")
    return float(min_qty)
