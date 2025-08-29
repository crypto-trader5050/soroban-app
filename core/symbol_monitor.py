import sys
import os
import logging
from typing import List, Dict, Optional, Tuple, Union, Any
from datetime import datetime
import pytz
import time
import math

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils.bybit_client import BybitClient, TICK_SIZES
from utils.bybit_client import MIN_QTY
from core.entry_conditions import EntryConditionEvaluator
from core.order_manager import OrderManager
from core.position_manager import PositionManager
from utils.summary_manager import log_order_summary
from utils.news_filter import is_in_blackout_period
from utils.lot_calculator import calculate_safe_lot
from utils.logger import logger
from core.order_flow_monitor import RealtimeOrderFlow
import redis

logger = logging.getLogger(__name__)

order_flow_monitor: RealtimeOrderFlow

class SymbolMonitor:
    def __init__(
        self,
        client: BybitClient,
        symbols: List[str],
        entry_evaluator: EntryConditionEvaluator,
        news_schedule: List[Dict[str, Any]],
        redis_client: redis.Redis,
        order_manager: OrderManager,
        order_flow_monitor,
        fixed_test_balance: float = 0.0
    ):
        self.client = client
        self.symbols = symbols
        self.entry_evaluator = entry_evaluator
        self.news_schedule = news_schedule
        self.redis = redis_client
        self.order_manager = order_manager
        self.position_managers: Dict[str, PositionManager] = {}
        self.latest_loss_times: Dict[str, Optional[datetime]] = {sym: None for sym in symbols}
        self.deviation_histories: Dict[str, List[float]] = {sym: [] for sym in symbols}
        self.order_flow_monitor = order_flow_monitor
        self.fixed_test_balance = fixed_test_balance

    def update_deviation_history(self, symbol: str, deviation: float, max_len: int = 10):
        hist = self.deviation_histories.get(symbol, [])
        hist.append(deviation)
        if len(hist) > max_len:
            hist.pop(0)
        self.deviation_histories[symbol] = hist
        logger.debug(f"[{symbol}] 偏差履歴更新: {self.deviation_histories[symbol]}")

    def fetch_orderbook(self, symbol: str) -> Dict:
        try:
            return self.client.get_orderbook(symbol)
        except Exception as e:
            logger.error(f"[{symbol}] 注文板取得失敗: {e}")
            return {}

    def fetch_market_orders(self, symbol: str) -> List[Dict]:
        trades = self.order_flow_monitor.get_recent_trades(symbol)
        logger.debug(f"[{symbol}] WebSocketからマーケット注文取得: {len(trades)}件")
        return trades

    def record_loss(self, symbol: str, price: Optional[float] = None, reason: str = ""):
        now = datetime.now(pytz.utc)
        self.latest_loss_times[symbol] = now
        logger.info(f"[{symbol}] ロスカット時刻記録: {now} | price={price} | reason={reason}")

    async def check_entry(
        self,
        symbol: str,
        available_balance: float,
        current_price: Optional[float] = None
    ) -> Tuple[bool, float, str, Optional[float]]:
        
        # 🕒 タイムスタンプ未更新なら処理打ち切り
        last_trade_time = self.order_flow_monitor.get_last_trade_time(symbol)
        
        if last_trade_time <= 0:
            msg = f"[{symbol}] WebSocketデータ未受信。エントリー判定を一時スキップ"
            logger.debug(msg)
            return False, 0.0, msg, None

        if time.time() - last_trade_time > 5:
            msg = f"[{symbol}] タイムスタンプが5秒以上更新されていません。WebSocket停止の可能性"
            logger.warning(msg)
            self.order_flow_monitor.reconnect_if_needed()  # ← 再接続トリガーを追加
            return False, 0.0, msg, None
        
        orderbook = self.fetch_orderbook(symbol)
        if not orderbook:
            return False, 0.0, "注文板取得失敗", None

        deviation = self.entry_evaluator.get_board_deviation(symbol, orderbook)
        self.update_deviation_history(symbol, deviation)
        logger.debug(f"[{symbol}] 現在板偏差: {deviation:.2f}%")

        market_orders = self.fetch_market_orders(symbol)
        latest_loss_time = self.latest_loss_times.get(symbol)

        if current_price is None:
            current_price = self.client.get_current_price(symbol)
        if current_price is None:
            return False, 0.0, "現在価格取得失敗", None

        logger.debug(f"[{symbol}] 現在価格: {current_price}")

        can_entry, lot_multiplier, reason = await self.entry_evaluator.should_entry(
            symbol=symbol,
            orderbook=orderbook,
            deviation_history=self.deviation_histories.get(symbol, []),
            market_orders=market_orders,
            latest_loss_time=latest_loss_time,
            news_schedule=self.news_schedule,
            current_price=current_price,
            available_balance=available_balance
        )

        return can_entry, lot_multiplier, reason, current_price

    async def execute_entry_if_applicable(
        self,
        symbol: str,
        return_detail: bool = False,
        current_price: Optional[float] = None,
        available_balance: Optional[float] = None
    ) -> Union[bool, Tuple[bool, str]]:
        logger.debug(f"[{symbol}] エントリー条件確認中...")

        # 💡 追加：すでにポジション保有中ならスキップ
        position_manager = self.position_managers.get(symbol)
        if position_manager and position_manager.has_open_position():
            msg = f"🚫 すでにポジション保有中のためエントリーをスキップします"
            logger.info(f"[{symbol}] {msg}")
            return (False, msg) if return_detail else False

        now = datetime.now(pytz.utc)
        if self.entry_evaluator.is_blackout(now, self.news_schedule, symbol):
            msg = f"🕒 ブラックアウト中（{symbol}）"
            logger.info(f"[{symbol}] {msg}")
            return (False, msg) if return_detail else False

        if current_price is None:
            current_price = self.client.get_current_price(symbol)
            if current_price is None:
                msg = "現在価格取得失敗"
                logger.error(f"[{symbol}] {msg}")
                return (False, msg) if return_detail else False

        if available_balance is None:
            available_balance = self.client.get_available_balance()
            if available_balance is None or available_balance <= 0:
                msg = "残高取得失敗または不足"
                logger.error(f"[{symbol}] {msg}")
                return (False, msg) if return_detail else False

        can_entry, lot_multiplier, reason, current_price = await self.check_entry(symbol, available_balance, current_price)
        
        if lot_multiplier < 0.1:
            logger.warning(f"[{symbol}] lot_multiplier={lot_multiplier:.4f} が小さすぎるため補正 → 0.1")
            lot_multiplier = 0.1
        
        if not can_entry:
            logger.info(f"[{symbol}] ⛔ エントリー見送り: {reason}")
            return (False, reason) if return_detail else False

        try:
            side = self.entry_evaluator.get_entry_side(symbol)
        except AttributeError:
            msg = "EntryConditionEvaluator に get_entry_side() が実装されていません"
            logger.error(f"[{symbol}] {msg}")
            return (False, msg) if return_detail else False

        if side not in ["Buy", "Sell"]:
            msg = f"❌ 不正なエントリー方向: {side}"
            logger.error(f"[{symbol}] {msg}")
            return (False, msg) if return_detail else False

        logger.info(f"[{symbol}] 🔁 エントリー条件成立: side={side}, lot倍率={lot_multiplier}, reason={reason}")

        try:
            stop_ticks = 40
            tick_size = TICK_SIZES.get(symbol, 0.01)
            stop_loss_usdt = stop_ticks * tick_size

            balance_for_calc = self.fixed_test_balance if self.fixed_test_balance > 0 else available_balance

            base_lot = calculate_safe_lot(
                symbol=symbol,
                entry_price=current_price,
                stop_loss_usdt=stop_loss_usdt,
                balance=balance_for_calc,
                entry_pct_max=0.02,
                max_loss_pct=0.01  # 1%固定損失上限など適宜
            )
            final_lot = base_lot * lot_multiplier
            
            # ↓ここから追加部分
            min_qty = MIN_QTY.get(symbol, 0.001)
            if final_lot < min_qty:
                msg = f"注文数量 {final_lot:.6f} が最小数量 {min_qty} 未満のためエントリー不可"
                logger.warning(f"[{symbol}] ⚠️ {msg}")
                return (False, msg) if return_detail else False

            # 最小数量ステップ単位で切り上げ（Bybitはstep単位で発注するため）
            step = min_qty
            final_lot_rounded = math.ceil(final_lot / step) * step
            final_lot_rounded = round(final_lot_rounded, 6)  # 精度調整（例：6桁）

            logger.info(f"[{symbol}] 注文数量調整: {final_lot:.6f} → {final_lot_rounded:.6f}")

            # 以降は final_lot_rounded を使う
            order_info = self.order_manager.place_entry_orders(
                symbol=symbol,
                side=side,
                base_lot=final_lot_rounded,
                entry_price=current_price,         # ← 追加
                stop_ticks=stop_ticks,             # ← 追加（40固定でOK）
                tick_size=tick_size,               # ← 追加（TICK_SIZES から取得済）
                available_balance=available_balance,  # ← 追加（呼び出し元から受取済）
                lot_multiplier=3.0
            )
            
        except Exception as e:
            msg = f"損切幅計算失敗: {e}"
            logger.error(f"[{symbol}] {msg}")
            return (False, msg) if return_detail else False

        logger.info(f"[{symbol}] 🎯 再計算後ロット: {final_lot:.4f}枚（損切/枚={stop_loss_usdt:.2f}USDT）")

        if not order_info:
            msg = f"❌ 注文発注失敗（lot={final_lot}, side={side}）"
            logger.error(f"[{symbol}] {msg}")
            log_order_summary(
                action="entry_order",
                symbol=symbol,
                side=side,
                qty=final_lot,
                price=None,
                order_type="market",
                order_id="",
                status="failed",
                comment="注文発注失敗"
            )
            return (False, msg) if return_detail else False

        entry_price = order_info.get("entry_price")
        limit_orders_raw = order_info.get("limit_orders_detail", [])
        limit_orders_detail = [{"price": p, "qty": q} for p, q in limit_orders_raw]
        order_id = order_info.get("order_id", "")

        if entry_price is None:
            msg = "❌ 約定価格取得失敗"
            logger.error(f"[{symbol}] {msg}")
            log_order_summary(
                action="entry_order",
                symbol=symbol,
                side=side,
                qty=final_lot,
                price=None,
                order_type="market",
                order_id=order_id,
                status="failed",
                comment="約定価格取得失敗"
            )
            return (False, msg) if return_detail else False

        log_order_summary(
            action="entry_order",
            symbol=symbol,
            side=side,
            qty=final_lot,
            price=entry_price,
            order_type="market",
            order_id=order_id,
            status="success",
            comment=f"エントリー約定価格: {entry_price}"
        )

        if symbol in self.position_managers:
            logger.info(f"[{symbol}] 既存のポジション監視を停止します")
            self.position_managers[symbol].stop()

        pm = PositionManager(
            self.client,
            symbol,
            redis_client=self.redis,
            order_manager=self.order_manager,
            loss_callback=self.record_loss  # ← 将来対応用
        )
        
        pm.start_monitoring(entry_price, limit_orders_detail, side=side, quantity=final_lot_rounded)
        self.position_managers[symbol] = pm

        msg = f"✅ エントリー実行・ポジション監視開始 (side={side}, lot={final_lot})"
        logger.info(f"[{symbol}] {msg}")
        return (True, msg) if return_detail else True
