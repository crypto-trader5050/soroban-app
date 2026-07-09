import time
import os
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional, Callable, Any

from utils.logger import logger
from utils.logger import entry_logger
from utils.realtime_orderflow import RealtimeOrderFlow
from utils.lot_calculator import calculate_min_lot
from utils.symbol_info_manager import load_all_symbol_configs
from utils.volume_stats import calculate_true_range, load_volume_data, calculate_lot_by_stoploss_range
from utils.error_tracker import ApiErrorTracker
from utils.realtime_orderflow_utils import get_recent_market_order_volume
from utils.bybit_client import round_qty_for_symbol

api_error_tracker = ApiErrorTracker()

STRATEGY_VERSION = "1.0"

class EntryConditionEvaluator:
    def __init__(
        self,
        avg_volumes: Dict[str, Dict[str, float]],
        min_loss_interval: int = 15,
        orderflow: Optional[RealtimeOrderFlow] = None,
        mock_deviation_func: Optional[Callable[[str], float]] = None,
    ):
        self.avg_volumes = avg_volumes
        self.min_loss_interval = min_loss_interval
        self.last_trigger_log: Dict[str, float] = {}
        self.last_entry_side: Dict[str, str] = {}
        self.mock_deviation_func = mock_deviation_func
        self.symbol_config = load_all_symbol_configs()

        self.deviation_threshold = 2.5
        self.buy_sell_ratio_buy = 1.6
        self.buy_sell_ratio_sell = 0.625
        self.large_order_ratio = 0.005

        self.symbols = list(avg_volumes.keys())
        self.orderflow = orderflow or RealtimeOrderFlow(self.symbols)

        self.force_entry = os.getenv("FORCE_ENTRY", "False").lower() == "true"
        raw_side = os.getenv("FORCE_ENTRY_SIDE", "Buy").strip()
        self.force_side = raw_side if raw_side in ["Buy", "Sell"] else "Buy"

        if self.force_entry and raw_side not in ["Buy", "Sell"]:
            logger.warning(f"[EntryEvaluator] ⚠️ FORCE_ENTRY_SIDE の値が不正: '{raw_side}' → 'Buy' に変更")

    def is_blackout(self, now: datetime, news_schedule: List[dict], symbol: str = "") -> bool:
        now = now.astimezone(timezone.utc)

        for news in news_schedule:
            news_time = news["time"].astimezone(timezone.utc)
            currency = news.get("currency", "").upper()

            if currency and currency not in symbol.upper():
                continue

            # ✅ 柔軟な前後秒数（CSVから取得）
            before = int(news.get("before_seconds", 30))
            after = int(news.get("after_seconds", 30))

            delta = (now - news_time).total_seconds()
            if -before <= delta <= after:
                logger.debug(
                    f"🛑 ブラックアウト中 [{currency}] {news.get('event')} "
                    f"（{delta:.1f}s経過 / 前{before}s・後{after}s）"
                )
                return True

        return False

    def detect_board_trigger(self, symbol: str, deviation_history: List[float]) -> Tuple[bool, Optional[str], float]:
        if len(deviation_history) < 2:
            logger.debug(f"[{symbol}] [BoardTrigger] 履歴不足: {len(deviation_history)}件")
            return False, None, 0.0

        prev, curr = deviation_history[-2], deviation_history[-1]
        delta = abs(curr - prev)
        flipped = (prev >= 0 > curr) or (prev < 0 <= curr)

        if delta >= self.deviation_threshold and flipped:
            direction = "Buy" if curr > 0 else "Sell"
            logger.info(f"[{symbol}] [BoardTrigger] 成立: direction={direction}, Δ={delta:.2f}")
            entry_logger.info(f"[{symbol}] 条件① BoardTrigger 成立: prev={prev:.2f}, curr={curr:.2f}, direction={direction}")
            return True, direction, delta
        else:
            logger.debug(f"[{symbol}] [BoardTrigger] 不成立: Δ={delta:.2f}, flipped={flipped}")
        return False, None, delta

    def detect_ratio_trigger(self, symbol: str, market_orders: List[Dict], avg_volume: float) -> Tuple[bool, Optional[str]]:
        now_ts = datetime.now(timezone.utc).timestamp()
        recent = [o for o in market_orders if now_ts - o.get("timestamp", 0) <= 10]

        if len(recent) < 3:
            logger.debug(f"[{symbol}] [RatioTrigger] 成行注文数不足: {len(recent)}件")
            return False, None

        buy_vol = sum(float(o["size"]) for o in recent if o["side"] == "Buy")
        sell_vol = sum(float(o["size"]) for o in recent if o["side"] == "Sell")

        if buy_vol == 0 or sell_vol == 0:
            logger.debug(f"[{symbol}] [RatioTrigger] ボリューム不足: Buy={buy_vol}, Sell={sell_vol}")
            return False, None

        ratio = buy_vol / sell_vol
        big_count = sum(1 for o in recent if float(o["size"]) >= avg_volume * 0.003)

        if ratio >= self.buy_sell_ratio_buy and big_count >= 2:
            logger.info(f"[{symbol}] [RatioTrigger] Buy 成立: ratio={ratio:.2f}, big_count={big_count}")
            entry_logger.info(f"[{symbol}] 条件② RatioTrigger 成立: ratio={ratio:.2f}, big_count={big_count}, direction=Buy")
            return True, "Buy"
        elif ratio <= self.buy_sell_ratio_sell and big_count >= 2:
            logger.info(f"[{symbol}] [RatioTrigger] Sell 成立: ratio={ratio:.2f}, big_count={big_count}")
            entry_logger.info(f"[{symbol}] 条件② RatioTrigger 成立: ratio={ratio:.2f}, big_count={big_count}, direction=Sell")
            return True, "Sell"

        logger.debug(f"[{symbol}] [RatioTrigger] 不成立: ratio={ratio:.2f}, big_count={big_count}")
        return False, None

    def detect_large_market_orders(self, symbol: str) -> Tuple[bool, Optional[str], float]:
        try:
            now_utc = datetime.now(timezone.utc)
            now_ts = now_utc.timestamp()
            time_key = now_utc.strftime("%H:%M")
            avg_volume = self.avg_volumes.get(symbol, {}).get(time_key, 0.0)
            threshold = avg_volume * self.large_order_ratio if avg_volume > 0 else 0.001

            buy_vol = self.orderflow.get_recent_volume(symbol, "Buy")
            sell_vol = self.orderflow.get_recent_volume(symbol, "Sell")
            
            logger.debug(f"[{symbol}] [LargeOrder] avg_volume={avg_volume}, threshold={threshold}, buy_vol={buy_vol}, sell_vol={sell_vol}")

            if buy_vol >= threshold and now_ts - self.last_trigger_log.get(symbol, 0) > 1:
                self.last_trigger_log[symbol] = now_ts
                logger.info(f"[{symbol}] [LargeOrder] Buy 成立: {buy_vol:.4f} ≥ {threshold:.4f}")
                entry_logger.info(f"[{symbol}] 条件③ 大口成行 Buy 成立: volume={buy_vol:.4f}, threshold={threshold:.4f}")
                return True, "Buy", (buy_vol / avg_volume if avg_volume > 0 else 0.0) 
            elif sell_vol >= threshold and now_ts - self.last_trigger_log.get(symbol, 0) > 1:
                self.last_trigger_log[symbol] = now_ts
                logger.info(f"[{symbol}] [LargeOrder] Sell 成立: {sell_vol:.4f} ≥ {threshold:.4f}")
                entry_logger.info(f"[{symbol}] 条件③ 大口成行 Sell 成立: volume={sell_vol:.4f}, threshold={threshold:.4f}")
                return True, "Sell", (sell_vol / avg_volume * 100 if avg_volume > 0 else 0.0)

            logger.debug(f"[{symbol}] [LargeOrder] 不成立: BuyVol={buy_vol:.4f}, SellVol={sell_vol:.4f}, threshold={threshold:.4f}")
            return False, None, 0.0
        except Exception as e:
            logger.exception(f"[{symbol}] [LargeOrder] ❌ 判定エラー: {e}")
            return False, None, 0.0

    def calculate_lot_multiplier(self, board: bool, ratio: bool, big_order: bool, big_ratio: float) -> Tuple[int, str]:
        logger.debug(f"[LotMultiplier] 判定条件: board={board}, ratio={ratio}, big_order={big_order}, big_ratio={big_ratio:.3f}")
        if board and ratio and big_order:
            return (3, "①②③＋大口1.2%") if big_ratio >= 1.2 else (2, "①②③")
        if board and ratio:
            return 1, "①②"
        if ratio:
            return 1, "②"
        if big_order:
            return 1, "③"
        if board:
            return 1, "①"
        return 0, "No entry"

    def estimate_stoploss_usdt(self, symbol: str, entry_price: float, stop_ticks: int, tick_size: float) -> float:
        if entry_price <= 0 or stop_ticks <= 0 or tick_size <= 0:
            logger.error(f"[{symbol}] [StopLossCalc] ❌ 無効な引数: price={entry_price}, ticks={stop_ticks}, tick_size={tick_size}")
            return 0.0
        loss = stop_ticks * tick_size
        logger.debug(f"[{symbol}] [StopLossCalc] 計算: {stop_ticks} ticks × {tick_size} = {loss:.4f} USDT")
        return loss

    async def should_entry(
        self,
        symbol: str,
        orderbook: Dict[str, List[List[float]]],
        deviation_history: List[float],
        market_orders: List[Dict],
        latest_loss_time: Optional[datetime],
        news_schedule: List[datetime],
        current_price: float,
        available_balance: float,
        current_time: Optional[datetime] = None,
    ) -> Tuple[bool, float, str]:
        try:
            now = current_time or datetime.now(timezone.utc)

            if not api_error_tracker.entry_allowed(symbol):
                logger.info(f"[{symbol}] ▶ エントリー不可 - APIエラーによる一時停止中")
                return False, 0.0, "APIエラー停止中"

            if self.force_entry:
                self.last_entry_side[symbol] = self.force_side
                logger.info(f"[{symbol}] 強制エントリー - side={self.force_side}")
                base_lot = calculate_min_lot(symbol, current_price)
                return True, base_lot, "強制エントリー"

            if self.is_blackout(now, news_schedule, symbol):
                logger.info(f"[{symbol}] ▶ エントリー不可 - Blackout期間")
                return False, 0.0, "Blackout期間"

            if latest_loss_time:
                elapsed = (now - latest_loss_time.astimezone(timezone.utc)).total_seconds()
                if elapsed < self.min_loss_interval:
                    logger.info(f"[{symbol}] ▶ エントリー不可 - ロスカット{elapsed:.1f}s未満")
                    return False, 0.0, f"ロスカット{elapsed:.1f}s"

            if available_balance <= 0:
                logger.info(f"[{symbol}] ▶ エントリー不可 - 資金ゼロ")
                return False, 0.0, "資金不足"

            board_trigger, board_side, _ = self.detect_board_trigger(symbol, deviation_history)
            avg_volume = self.avg_volumes.get(symbol, {}).get(now.strftime("%H:%M"), 0.0)
            ratio_trigger, ratio_side = self.detect_ratio_trigger(symbol, market_orders, avg_volume)
            big_trigger, big_side, big_ratio = self.detect_large_market_orders(symbol)

            sides = [s for s in [board_side, ratio_side, big_side] if s]
            if not sides:
                logger.info(f"[{symbol}] ▶ エントリー不可 - 有効なsideなし")
                return False, 0.0, "No valid side"

            side = max(set(sides), key=sides.count)

            lot_multiplier, reason = self.calculate_lot_multiplier(board_trigger, ratio_trigger, big_trigger, big_ratio)
            logger.info(f"[{symbol}] ▶ ロット倍率: {lot_multiplier}, 判定理由: {reason}")

            if lot_multiplier == 0:
                logger.info(f"[{symbol}] ▶ エントリー不可 - 発動条件未満: {reason}")
                return False, 0.0, reason

            ohlcv_data = await self.orderflow.get_recent_ohlcv(symbol, limit=2)
            if len(ohlcv_data) < 2:
                logger.warning(f"[{symbol}] TR算出用のOHLCVが不足: {ohlcv_data}")
                return False, 0.0, "TR不足"

            tr = calculate_true_range(ohlcv_data)
            stop_loss_usdt = tr * 1.5

            logger.info(
                f"[{symbol}] ▶ TR={tr:.6f}, stop_loss_usdt={stop_loss_usdt:.6f}, "
                f"available_balance={available_balance:.2f}, multiplier={lot_multiplier}"
            )

            raw_lot = calculate_lot_by_stoploss_range(
                symbol=symbol,
                stop_loss_usdt=stop_loss_usdt,
                balance=available_balance,
                multiplier=1
            )

            logger.info(f"[{symbol}] ▶ raw_lot（倍率適用前）={raw_lot:.6f}")

            final_lot = round_qty_for_symbol(symbol, raw_lot * lot_multiplier)

            logger.info(
                f"[{symbol}] ▶ final_lot（丸め後）={final_lot:.6f}, 計算式: round({raw_lot:.6f} * {lot_multiplier})"
            )

            if final_lot <= 0:
                logger.info(f"[{symbol}] ▶ エントリー不可 - ロットゼロ")
                return False, 0.0, "資金不足"

            self.last_entry_side[symbol] = side

            logger.info(
                f"[{symbol}] ✅ エントリー - side={side}, lot_multiplier={lot_multiplier}, "
                f"final_lot={final_lot:.4f}, reason={reason}, version={STRATEGY_VERSION}"
            )

            entry_logger.info(
                f"[{symbol}] ✅ エントリー条件成立: side={side}, multiplier={lot_multiplier}, reason={reason}, "
                f"final_lot={final_lot:.6f}, current_price={current_price:.2f}, "
                f"est_order_value={final_lot * current_price:.2f}USDT, "
                f"wallet_balance={available_balance:.2f}, version={STRATEGY_VERSION}"
            )

            return True, final_lot, reason
        except Exception as e:
            logger.exception(f"[{symbol}] [EntryEval] ❌ エラー: {e}")
            return False, 0.0, "例外発生"

    def get_board_deviation(self, symbol: str, orderbook: Dict[str, List[List[float]]], depth: int = 20) -> float:
        try:
            
            # ✅ モック関数が定義されていれば、それを使う
            if self.mock_deviation_func:
                return self.mock_deviation_func(symbol)
        
            bids = orderbook.get("bids", [])[:depth]
            asks = orderbook.get("asks", [])[:depth]
            buy_qty = sum(float(b[1]) for b in bids)
            sell_qty = sum(float(a[1]) for a in asks)
            total = buy_qty + sell_qty
            return (buy_qty - sell_qty) / total * 100 if total > 0 else 0.0
        except Exception as e:
            logger.exception(f"[{symbol}] [BoardDeviation] ❌ 計算エラー: {e}")
            return 0.0

    def get_entry_side(self, symbol: str) -> str:
        return self.force_side if self.force_entry else self.last_entry_side.get(symbol, "Buy")
