import time  
import os
import threading
import json
import atexit
import signal
from typing import Dict, Optional, Any
import redis
from utils.logger import (
    logger, position_logger, fills_logger,
    summary_logger, execution_logger
)
from utils.bybit_client import BybitClient
from utils.trade_logger import log_trade_result
from core.order_manager import OrderManager
from config.strategy_version import STRATEGY_VERSION
from utils.summary_manager import log_performance_summary
from utils.volume_stats import is_reverse_large_order_triggered
from utils.telegram_notifier import TelegramNotifier

class PositionManager:
    REDIS_KEY_PREFIX = "position_manager:"
    REDIS_COOLDOWN_KEY = "cooldown:"

    def __init__(
        self,
        client: BybitClient,
        symbol: str,
        order_manager: OrderManager,
        loss_callback=None,  # ← ここを追加
        redis_client: Optional[redis.Redis] = None,
    ):
        self.client = client
        self.order_manager = order_manager
        self.loss_callback = loss_callback  # ← この行も追加
        self.symbol = symbol
        self.redis = redis_client or redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        db=int(os.getenv("REDIS_DB", "0")),
        decode_responses=True
    )

        self.lock = threading.Lock()
        self.redis_key = f"{self.REDIS_KEY_PREFIX}{self.symbol}"
        self.cooldown_key = f"{self.REDIS_COOLDOWN_KEY}{self.symbol}"

        self.entry_price: Optional[float] = None
        self.highest_price: Optional[float] = None
        self.lowest_price: Optional[float] = None
        self.active_limit_orders: Dict[str, Any] = {}
        self.side: Optional[str] = None
        self.quantity: Optional[float] = None
        self.trigger_condition: Optional[str] = ""
        self.entry_time: Optional[float] = None
        self.notifier = TelegramNotifier()  # ← 追加

        self.active = False
        self.trail_trigger = 0.035
        self.trail_width = 0.025
        self.check_interval = 1

        # 例外的損切り用カウンタ
        self.redis_error_count = 0
        self.api_error_count = 0
        self.redis_error_threshold = 3
        self.api_error_threshold = 3

        # 指値注文のタイムスタンプ管理（キャンセル判定用）
        self.limit_order_timestamps: Dict[str, float] = {}

        # signal と atexit の強制損切り設定
        self._setup_exit_handlers()

    def _setup_exit_handlers(self):
        def cleanup(*args):
            logger.warning(f"[{self.symbol}] ⚠️ プログラム終了検知、全ポジション強制損切りを実行します。")
            position_logger.warning(f"[{self.symbol}] プログラム終了検知、全ポジション強制損切り。")
            try:
                self.order_manager.place_stop_loss_order(
                    symbol=self.symbol,
                    side="Sell" if self.side == "Buy" else "Buy",
                    qty=self._get_position_size(),
                    trigger_reason="プログラム終了による強制損切り"
                )
            except Exception as e:
                logger.error(f"[{self.symbol}] 強制損切り失敗: {e}")
            # 終了処理
            self.stop()

        signal.signal(signal.SIGINT, cleanup)   # Ctrl+C
        signal.signal(signal.SIGTERM, cleanup)  # kill コマンドなど
        atexit.register(cleanup)
        
    def start_monitoring(
        self,
        entry_price: float,
        limit_orders: list[Dict[str, float]], 
        side: str = "Buy",
        quantity: float = 0.0,
        trigger_condition: str = ""
    ):
        
        # ここに追加
        if self.active:
            logger.warning(f"[{self.symbol}] start_monitoring() が既に監視中のため、処理をスキップします。")
            return
        
        self.entry_price = entry_price
        self.highest_price = entry_price
        self.lowest_price = entry_price
        self.side = side
        self.quantity = quantity
        self.trigger_condition = trigger_condition
        self.entry_time = time.time()
        self.active = True

        # 🎯 実際に指値を発注する
        self.active_limit_orders = {}
        self.limit_order_timestamps = {}
        
        for order in limit_orders:
            price = order["price"]
            qty = order["qty"]
            
            resp = self.order_manager.client.place_limit_order(
                symbol=self.symbol,
                side=side,
                price=price,
                qty=qty
            )
            order_id = resp.get("result", {}).get("orderId")
            
            if order_id:
                self.active_limit_orders[order_id] = price
                self.limit_order_timestamps[order_id] = time.time()

        self._save_state()
        threading.Thread(target=self.monitor, daemon=True).start()
        logger.info(f"[{self.symbol}] ✅ ポジション監視開始 (entry={entry_price:.2f}, side={side}, qty={quantity})")
        position_logger.info(f"[{self.symbol}] ポジション監視開始 (entry={entry_price:.2f}, side={side}, qty={quantity})")    
        

    def _retry_api_call(self, func, *args, retries=3, delay=1, **kwargs):
        for attempt in range(retries):
            try:
                result = func(*args, **kwargs)
                logger.debug(f"[{self.symbol}] API呼び出し成功: {func.__name__} → {result}")
                # 成功したらapi_error_countはリセット
                self.api_error_count = 0
                return result
            except Exception as e:
                logger.warning(f"[{self.symbol}] API呼び出し失敗 {func.__name__} 試行{attempt+1}/{retries}: {e}")
                self.api_error_count += 1
                time.sleep(delay)
        logger.error(f"[{self.symbol}] API呼び出し最大リトライ超過: {func.__name__}")
        return None

    def _save_state(self):
        try:
            with self.lock:
                data = {
                    "entry_price": self.entry_price or 0,
                    "highest_price": self.highest_price or 0,
                    "lowest_price": self.lowest_price or 0,
                    "side": self.side or "",
                    "quantity": self.quantity or 0,
                    "active_limit_orders": json.dumps(self.active_limit_orders),
                    "trigger_condition": self.trigger_condition or ""
                }
                self.redis.hset(self.redis_key, mapping=data)
                logger.debug(f"[{self.symbol}] Redisに状態保存: {data}")
                position_logger.info(f"[{self.symbol}] 状態保存: {data}")
                self.redis_error_count = 0  # 保存成功したらカウンタリセット
        except Exception as e:
            self.redis_error_count += 1
            logger.error(f"[{self.symbol}] Redis状態保存失敗: {e}")

    def _load_state(self):
        try:
            with self.lock:
                data = self.redis.hgetall(self.redis_key)
                if not data:
                    logger.debug(f"[{self.symbol}] Redisに状態なし")
                    return
                self.entry_price = float(data.get("entry_price", 0)) or None
                self.highest_price = float(data.get("highest_price", 0)) or None
                self.lowest_price = float(data.get("lowest_price", 0)) or None
                self.side = data.get("side", "") or None
                self.quantity = float(data.get("quantity", 0)) or None
                self.trigger_condition = data.get("trigger_condition", "") or ""

                try:
                    self.entry_time = float(data.get("entry_time", 0)) or None
                except (ValueError, TypeError):
                    logger.warning(f"[{self.symbol}] entry_timeの読み込みに失敗しました。値: {data.get('entry_time')}")
                    self.entry_time = None
    
                orders_raw = data.get("active_limit_orders", "{}")
                if isinstance(orders_raw, str):
                    try:
                        self.active_limit_orders = json.loads(orders_raw)
                    except json.JSONDecodeError:
                        logger.warning(f"[{self.symbol}] active_limit_ordersのJSONデコード失敗: {orders_raw}")
                        self.active_limit_orders = {}
                else:
                    self.active_limit_orders = {}
                
                if not isinstance(self.active_limit_orders, dict):
                    logger.warning(f"[{self.symbol}] active_limit_ordersがdict形式でないため初期化: {self.active_limit_orders}")
                    self.active_limit_orders = {}

                logger.debug(f"[{self.symbol}] Redisから状態読込: {data}")
                position_logger.info(f"[{self.symbol}] 状態読込: {data}")
                self.redis_error_count = 0  # 読込成功でリセット
                
        except Exception as e:
            self.redis_error_count += 1
            logger.error(f"[{self.symbol}] Redis状態読込失敗: {e}")

    def _get_position_size(self) -> float:
        try:
            return float(self.quantity or 0.0)
        except Exception:
            logger.warning(f"[{self.symbol}] ポジションサイズ取得失敗: {self.quantity}")
            return 0.0

    def is_in_cooldown(self) -> bool:
        return self.redis.exists(self.cooldown_key)
    
    def has_open_position(self) -> bool:
        """
        現在ポジションを保有しているかを判定する。
        sideとquantityの両方が有効な場合にTrue。
        """
        logger.debug(f"[{self.symbol}] ⛳ ポジション状態確認: side={self.side}, quantity={self.quantity}")
        # ここに更に厳密に判定前のチェックログを追加してみるのも手です
        if self.side is None:
            logger.debug(f"[{self.symbol}] sideがNoneのため保有なし")
        if self.quantity is None or self.quantity <= 0:
            logger.debug(f"[{self.symbol}] quantityが不正（Noneまたは0以下）のため保有なし")
        return bool(self.side and self.quantity and self.quantity > 0)

    def stop(self):
        self.active = False
        
        # ✅ ポジション情報を完全にリセット（quantity が 0 なので当然）
        self.entry_price = None
        self.highest_price = None
        self.lowest_price = None
        self.side = None
        self.quantity = None
        self.trigger_condition = ""
        self.active_limit_orders.clear()
        self.limit_order_timestamps.clear()
        
        self._save_state()
        self.redis.set(self.cooldown_key, time.time(), ex=30)
        logger.info(f"[{self.symbol}] ⏹ ポジション監視停止 & クールダウン設定")
        position_logger.info(f"[{self.symbol}] ポジション監視停止 & クールダウン設定")

    def sync_position_from_api(self):
        """
        Bybit APIから現在のポジション情報を取得して
        PositionManagerの状態を同期します。
        """
        try:
            pos_resp = self.client.get_position(self.symbol)
            positions = pos_resp.get("result", {}).get("list", [])
            if not positions:
                # ポジションなしならリセット
                self.stop()
                return

            pos = positions[0]
            side = pos.get("side")
            quantity = float(pos.get("size", 0))
            if quantity <= 0 or side is None:
                self.stop()
                return

            self.side = side
            self.quantity = quantity
            self.entry_price = float(pos.get("entryPrice", 0)) or None
            self._save_state()
            logger.debug(f"[{self.symbol}] APIポジション同期完了: side={side}, qty={quantity}, entry_price={self.entry_price}")
        except Exception as e:
            logger.error(f"[{self.symbol}] sync_position_from_api() 例外: {e}")

    def monitor(self):
        try:
            self._load_state()
            while self.active:
                time.sleep(self.check_interval)
                try:
                    self._check_price_trail()
                    self._check_limit_order_cancel()
                    self._check_reverse_flow_exit()
                    self._check_additional_stop_loss()
                
                    # 新規追加: 逆方向大口成行 + 板偏差による決済チェック
                    self._check_reverse_large_order_exit()

                    self._check_drawdown_exit()
                    self._check_timeout_exit()
                
                    self._save_state()
                except Exception as e:
                    logger.exception(f"[{self.symbol}] モニターループ中に例外発生: {e}")
        except Exception as e:
            logger.critical(f"[{self.symbol}] monitor() が異常終了しました: {e}")

    def _check_reverse_large_order_exit(self):
        if not self.entry_condition_evaluator:
            return

        orderbook = self.order_manager.client.get_orderbook(self.symbol)
        side = "Sell" if self.side == "Buy" else "Buy"

        triggered = self.entry_condition_evaluator.is_reverse_large_order_triggered(
            symbol=self.symbol,
            side=side,
            orderbook=orderbook,
            entry_condition_evaluator=self.entry_condition_evaluator,
        )

        deviation = self.entry_condition_evaluator.get_board_deviation(self.symbol, orderbook)

        if triggered and abs(deviation) < 3.5:
            logger.info(f"[{self.symbol}] 🔻 逆方向大口成行＋板偏差条件で決済します。 deviation={deviation:.2f}%")
            self.close_position(self.symbol)

    def _check_price_trail(self): 
        try:
            if self.entry_price is None or self.side is None:
                return

            price = self._retry_api_call(self.client.get_current_price, self.symbol)
            if price is None:
                return

            # 🔁 ボラティリティからトレール幅とトリガーを毎回動的に更新
            volatility_level = self._get_volatility_level()
            if volatility_level == "high":
                self.trail_trigger = 0.045  # +4.5%
                self.trail_width = 0.035    # 3.5%
            elif volatility_level == "low":
                self.trail_trigger = 0.025  # +2.5%
                self.trail_width = 0.015    # 1.5%
            else:
                self.trail_trigger = 0.035  # +3.5%
                self.trail_width = 0.025    # 2.5%

            if self.side == "Buy":
                if price > (self.highest_price or self.entry_price):
                    previous = self.highest_price or self.entry_price
                    self.highest_price = price
                    logger.info(f"[{self.symbol}] 🔼 高値更新: {previous:.2f} → {self.highest_price:.2f}")
            
                trail_price = (self.highest_price or self.entry_price) * (1 - self.trail_width)
                profit_pct = ((self.highest_price or 0) - self.entry_price) / self.entry_price
            
                if profit_pct >= self.trail_trigger and not self.trailing_active:
                    self.trailing_active = True
                    logger.info(f"[{self.symbol}] ▶️ トレーリング開始: 利益率={profit_pct*100:.2f}%, トレール価格={trail_price:.2f} (幅={self.trail_width*100:.1f}%)")
            
                if self.trailing_active and price <= trail_price:
                    logger.info(f"[{self.symbol}] 📉 トレーリングストップ発動 (Buy) @ {price:.2f} (最高値={self.highest_price:.2f})")
                    self._exit_position(
                        price=price,
                        reason="トレーリングストップ",
                        reason_detail=(
                            f"Buyポジション: トレーリングストップ発動（最高値={self.highest_price:.2f}, "
                            f"トリガー={self.trail_trigger*100:.1f}%、トレール幅={self.trail_width*100:.1f}%、価格={price:.2f}）"
                        )
                    )

            elif self.side == "Sell":
                if price < (self.lowest_price or self.entry_price):
                    previous = self.lowest_price or self.entry_price
                    self.lowest_price = price
                    logger.info(f"[{self.symbol}] 🔽 安値更新: {previous:.2f} → {self.lowest_price:.2f}")
            
                trail_price = (self.lowest_price or self.entry_price) * (1 + self.trail_width)
                profit_pct = (self.entry_price - (self.lowest_price or 0)) / self.entry_price

                if profit_pct >= self.trail_trigger and not self.trailing_active:
                    self.trailing_active = True
                    logger.info(f"[{self.symbol}] ▶️ トレーリング開始: 利益率={profit_pct*100:.2f}%, トレール価格={trail_price:.2f} (幅={self.trail_width*100:.1f}%)")

                if self.trailing_active and price >= trail_price:
                    logger.info(f"[{self.symbol}] 📈 トレーリングストップ発動 (Sell) @ {price:.2f} (最安値={self.lowest_price:.2f})")
                    self._exit_position(
                        price=price,
                        reason="トレーリングストップ",
                        reason_detail=(
                            f"Sellポジション: トレーリングストップ発動（最安値={self.lowest_price:.2f}, "
                            f"トリガー={self.trail_trigger*100:.1f}%、トレール幅={self.trail_width*100:.1f}%、価格={price:.2f}）"
                        )
                    )

        except Exception as e:
            logger.exception(f"[{self.symbol}] _check_price_trail() 例外: {e}")

    def _get_volatility_level(self):
        """
        過去5分の価格データからボラティリティを評価し、
        'low' / 'medium' / 'high' を返す
        """
        try:
            candles = self.client.get_ohlcv(self.symbol, interval="1", limit=5)
            highs = [c['high'] for c in candles if 'high' in c]
            lows = [c['low'] for c in candles if 'low' in c]

            if not highs or not lows:
                return "medium"  # データなければ標準に

            highest = max(highs)
            lowest = min(lows)
            volatility = (highest - lowest) / lowest * 100  # %

            if volatility > 1.5:
                return "high"
            elif volatility < 0.7:
                return "low"
            else:
                return "medium"

        except Exception as e:
            logger.warning(f"[{self.symbol}] ボラティリティ評価失敗: {e}")
            return "medium"

    def _exit_position(self, price: float, reason: str, reason_detail: str = ""):
        try:
            success = self.order_manager.place_stop_loss_order(
                symbol=self.symbol,
                side="Sell" if self.side == "Buy" else "Buy",
                qty=self._get_position_size(),
                trigger_reason=reason
            )
            if not success:
                logger.error(f"[{self.symbol}] 損切り注文の発注に失敗しました")
            pnl = float((price - self.entry_price) * self._get_position_size() * (1 if self.side == "Buy" else -1))
            log_trade_result({
                "symbol": self.symbol,
                "side": self.side or "",
                "entry_price": self.entry_price,
                "exit_price": price,
                "quantity": self._get_position_size(),
                "pnl": pnl,
                "trigger": self.trigger_condition,
                "exit_type": reason,
                "exit_reason_detail": reason_detail, 
                "note": STRATEGY_VERSION
            })
            log_performance_summary(
                self.symbol,
                self.side or "",
                self._get_position_size(),
                pnl,
                reason,
                entry_price=self.entry_price,
                exit_price=price,
                comment=f"{STRATEGY_VERSION} | {reason_detail}"
            )
            
            # ここで loss_callback が設定されていれば呼び出す
            if self.loss_callback:
                self.loss_callback(self.symbol, price, reason)   
                
            # ここで通知を送る
            if reason == "トレーリングストップ":
                self.notifier.send_message(f"[利確] {self.symbol} {self.side} 利確済み - 価格: {price}, 数量: {self.quantity}\n理由: {reason_detail}")
            else:
                self.notifier.send_message(f"[損切] {self.symbol} {self.side} 損切り - 価格: {price}, 数量: {self.quantity}\n理由: {reason_detail}")
            
            self.stop()
        except Exception as e:
            logger.exception(f"[{self.symbol}] _exit_position() 例外: {e}")
        finally:
            self.active = False

    def _check_limit_order_cancel(self):
        """
        指値キャンセル条件のチェック：
        1. 板偏差3.5%未満
        2. 逆方向の大口成行検知（過去1週間平均0.5%以上）
        3. 指値注文4秒以上経過
        """
        try:
            if not self.active_limit_orders or not self.active:
                return

            price = self._retry_api_call(self.client.get_current_price, self.symbol)
            if price is None:
                return

            deviation = self._retry_api_call(self.client.get_board_deviation, self.symbol)
            if deviation is None:
                return

            reverse_side = "Sell" if self.side == "Buy" else "Buy"

            # 板偏差3.5%未満の場合キャンセル
            if abs(deviation) < 3.5:
                logger.info(f"[{self.symbol}] 指値キャンセル: 板偏差3.5%未満 ({deviation:.2f}%)")
                self._cancel_all_limit_orders()
                return

            # 逆方向の大口成行検知でキャンセル
            if self._retry_api_call(self.client.detect_reverse_large_order, self.symbol, reverse_side, threshold_ratio=0.005):
                logger.info(f"[{self.symbol}] 指値キャンセル: 逆方向大口成行検知")
                self._cancel_all_limit_orders()
                return

            # 4秒経過でキャンセル
            now_ts = time.time()
            to_cancel = []
            for order_id, placed_ts in self.limit_order_timestamps.items():
                if now_ts - placed_ts > 4:
                    to_cancel.append(order_id)
            if to_cancel:
                logger.info(f"[{self.symbol}] 指値キャンセル: 4秒超過 {to_cancel}")
                self._cancel_all_limit_orders()
                return

        except Exception as e:
            logger.exception(f"[{self.symbol}] _check_limit_order_cancel() 例外: {e}")

    def _cancel_all_limit_orders(self):
        try:
            count = len(self.active_limit_orders) 
            for order_id in list(self.active_limit_orders.keys()):
                self.order_manager.cancel_order(self.symbol, order_id)
                logger.info(f"[{self.symbol}] 指値注文キャンセル: order_id={order_id}")
                fills_logger.info(f"[{self.symbol}] 指値注文キャンセル: order_id={order_id}")
            self.active_limit_orders.clear()
            self.limit_order_timestamps.clear()
            
            self.notifier.send_message(f"[指値キャンセル] {self.symbol} {self.side or ''} 未約定指値注文をキャンセルしました（{count}件）")
            
        except Exception as e:
            logger.exception(f"[{self.symbol}] _cancel_all_limit_orders() 例外: {e}")

    def test_something(self):
        print("Before _check_additional_stop_loss call")
        self.pm._check_additional_stop_loss()
        print("After _check_additional_stop_loss call")

    def _check_additional_stop_loss(self):
        """
        例外的損切りルール：
        - Redis操作失敗連続3回で強制損切り
        - API呼び出し失敗連続3回で強制損切り
        """
        try:
            # Redisのエラー連続検知
            if self.redis_error_count >= self.redis_error_threshold:
                logger.error(f"[{self.symbol}] Redis異常による強制損切り発動 (連続{self.redis_error_count}回失敗)")
                # ここにログ追加
                print(f"Redis error count: {self.redis_error_count} reached threshold {self.redis_error_threshold}")
                price = self._retry_api_call(self.client.get_current_price, self.symbol)
                if price is not None:
                    self._exit_position(
                        price=price,
                        reason="redis_error_forced_stoploss",
                        reason_detail=f"Redisエラー連続{self.redis_error_count}回により強制損切り"
                    )
                else:
                    logger.error(f"[{self.symbol}] Redis異常時の価格取得失敗、強制損切りをスキップ")
                # カウンタリセットして監視続行
                self.redis_error_count = 0
                return

            # API呼び出し失敗連続検知
            if self.api_error_count >= self.api_error_threshold:
                logger.error(f"[{self.symbol}] API異常による強制損切り発動 (連続{self.api_error_count}回失敗)")
                # ここにログ追加
                print(f"API error count: {self.api_error_count} reached threshold {self.api_error_threshold}")
                price = self._retry_api_call(self.client.get_current_price, self.symbol)
                if price is not None:
                    self._exit_position(
                        price=price,
                        reason="api_error_forced_stoploss",
                        reason_detail=f"APIエラー連続{self.api_error_count}回により強制損切り"
                    )
                else:
                    logger.error(f"[{self.symbol}] API異常時の価格取得失敗、強制損切りをスキップ")
                # カウンタリセットして監視続行
                self.api_error_count = 0
                return

        except Exception as e:
            logger.exception(f"[{self.symbol}] _check_additional_stop_loss() 例外: {e}")
            
    def _check_drawdown_exit(self):
        try:
            if self.entry_price is None or self.side is None:
                return

            price = self._retry_api_call(self.client.get_current_price, self.symbol)
            if price is None:
                return

            # 損益計算 (Buyなら現在価格 - エントリー価格、Sellなら逆)
            pnl = (price - self.entry_price) * (1 if self.side == "Buy" else -1) * self._get_position_size()

            # 総資産はRedis等から取得（例：total_asset_usdt）
            total_asset_str = self.redis.get("total_asset_usdt") or os.getenv("DEFAULT_ASSET_USDT")
            if total_asset_str is None:
                logger.warning(f"[{self.symbol}] 総資産情報がありません")
                return
            total_asset = float(total_asset_str)
            if total_asset <= 0:
                return

            loss_ratio = pnl / total_asset
            if loss_ratio <= -0.01:  # 1%以上の損失なら損切り
                logger.info(f"[{self.symbol}] ⚠️ 資産1%以上の損失で強制損切り (損失率 {loss_ratio:.3%})")
                self._exit_position(
                    price,
                    reason="drawdown_stop_loss",
                    reason_detail=f"資産に対し損失率 {loss_ratio:.3%} で1%以上の損失のため強制損切り"
                )
        except Exception as e:
            logger.exception(f"[{self.symbol}] _check_drawdown_exit() 例外: {e}")
        
    def _check_timeout_exit(self):
        try:
            if self.entry_time is None or self.entry_price is None or self.side is None:
                return

            elapsed = time.time() - self.entry_time
            if elapsed < 60:  # 60秒未満なら判定しない
                return

            price = self._retry_api_call(self.client.get_current_price, self.symbol)
            if price is None:
                return

            pnl = (price - self.entry_price) * (1 if self.side == "Buy" else -1) * self._get_position_size()

            # 含み益なし（損益が0以下）なら損切り
            if pnl <= 0:
                logger.info(f"[{self.symbol}] ⏳ 60秒経過 + 含み益なしで損切り発動")
                self._exit_position(
                    price=price,
                    reason="timeout_no_profit_stop_loss",
                    reason_detail="60秒経過したが含み益がないため自動損切りを実行"
                )
        except Exception as e:
            logger.exception(f"[{self.symbol}] _check_timeout_exit() 例外: {e}")
    

    def _check_reverse_flow_exit(self):
        try:
            if self.entry_price is None:
                return
            price = self._retry_api_call(self.client.get_current_price, self.symbol)
            if price is None:
                return

            price_within_40pips = abs(price - self.entry_price) / self.entry_price <= 0.004
            deviation = self._retry_api_call(self.client.get_board_deviation, self.symbol)

            logger.debug(f"[{self.symbol}] 逆方向判定: price={price}, entry={self.entry_price}, Δ={deviation}, 40pips範囲={price_within_40pips}")

            if self.side is None:
                logger.warning(f"[{self.symbol}] sideが未設定のため、逆方向判定をスキップ")
                return

            if price_within_40pips and deviation is not None and abs(deviation) < 3.5:
                reverse_side = "Sell" if self.side == "Buy" else "Buy"

                # ✅ 新条件：2秒以内に過去1週間の同時間帯平均1分出来高の0.75%以上の逆方向成行注文
                if not is_reverse_large_order_triggered(self.symbol, reverse_side, window_sec=2, threshold_ratio=0.0075):
                    return  # 条件未達なのでスキップ

                # ✅ 既存：detect_reverse_large_order も満たしているかチェック
                if self._retry_api_call(self.client.detect_reverse_large_order, self.symbol, reverse_side, threshold_ratio=0.0075):
                    logger.info(f"[{self.symbol}] 💥 逆方向大口で損切り: ▶ 発動条件=逆方向大口+偏差, 損切り価格={price:.2f}")
                    execution_logger.info(f"{self.symbol} 逆方向大口で決済: 損切り価格={price:.2f}")
        
                    self.order_manager.place_stop_loss_order(
                        symbol=self.symbol,
                        side="Sell" if self.side == "Buy" else "Buy",
                        qty=self._get_position_size(),
                        trigger_reason="逆方向大口成行"
                    )
                    pnl = float((price - self.entry_price) * self._get_position_size() * (1 if self.side == "Buy" else -1))
                    log_trade_result({
                        "symbol": self.symbol,
                        "side": self.side or "",
                        "entry_price": self.entry_price,
                        "exit_price": price,
                        "quantity": self._get_position_size(),
                        "pnl": pnl,
                        "trigger": self.trigger_condition,
                        "exit_type": "reverse_flow",
                        "note": STRATEGY_VERSION
                    })
                    log_performance_summary(
                        symbol=self.symbol,
                        side=self.side or "",
                        qty=self._get_position_size(),
                        pnl=pnl,
                        reason="reverse_large_order_detected",
                        entry_price=self.entry_price,
                        exit_price=price,
                        comment=STRATEGY_VERSION
                    )
                    self.stop()
        except Exception as e:
            logger.exception(f"[{self.symbol}] _check_reverse_flow_exit() 例外: {e}")
            
    def _place_stoploss_with_retry(self, symbol: str, side: str, qty: float, reason: str, max_retry: int = 3): 
        """
        損切り注文を最大3回までリトライで試行する関数
        """
        # ✅ 先にポジション量と残高を再取得
        current_position = self._retry_api_call(self.client.get_position, symbol)
        if not current_position:
            logger.error(f"[{symbol}] ❌ ポジション情報の取得に失敗しました（損切り前）")
            return False

        pos_list = current_position.get("result", {}).get("list", [])
        if not pos_list:
            logger.warning(f"[{symbol}] 🚫 ポジションが存在しないため損切り不要")
            return False

        pos_info = pos_list[0]
        actual_qty = float(pos_info.get("size", 0))
        if actual_qty <= 0:
            logger.warning(f"[{symbol}] 🚫 ポジション数量が0以下のため損切りスキップ")
            return False

        if abs(actual_qty - qty) > 1e-8:
            logger.warning(f"[{symbol}] ⚠️ 指定qtyと実際のポジション数量が不一致: 指定={qty}, 実際={actual_qty} → 実際の数量で損切り")
            qty = actual_qty  # 実際の数量に修正

        # ✅ 残高も確認（将来的に証拠金モードで不足防止）
        wallet = self._retry_api_call(self.client.get_wallet_balance)
        if wallet:
            usdt_balance = float(wallet.get("result", {}).get("list", [{}])[0].get("totalWalletBalance", 0))
            if usdt_balance <= 1:  # ※閾値は必要に応じて調整
                logger.warning(f"[{symbol}] ⚠️ ウォレット残高が非常に低い: {usdt_balance:.2f} USDT")

        # ✅ 本番の損切りループ
        for attempt in range(1, max_retry + 1):
            try:
                logger.info(f"[{symbol}] 損切り注文（{reason}）を発注開始（{attempt}回目）")

                response = self.order_manager.place_stop_loss_order(
                    symbol=symbol,
                    side=side,
                    qty=qty,
                    trigger_reason=reason
                )
                if response:
                    logger.info(f"[{symbol}] ✅ 損切り成功（{reason}）: response={response}")
                    return True
                else:
                    logger.warning(f"[{symbol}] ⚠️ 損切り失敗（{reason}）→ response=None")
            except Exception as e:
                logger.warning(f"[{symbol}] ❌ 損切り注文例外（{reason}） attempt={attempt}: {e}")
            time.sleep(1)

        logger.error(f"[{symbol}] ❌ 損切り注文に{max_retry}回連続で失敗しました（{reason}）")
        return False

    def _handle_stoploss_failure(self, symbol: str, side: str, qty: float, reason: str): 
        """
        損切り失敗時の緊急対応ロジック
        1. 近い価格で指値
        2. 小分け注文
        3. 通知
        """
        current_price = self._retry_api_call(self.client.get_current_price, symbol)
        if current_price is None:
            logger.error(f"[{symbol}] 緊急損切り処理中：現在価格取得失敗。何もできません。")
            return

        # 1. 指値注文（現在価格 ± 0.05% で即指値）
        limit_price = current_price * (1.0005 if side == "Sell" else 0.9995)
        try:
            logger.warning(f"[{symbol}] 損切り失敗 → 指値注文で代替試行: price={limit_price:.2f}")
            self.order_manager.client.place_limit_order(
                symbol=symbol,
                side=side,
                price=round(limit_price, 2),
                qty=qty
            )
        except Exception as e:
            logger.error(f"[{symbol}] 指値注文も失敗: {e}")

        # 2. 小分け（半量）で成行リトライ
        try:
            logger.warning(f"[{symbol}] 小分け注文で再試行（50%ずつ）")
            half_qty = qty / 2
            self.order_manager.client.place_market_order(symbol=symbol, side=side, qty=half_qty)
            self.order_manager.client.place_market_order(symbol=symbol, side=side, qty=qty - half_qty)
        except Exception as e:
            logger.error(f"[{symbol}] 小分け注文も失敗: {e}")

        # 3. 通知（Slack / LINE / Discord）←ここは未実装でOK
        logger.critical(f"[{symbol}] ⚠️ 緊急損切りロジックすべて失敗。人間の介入が必要です！（{reason}）")
        
    # position_manager.py 内

    def is_reverse_exit_condition_met(self, symbol: str, side: str) -> bool:
        """
        エグジット条件（逆方向大口成行 + 板偏差）を判定する。
        """
        from utils.volume_stats import load_volume_data
        from utils.bybit_client import get_orderbook_deviation, get_recent_market_orders, get_current_price
        from utils.time_utils import get_jst_now
        import datetime

        now = get_jst_now()

        # --- 1. 過去1週間の同時間帯平均1分出来高を取得 ---
        avg_volume_info = load_volume_data(symbol)
        if avg_volume_info is None:
            return False

        current_minute = now.replace(second=0, microsecond=0)
        avg_minute_volume = avg_volume_info.get(current_minute.strftime("%H:%M"), 0)
        if avg_minute_volume == 0:
            return False

        threshold_volume = avg_minute_volume * 0.0075  # 0.75%
    
        # --- 2. 直近1秒以内の逆方向成行注文量を集計 ---
        recent_orders = get_recent_market_orders(symbol, seconds=1)
        reverse_side = "Sell" if side == "Buy" else "Buy"
        reverse_volume = sum(o["quantity"] for o in recent_orders if o["side"] == reverse_side)

        if reverse_volume < threshold_volume:
            return False  # 成行の条件を満たさない

        # --- 3. 板偏差が ±3.5%以上あるか判定 ---
        current_price = get_current_price(symbol)
        deviation = get_orderbook_deviation(symbol, price_range_ratio=0.004)  # 0.4% ≒ 40PIPS相当

        if reverse_side == "Buy" and deviation >= 3.5:
            return True
        elif reverse_side == "Sell" and deviation <= -3.5:
            return True

        return False


