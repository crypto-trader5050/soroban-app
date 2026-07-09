import math
import logging
from utils.logger import logger
from utils.symbol_info_manager import load_or_fetch_symbol_config
from utils.bybit_client import MIN_QTY, STEP_SIZE

logger = logging.getLogger(__name__)

MIN_ORDER_VALUE = 6.5  # Bybit の最低注文金額（USDT換算）

def get_lot_config(symbol: str):
    config = load_or_fetch_symbol_config(symbol)
    if not config:
        logger.error(f"[LotCalculator] ❌ {symbol} の設定が取得できません")
        return None
    return config

def round_down_to_step(value: float, step: float) -> float:
    """step刻みで数量を切り捨てる"""
    return math.floor(value / step) * step

def calculate_min_lot(symbol: str, price: float) -> float:
    """
    5USDT以上になるような最小ロットを計算（成行でも指値でも使用）
    """
    config = get_lot_config(symbol)
    if not config or price <= 0:
        logger.error(f"[LotCalculator] ❌ 無効な引数: {symbol}, price={price}")
        return 0.0

    min_qty = config.get("min_qty")
    qty_step = config.get("qty_step")
    max_decimal = config.get("max_decimal")

    if min_qty is None or qty_step is None or max_decimal is None:
        logger.error(f"[LotCalculator] ❌ {symbol} の設定情報不完全")
        return 0.0

    try:
        min_qty = float(min_qty)
        qty_step = float(qty_step)
        max_decimal = int(max_decimal)
    except Exception as e:
        logger.error(f"[LotCalculator] ❌ {symbol} の設定値が不正: {e}")
        return 0.0

    # 5USDTを満たす最小数量を計算しstep刻みで切り捨て
    min_required_qty = max(min_qty, MIN_ORDER_VALUE / price)
    final_qty = round_down_to_step(min_required_qty, qty_step)
    if final_qty < min_qty:
        final_qty = min_qty
    final_qty = round(final_qty, max_decimal)

    logger.debug(f"[LotCalculator] 📐 最低ロット計算: {symbol}, price={price} → {final_qty}枚")
    return final_qty

def calculate_safe_lot(
    symbol: str,
    entry_price: float,
    stop_loss_usdt: float,
    balance: float,
    entry_pct_max: float = 0.02,
    max_loss_pct: float = 0.02
) -> float:
    config = get_lot_config(symbol)
    if not config:
        logger.error(f"[LotCalculator] ❌ symbol={symbol} の設定が取得できません")
        return 0.0
    if entry_price <= 0 or stop_loss_usdt <= 0 or balance <= 0:
        logger.error(f"[LotCalculator] ❌ 無効な引数: entry_price={entry_price}, stop_loss={stop_loss_usdt}, balance={balance}")
        return 0.0

    qty_step = config.get("qty_step")
    min_qty = config.get("min_qty") or MIN_QTY.get(symbol)
    max_decimal = config.get("max_decimal")

    if qty_step is None or min_qty is None or max_decimal is None:
        logger.error(f"[LotCalculator] ❌ {symbol} の設定不完全: qty_step={qty_step}, min_qty={min_qty}, max_decimal={max_decimal}")
        return 0.0

    try:
        qty_step = float(qty_step)
        min_qty = float(min_qty)
        max_decimal = int(max_decimal)
    except Exception as e:
        logger.error(f"[LotCalculator] ❌ 設定値変換失敗: {e}")
        return 0.0

    if min_qty <= 0:
        logger.error(f"[LotCalculator] ❌ min_qty <= 0: {min_qty}")
        return 0.0

    max_loss_usdt = balance * max_loss_pct
    entry_budget_usdt = balance * entry_pct_max

    max_lot_by_loss = max_loss_usdt / stop_loss_usdt
    max_lot_by_entry = entry_budget_usdt / entry_price
    raw_lot = min(max_lot_by_loss, max_lot_by_entry)

    logger.info(f"[LotCalculator] 🧮 balance={balance:.4f}, max_loss_usdt={max_loss_usdt:.4f}, entry_budget_usdt={entry_budget_usdt:.4f}")
    logger.info(f"[LotCalculator] max_lot_by_loss={max_lot_by_loss:.6f}, max_lot_by_entry={max_lot_by_entry:.6f}, raw_lot={raw_lot:.6f}")

    # min_qty に届かない場合
    if raw_lot < min_qty:
        logger.info(f"[LotCalculator] ⚠ raw_lot({raw_lot:.6f}) < min_qty({min_qty}) → min_qtyを使用")
        raw_lot = min_qty

    order_value = raw_lot * entry_price
    if order_value < MIN_ORDER_VALUE:
        min_required_qty = max(min_qty, MIN_ORDER_VALUE / entry_price)
        estimated_loss = min_required_qty * stop_loss_usdt

        logger.warning(f"[LotCalculator] 🚨 注文金額が {MIN_ORDER_VALUE}USDT 未満 → {order_value:.2f}USDT")

        if estimated_loss > max_loss_usdt:
            logger.warning(f"[LotCalculator] ❌ 想定損失 {estimated_loss:.2f}USDT > 許容 {max_loss_usdt:.2f}USDT → エントリー中止")
            return 0.0
        else:
            logger.info(f"[LotCalculator] ✅ MIN_ORDER_VALUE を満たすためにロットを {min_required_qty:.6f} に調整")
            raw_lot = min_required_qty

    final_lot = round_down_to_step(raw_lot, qty_step)
    if final_lot < min_qty:
        final_lot = min_qty
    final_lot = round(final_lot, max_decimal)

    order_value_final = final_lot * entry_price
    logger.info(f"[LotCalculator] ✅ 最終ロット={final_lot:.6f}, 注文額={order_value_final:.2f}USDT")

    if final_lot <= 0:
        logger.error(f"[LotCalculator] ❌ 最終ロットが 0 以下: {final_lot} → エントリー中止")
        return 0.0

    return final_lot

def round_qty_to_minimum(symbol: str, qty: float) -> float:
    """
    指定symbolのqty_stepとmax_decimalに基づき、数量を「切り上げ」で丸める。
    ただし最小数量（MIN_QTY）を下回らないように保証する。
    """
    qty_step = STEP_SIZE[symbol]
    min_qty = MIN_QTY[symbol]

    if qty < min_qty:
        return min_qty

    # 切り上げて qty_step に合わせる
    rounded_qty = math.ceil(qty / qty_step) * qty_step

    # qty_step の小数桁数に合わせて丸め（例: qty_step=0.001 → 小数3桁）
    decimal_places = abs(int(round(math.log10(qty_step))))
    return round(rounded_qty, decimal_places)

