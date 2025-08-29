import sys
import os
import time
import config
from typing import List, Dict, Tuple
from utils.bybit_client import BybitClient
from utils.logger import logger, execution_logger, position_logger, fills_logger, error_logger
from utils.time_utils import get_recent_high_low
from utils.lot_calculator import calculate_min_lot, calculate_safe_lot
from config.strategy_version import STRATEGY_VERSION
from utils.summary_manager import log_order_summary
from core.entry_conditions import EntryConditionEvaluator
from utils.lot_calculator import round_qty_to_minimum
from utils.price_qty_utils import round_price, get_min_qty, get_symbol_config
from utils.telegram_notifier import TelegramNotifier
from utils.bybit_client import MAX_DECIMALS, TICK_SIZES
from utils.lot_calculator import MIN_ORDER_VALUE
from utils.error_tracker import ApiErrorTracker

api_error_tracker = ApiErrorTracker()

DRY_RUN = getattr(config, "DRY_RUN", False)

class OrderManager:
    def __init__(self, client: BybitClient, evaluator: EntryConditionEvaluator, dry_run: bool = None):
        if dry_run is None:
            dry_run = getattr(config, "DRY_RUN", False)
        self.client = client
        self.evaluator = evaluator
        self.dry_run = dry_run
        self.active_limit_orders: Dict[str, List[str]] = {}
        self.limit_order_timestamps: Dict[str, float] = {} 
        self.position_opened_symbols = set()
        self.position_closed_time = {}
        self.notifier = TelegramNotifier()

    def can_enter(self, symbol: str) -> bool:
        now = time.time()

        # APIエラー頻発による一時停止判定を追加
        if not api_error_tracker.entry_allowed(symbol):
            logger.info(f"[OrderManager] APIエラー頻発によりエントリー禁止中: {symbol}")
            return False

        if symbol in self.position_opened_symbols:
            logger.info(f"[OrderManager] ⛔ {symbol} は現在ポジション保有中のため再エントリー禁止")
            return False

        closed_time = self.position_closed_time.get(symbol, 0)
        if now - closed_time < 15:
            logger.info(f"[OrderManager] ⏳ {symbol} クールダウン期間中のためエントリー禁止（残り{15 - (now - closed_time):.1f}s）")
            return False

        return True

    def update_position_opened(self, symbol: str):
        self.position_opened_symbols.add(symbol)

    def update_position_closed(self, symbol: str):
        self.position_opened_symbols.discard(symbol)
        self.position_closed_time[symbol] = time.time()

    def handle_order_failure_and_close_positions(self, symbol: str, side: str, qty: float, reason: str = "unknown"):
        logger.error(f"[OrderManager] ❗ 異常終了処理開始: {symbol} {side} {qty:.4f} ({reason})")
        opposite_side = "Sell" if side == "Buy" else "Buy"

        try:
            close_resp = self.place_market_order(symbol, opposite_side, qty)
        except Exception:
            error_logger.exception(f"[EXCEPTION] 異常ポジションクローズ中の例外: {symbol}")
            close_resp = {}

        if close_resp and close_resp.get("retCode", -1) == 0:
            # 成功時は必ず位置情報更新
            self.update_position_closed(symbol)
            order_id = close_resp.get("result", {}).get("orderId", "N/A")
            logger.info(f"[OrderManager] ✅ 異常ポジション成行クローズ成功: {symbol} {qty:.4f} ({reason})")
            self.notifier.send_message(
                f"[緊急クローズ成功] {symbol} {opposite_side} qty={qty:.4f} 理由: {reason}"
            )
            log_order_summary(
                action="emergency_close",
                symbol=symbol,
                side=opposite_side,
                qty=qty,
                order_type="market",
                order_id=order_id,
                status="success",
                trigger=reason
            )
            execution_logger.info(
                f"EMERGENCY_CLOSE,{symbol},{opposite_side},{qty:.4f},-,{STRATEGY_VERSION},{reason}"
            )
            if not self.dry_run:  # ✅ DRY_RUN中は position を更新しない
                self.update_position_closed(symbol)
        else:
            logger.critical(f"[OrderManager] ❌ 異常ポジションクローズ失敗: {symbol} {qty:.4f} → {close_resp}")
            error_logger.warning(f"[WARN] 異常ポジションクローズ失敗: {symbol} → {close_resp}")
            self.notifier.send_message(
                f"[緊急クローズ失敗] {symbol} qty={qty:.4f} → {close_resp}"
            )
            log_order_summary(
                action="emergency_close",
                symbol=symbol,
                side=opposite_side,
                qty=qty,
                order_type="market",
                status="failed",
                trigger=reason,
                comment=str(close_resp)
            )

    def place_entry_orders(
        self, symbol: str, side: str, base_lot: float, entry_price: float, 
        stop_ticks: int, tick_size: float, available_balance: float,
        lot_multiplier: float = 1.0
    ) -> Dict:
        logger.info(f"[OrderManager] place_entry_orders開始: symbol={symbol}, side={side}, base_lot={base_lot}, entry_price={entry_price}, stop_ticks={stop_ticks}, tick_size={tick_size}, available_balance={available_balance}")

        try:
            if not self.can_enter(symbol):
                logger.info(f"[OrderManager] エントリー処理スキップ: {symbol}")
                return {}

            logger.info(f"[OrderManager] stop_ticks={stop_ticks}")
            logger.info(f"[OrderManager] tick_size={tick_size}")
            logger.info(f"[OrderManager] ▶ エントリー注文開始: {symbol} {side} base_lot={base_lot:.4f}, price={entry_price:.2f}, stop={stop_ticks}t ({tick_size})")

            if entry_price <= 0:
                logger.error(f"[OrderManager] ❓ entry_price が無効: {entry_price}")
                return {}

            stop_loss_usdt = self.evaluator.estimate_stoploss_usdt(symbol, entry_price, stop_ticks, tick_size)
            logger.info(f"[OrderManager] stop_loss_usdt (損切幅) = {stop_loss_usdt:.6f} USDT")

            if stop_loss_usdt <= 0:
                logger.error(f"[{symbol}] 損切幅計算失敗")
                return {}

            final_qty = calculate_safe_lot(symbol, entry_price, stop_loss_usdt, available_balance)
            final_qty *= lot_multiplier
            logger.info(f"[OrderManager] calculate_safe_lot の戻り値 final_qty = {final_qty:.6f}")

            adjusted_qty = round_qty_to_minimum(symbol, final_qty)

            if final_qty * entry_price < MIN_ORDER_VALUE:
                logger.info(f"[OrderManager] 注文額が{MIN_ORDER_VALUE}USDT未満なので調整開始。現在qty={final_qty:.8f}, price={entry_price:.8f}, 合計={final_qty * entry_price:.8f} USDT")
            
                min_qty = calculate_min_lot(symbol, entry_price)
                min_qty = round_qty_to_minimum(symbol, min_qty)
                min_value = min_qty * entry_price
                multiplier = 1
                if min_value < MIN_ORDER_VALUE:
                    multiplier = 2
                    while min_qty * multiplier * entry_price < MIN_ORDER_VALUE:
                        multiplier += 1
                    
                adjusted_qty = min_qty * multiplier
                adjusted_qty_rounded = round_qty_to_minimum(symbol, adjusted_qty)
                logger.info(f"[OrderManager] 調整結果 multiplier={multiplier}, 調整前qty={adjusted_qty:.8f}, 丸め後qty={adjusted_qty_rounded:.8f}")
                    
                final_qty = adjusted_qty_rounded 
                logger.info(f"[OrderManager] 注文額5USDT未満のため数量を調整: {final_qty:.6f} (価格×数量={final_qty*entry_price:.2f} USDT)")

            logger.info(f"[OrderManager] 成行注文: qty={final_qty:.4f} × price={entry_price:.2f} = {final_qty * entry_price:.2f} USDT")

            # 【修正箇所】成行注文の呼び出しを self.client 直接から self.place_market_order メソッド経由に変更
            # これにより dry_run の判定が一元化され、テストのモック呼び出しカウントも正しくなる
            market_resp = self.place_market_order(symbol, side, final_qty, fallback_price=entry_price)

            logger.debug(f"[OrderManager] market_resp: {market_resp}")

            if not market_resp or market_resp.get("retCode", -1) != 0:
                self.notifier.send_message(
                    f"[ERROR] エントリー失敗: {symbol} {side.upper()} qty={final_qty:.4f}\nレスポンス: {market_resp}"
                )
                log_order_summary(
                    action="entry_order",
                    symbol=symbol,
                    side=side,
                    qty=final_qty,
                    price=entry_price,
                    order_type="market",
                    status="failed",
                    comment=str(market_resp)
                )
                return {}

            result = market_resp.get("result", {})
            exec_price = float(result.get("avgPrice", entry_price))
            self.update_position_opened(symbol)
        
            self.notifier.send_message(
                f"[エントリー完了] {symbol} {side.upper()} 成行 {final_qty:.4f}枚 約定価格: {exec_price:.2f}"
            )

            log_order_summary(
                action="entry_order",
                symbol=symbol,
                side=side,
                qty=final_qty,
                price=exec_price,
                order_type="market",
                status="success"
            )

            limit_orders = self._generate_limit_orders(symbol, side, final_qty, exec_price)
            logger.debug(f"[OrderManager] 生成した指値注文リスト: {limit_orders}")

            order_ids, responses = [], []

            min_qty_cfg = get_min_qty(symbol)
            for i, (split_qty, limit_price) in enumerate(limit_orders):
                if split_qty < min_qty_cfg or limit_price <= 0:
                    logger.debug(f"[OrderManager] 指値注文スキップ: qty={split_qty}, price={limit_price}")
                    continue

                logger.info(f"[OrderManager] 指値注文: {symbol} {side} qty={split_qty:.4f} @ {limit_price:.2f}")
                try:
                    if self.dry_run:
                        logger.warning(f"[DRY_RUN] 指値注文スキップ: {symbol} {side} qty={split_qty:.4f} @ {limit_price}")
                        resp = {"retCode": 0, "result": {"orderId": f"dryrun-limit-{i}"}}
                    else:
                        resp = self.place_limit_order(symbol, side, split_qty, limit_price, dryrun_index=i)
                except Exception:
                    error_logger.exception(f"[EXCEPTION] 指値注文失敗: {symbol} {side} {split_qty:.4f} @ {limit_price}")
                    resp = {}

                logger.debug(f"[OrderManager] 指値注文レスポンス: {resp}")
                responses.append(resp)

                if resp and resp.get("retCode", -1) == 0:
                    order_id = resp["result"]["orderId"]
                    order_ids.append(order_id)
                    self.limit_order_timestamps[order_id] = time.time()

                    position_logger.info(f"[{symbol}] 指値注文登録: order_id={order_id}, price={limit_price}, qty={split_qty}")
                    fills_logger.info(f"[{symbol}] 指値注文発注: order_id={order_id}, price={limit_price:.2f}, qty={split_qty:.4f}, side={side}")

                    log_order_summary(
                        action="limit_order",
                        symbol=symbol,
                        side=side,
                        qty=split_qty,
                        price=limit_price,
                        order_type="limit",
                        order_id=order_id,
                        status="success"
                    )
                else:
                    log_order_summary(
                        action="limit_order",
                        symbol=symbol,
                        side=side,
                        qty=split_qty,
                        price=limit_price,
                        order_type="limit",
                        status="failed",
                        comment=str(resp)
                    )

            self.active_limit_orders[symbol] = order_ids

            logger.info(f"[OrderManager] place_entry_orders正常終了: symbol={symbol}, side={side}, qty={final_qty}")
            return {
                "market_order": market_resp,
                "limit_orders": responses,
                "limit_orders_detail": limit_orders, 
                "entry_price": exec_price,
                "symbol": symbol,
                "side": side,
                "qty": final_qty,
                "order_ids": order_ids,
            }
        except Exception as e:
            error_logger.exception(f"[OrderManager] place_entry_orders例外発生: symbol={symbol}, side={side}, error={e}")
            self.notifier.send_message(f"[ERROR] place_entry_orders例外: {symbol} {side} {e}")
            return {}


    def place_stop_loss_order(self, symbol: str, side: str, qty: float, trigger_reason: str = "unknown") -> Dict:
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            if self.dry_run:
                logger.warning(f"[DRY_RUN] 損切成行注文スキップ: {symbol} {side} qty={qty}")
                resp = {"retCode": 0, "result": {"orderId": "dryrun-stoploss"}}
            else:
                try:
                    resp = self.place_market_order(symbol, side, qty)
                except Exception:
                    error_logger.exception(f"[EXCEPTION] 損切成行注文失敗: {symbol} {side} {qty} (試行回数 {attempt})")
                    resp = {}

            if resp and resp.get("retCode", -1) == 0:
                order_id = resp.get("result", {}).get("orderId", "N/A")
                log_order_summary(
                    action="stop_loss_order",
                    symbol=symbol,
                    side=side,
                    qty=qty,
                    order_type="market",
                    order_id=order_id,
                    status="success",
                    trigger=trigger_reason
                )
                execution_logger.info(
                    f"STOP,{symbol},{side},{qty:.4f},-,{STRATEGY_VERSION},{trigger_reason}"
                )
                self.update_position_closed(symbol)
                return resp

            logger.warning(f"[OrderManager] 損切り注文失敗リトライ: {symbol} {side} ({attempt+1}/{max_retries})")
            if attempt < max_retries:
                time.sleep(1)  # リトライ前に1秒待つ

        # すべてのリトライ失敗後
        logger.error(f"[OrderManager] 損切り注文最終失敗: {symbol} {side} qty={qty}")
        log_order_summary(
            action="stop_loss_order",
            symbol=symbol,
            side=side,
            qty=qty,
            order_type="market",
            status="failed",
            trigger=trigger_reason,
            comment="全リトライ失敗"
        )

        self.handle_stoploss_failure(symbol, side, qty, reason=trigger_reason)
        return {"retCode": -1, "retMsg": "全リトライ失敗", "symbol": symbol, "qty": qty}

    def place_market_order(self, symbol: str, side: str, qty: float, fallback_price: float = 0.0) -> Dict:
        if self.dry_run:
            logger.warning(f"[DRY_RUN] 成行注文スキップ: {symbol} {side} qty={qty}")
            return {
                "retCode": 0,
                "result": {
                    "orderId": f"dryrun-market-{int(time.time())}",
                    "avgPrice": fallback_price
                }
            }

        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                response = self.client.place_market_order(symbol, side, qty)
                if response.get("retCode") == 0:
                    return response
            except Exception as e:
                error_logger.exception(f"[OrderManager] 成行注文失敗: {symbol} {side} qty={qty}（{attempt}回目）")

            logger.warning(f"[OrderManager] 成行注文リトライ中: {symbol} {side}（{attempt}/{max_retries}）")
            time.sleep(1)

        logger.error(f"[MarketOrder最終失敗] 成行注文失敗: {symbol} {side} qty={qty}")
        return {
            "retCode": -1,
            "result": {
                "orderId": "failed-market",
                "avgPrice": fallback_price
            }
        }

    def place_limit_order(self, symbol: str, side: str, qty: float, price: float, dryrun_index: int = 0) -> Dict:
        if self.dry_run:
            logger.warning(f"[DRY_RUN] 指値注文スキップ: {symbol} {side} qty={qty} @ {price}")
            return {
                "retCode": 0,
                "result": {
                    "orderId": f"dryrun-limit-{dryrun_index}",
                    "symbol": symbol,
                    "side": side,
                    "orderType": "Limit",
                    "qty": qty,
                    "price": price,
                    "status": "New",  # or "Created"
                    "time": int(time.time() * 1000)
                }
            }
        
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                response = self.client.place_limit_order(symbol, side, qty, price)
                if response.get("retCode") == 0:
                    return response
                else:
                    error_logger.warning(f"[LimitOrder失敗] {attempt}回目: {response}")
            except Exception:
                error_logger.exception(f"[例外] 指値注文失敗: {symbol} {side} qty={qty} @ {price}（{attempt}回目）")

            time.sleep(1)  # リトライ前に1秒待つ

        logger.error(f"[LimitOrder最終失敗] 指値注文失敗: {symbol} {side} qty={qty} @ {price}")
        return {}

    def _generate_limit_orders(self, symbol: str, side: str, total_qty: float, entry_price: float) -> List[Tuple[float, float]]:
        if not entry_price or entry_price <= 0:
            return []

        try:
            high, low = get_recent_high_low(symbol, seconds=5)
            base_price = max(min(entry_price, high), low)
        except Exception:
            base_price = entry_price

        percents = [0.001, 0.0015, 0.002, 0.0025, 0.003]
        num_orders = len(percents)

        cfg = get_symbol_config(symbol)
        if not cfg:
            logger.error(f"[OrderManager] ❌ シンボル設定が取得できません: symbol={symbol}")
            return []
            
        qty_step = cfg["qty_step"]
        max_decimal = cfg.get("max_decimal", 4) 
        
        if qty_step is None:
            logger.critical(f"[OrderManager] ❌ qty_step が設定されていません: symbol={symbol}")
            return []
        
        base_split_qty = round_qty_to_minimum(symbol, total_qty / num_orders)
        orders = []
        accumulated = 0.0

        percents_iter = percents

        for i, p in enumerate(percents_iter):
            price = base_price * (1 - p) if side == "Buy" else base_price * (1 + p)
            price = round_price(symbol, price)

            if i == num_orders - 1:
                split_qty = total_qty - accumulated
                split_qty = round_qty_to_minimum(symbol, split_qty)  
            else:
                split_qty = base_split_qty
                accumulated += split_qty

            split_qty = round_qty_to_minimum(symbol, split_qty) 

            if i > 0:
                if side == "Buy" and price > orders[-1][1]:
                    logger.warning(f"[{symbol}] Buy指値価格が昇順になっています。i={i}, price={price}, prev={orders[-1][1]}")
                elif side == "Sell" and price < orders[-1][1]:
                    logger.warning(f"[{symbol}] Sell指値価格が降順になっています。i={i}, price={price}, prev={orders[-1][1]}")

            orders.append((split_qty, price))

        return orders

    def cancel_pending_limits(self, symbol: str) -> None:
        order_ids = self.active_limit_orders.get(symbol, [])
        if not order_ids:
            return

        for order_id in order_ids:
            if config.DRY_RUN:
                logger.warning(f"[DRY_RUN] 指値注文キャンセルスキップ: {symbol} order_id={order_id}")
                result = {"retCode": 0}
            else:
                try:
                    result = self.cancel_order(symbol, order_id)
                except Exception:
                    error_logger.exception(f"[EXCEPTION] cancel_order 失敗: {symbol} order_id={order_id}")
                    result = {}

            if result and result.get("retCode", -1) == 0:
                log_order_summary(
                    action="cancel_order",
                    symbol=symbol,
                    side="N/A",
                    qty=0,
                    order_id=order_id,
                    status="success"
                )
            else:
                log_order_summary(
                    action="cancel_order",
                    symbol=symbol,
                    side="N/A",
                    qty=0,
                    order_id=order_id,
                    status="failed",
                    comment=str(result)
                )

        self.active_limit_orders[symbol] = []

    def evaluate_and_cancel_limits(self, symbol: str, deviation_now: float, large_opposite_order_detected: bool, entry_time: float, max_wait: float = 4.0) -> None:
        now = time.time()
        elapsed = now - entry_time

        if deviation_now < 3.5 or large_opposite_order_detected or elapsed >= max_wait:
            self.cancel_pending_limits(symbol)

    def cancel_order(self, symbol: str, order_id: str) -> dict:
        """任意の注文IDをキャンセル（外部から個別キャンセルしたい場合に使用）"""
        if self.dry_run:
            logger.warning(f"[DRY_RUN] cancel_order スキップ: {symbol} order_id={order_id}")
            return {"retCode": 0, "result": {"orderId": f"dryrun-cancel-{order_id}"}}
        try:
            return self.client.cancel_order(symbol, order_id)
        except Exception:
            error_logger.exception(f"[EXCEPTION] cancel_order ({symbol}, {order_id})")
            return {}

    def handle_stoploss_failure(self, symbol: str, side: str, qty: float, reason: str = "stoploss_failed"): 
        logger.critical(f"[OrderManager] ⚠️ 損切成行失敗 → 指値へ切替処理開始: {symbol} {side} qty={qty}")

        try:
            price_data = self.client.get_orderbook(symbol)
            best_bid = float(price_data["result"]["bids"][0][0])
            best_ask = float(price_data["result"]["asks"][0][0])
            current_price = best_ask if side == "Buy" else best_bid
        except Exception:
            logger.exception(f"[OrderManager] ⚠️ 現在価格取得失敗、代わりに 直近価格 使用: {symbol}")
            current_price = self.client.get_last_price(symbol)

        symbol_config = get_symbol_config(symbol)
        
        if not symbol_config:
            logger.error(f"[OrderManager] ❌ get_symbol_config が None を返しました: symbol={symbol}")
            return  # または raise Exception("symbol_config is None")
        
        tick_size = symbol_config.get("tick_size")  # getで存在確認しつつ取得
        if tick_size is None:
            tick_size = TICK_SIZES.get(symbol)
            if tick_size is None:
                logger.critical(f"[OrderManager] ❌ tick_size が symbol_config にも TICK_SIZES にも見つかりません: symbol={symbol}")
                raise ValueError(f"tick_size missing for {symbol}")
            logger.warning(f"[OrderManager] ⚠️ tick_size を TICK_SIZES から補完しました: {tick_size}")
        
        adjust = tick_size * 3  # 小幅調整値（例: 3ティック）
        limit_price = current_price + adjust if side == "Buy" else current_price - adjust
        limit_price = round_price(symbol, limit_price)

        split_qty = round_qty_to_minimum(symbol, qty / 2)

        for i in range(2):  # 小分け2回
            if self.dry_run:
                logger.warning(f"[DRY_RUN] 小分け指値スキップ: {symbol} {side} qty={split_qty} @ {limit_price}")
                resp = {"retCode": 0, "result": {"orderId": f"dryrun-fallback-limit-{i}"}}
            else:
                try:
                    resp = self.client.place_limit_order(symbol, side, split_qty, limit_price)
                except Exception:
                    logger.exception(f"[OrderManager] ❌ 小分け指値発注失敗: {symbol} {side} {split_qty} @ {limit_price}")
                    resp = {}

            if resp and resp.get("retCode", -1) == 0:
                logger.info(f"[OrderManager] ✅ 小分け指値発注成功: {symbol} {side} qty={split_qty} @ {limit_price}")
                log_order_summary(
                    action="emergency_fallback_limit",
                    symbol=symbol,
                    side=side,
                    qty=split_qty,
                    price=limit_price,
                    order_type="limit",
                    order_id=resp["result"]["orderId"],
                    status="success",
                    trigger=reason
                )
            else:
                logger.critical(f"[OrderManager] ❌ 小分け指値も失敗: {symbol} {side} qty={split_qty} @ {limit_price}")
                log_order_summary(
                    action="emergency_fallback_limit",
                    symbol=symbol,
                    side=side,
                    qty=split_qty,
                    price=limit_price,
                    order_type="limit",
                    status="failed",
                    trigger=reason,
                    comment=str(resp)
                )

