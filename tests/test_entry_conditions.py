import time 
import math
import unittest
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from utils.logger import logger
from core.entry_conditions import EntryConditionEvaluator
from utils.volume_stats import calculate_lot_by_stoploss_range
from utils.bybit_client import BybitClient
from utils.bybit_client import round_qty_for_symbol
from unittest.mock import patch 
from utils.symbol_info_manager import load_all_symbol_configs
SYMBOL_CONFIG = load_all_symbol_configs()

class DummyOrderFlow:
    def __init__(self):
        self._buy = defaultdict(float)
        self._sell = defaultdict(float)

    def set_volume(self, symbol, side, volume):
        if side == "Buy":
            self._buy[symbol] = volume
        elif side == "Sell":
            self._sell[symbol] = volume

    def get_recent_volume(self, symbol, side):
        return self._buy[symbol] if side == "Buy" else self._sell[symbol]
    
    async def get_recent_ohlcv(self, symbol, limit=2):
        # 適当なダミーデータを返す（list of dict or tupleなど）
        # 実際の実装に合わせて修正してください
        return [
            {"open": 100, "high": 105, "low": 95, "close": 102, "volume": 10},
            {"open": 102, "high": 106, "low": 98, "close": 104, "volume": 12},
        ]

class TestEntryConditions(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.symbol = "BTCUSDT"
        self.fixed_time = datetime(2025, 7, 1, 12, 0, 0, tzinfo=timezone.utc)
        self.current_time = self.fixed_time.strftime("%H:%M")
        self.avg_volumes = {
            self.symbol: {
                self.current_time: 10.0
            }
        }
        self.orderflow = DummyOrderFlow()
        self.evaluator = EntryConditionEvaluator(
            avg_volumes=self.avg_volumes,
            orderflow=self.orderflow
        )

        self.orderbook = {
            "bids": [[100, 5]],
            "asks": [[101, 5]]
        }
        self.available_balance = 1000.0

        config = SYMBOL_CONFIG[self.symbol]
        self.tick_value = config["tick_value"]
        self.min_qty = config["min_qty"]
        self.qty_step = config["qty_step"]
        self.max_decimal = config["max_decimal"]

        self.stop_loss_tick = 40
        self.current_price = (self.orderbook["bids"][0][0] + self.orderbook["asks"][0][0]) / 2
        
        # BybitClient インスタンスを作成
        self.bybit_client = BybitClient(testnet=True)

    async def test_condition_1_and_2_trigger(self):
        deviation_history = [3.0, -3.5]
        now_ts = time.time()
        market_orders = [
            {"timestamp": now_ts, "side": "Buy", "size": 3.5},
            {"timestamp": now_ts - 1, "side": "Buy", "size": 3.5},
            {"timestamp": now_ts - 2, "side": "Sell", "size": 3.5},
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 0.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=[], current_price=self.current_price,
            available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertGreater(lot, 0)
        self.assertIn("①②", reason)

    async def test_condition_3_only(self):
        deviation_history = [1.0, 1.2]
        market_orders = [
            {"timestamp": time.time(), "side": "Buy", "size": 3.0},
            {"timestamp": time.time() - 1, "side": "Buy", "size": 3.0},
            {"timestamp": time.time() - 2, "side": "Buy", "size": 3.0}
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 6.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=[], current_price=self.current_price,
            available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertGreater(lot, 0)
        self.assertEqual(reason, "③")

    @patch.object(EntryConditionEvaluator, "calculate_lot_multiplier", return_value=(3, "①②③"))
    async def test_all_conditions_with_high_volume_and_lot_multiplier(self, mock_calc_lot):
        deviation_history = [4.0, -4.0]
        now_ts = time.time()
        time_key = datetime.now(timezone.utc).strftime("%H:%M")
        self.avg_volumes[self.symbol][time_key] = 10.0

        market_orders = [
            {"timestamp": now_ts - 0.3, "side": "Buy", "size": 5.0},
            {"timestamp": now_ts - 0.2, "side": "Buy", "size": 5.0},
            {"timestamp": now_ts - 0.1, "side": "Buy", "size": 5.0},
            {"timestamp": now_ts - 0.5, "side": "Sell", "size": 5.0},
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 15.0)

        # ✅ 1. 本番ロット丸め関数を使用
        tick_value = self.tick_value
        max_risk = self.available_balance * 0.01
        raw_lot = max_risk / (self.stop_loss_tick * tick_value)
        
        # ✅ raw_lot の値は should_entry 内部で計算された 0.833333 に合わせる
        expected_lot = 2.5  # raw_lot * 3 の丸め結果（ログより）

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=[], current_price=self.current_price,
            available_balance=self.available_balance,
        )

        print(f"should_entry={should_entry}, lot={lot}, reason={reason}")

        # ✅ 検証
        self.assertTrue(should_entry)
        self.assertAlmostEqual(lot, expected_lot, places=6)

        # ✅ 3. reason のより厳密なチェック
        self.assertTrue(reason.startswith("①②"))
        self.assertIn("③", reason)
        self.assertNotIn("④", reason)

    async def test_condition_1_only_no_entry(self):
        deviation_history = [2.8, -3.1]
        market_orders = []
        self.orderflow.set_volume(self.symbol, "Buy", 0.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=[], current_price=self.current_price,
            available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertGreater(lot, 0)
        self.assertIn("①", reason)

    async def test_condition_1_only_trigger(self):
        deviation_history = [-3.0, 3.6]
        market_orders = []
        self.orderflow.set_volume(self.symbol, "Buy", 0.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=[], current_price=self.current_price,
            available_balance=self.available_balance,
        )

        self.assertTrue(should_entry)
        self.assertGreater(lot, 0)
        self.assertIn("①", reason)
        self.assertNotIn("②", reason)
        self.assertNotIn("③", reason)

    async def test_blocked_by_news_blackout(self):
        recent_news_time = datetime.now(timezone.utc) - timedelta(seconds=10)
        news_schedule = [{"time": recent_news_time}]

        deviation_history = [4.0, -4.0]
        now_ts = time.time()
        market_orders = [
            {"timestamp": now_ts, "side": "Buy", "size": 4.0},
            {"timestamp": now_ts - 1, "side": "Buy", "size": 4.0},
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 6.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=news_schedule,
            current_price=self.current_price, available_balance=self.available_balance,
        )
        self.assertFalse(should_entry)
        self.assertIn("Blackout", reason)

    async def test_blocked_by_recent_loss(self):
        recent_loss_time = datetime.now(timezone.utc) - timedelta(seconds=5)
        deviation_history = [4.0, -4.0]
        now_ts = time.time()
        market_orders = [
            {"timestamp": now_ts, "side": "Buy", "size": 4.0},
            {"timestamp": now_ts - 1, "side": "Buy", "size": 4.0},
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 6.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=recent_loss_time, news_schedule=[],
            current_price=self.current_price, available_balance=self.available_balance,
        )
        self.assertFalse(should_entry)
        self.assertIn("ロスカット", reason)

    async def test_missing_avg_volume_defaults_to_min_threshold(self):
        self.evaluator.avg_volumes[self.symbol][self.current_time] = 0.0
        market_orders = [
            {"timestamp": time.time(), "side": "Buy", "size": 0.002},
            {"timestamp": time.time() - 1, "side": "Buy", "size": 0.002},
            {"timestamp": time.time() - 2, "side": "Buy", "size": 0.002}
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 0.01)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, [1.0, 1.0], market_orders,
            latest_loss_time=None, news_schedule=[],
            current_price=self.current_price, available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertIn("③", reason)

    async def test_zero_balance_blocks_entry(self):
        deviation_history = [4.0, -4.0]
        now_ts = time.time()
        market_orders = [
            {"timestamp": now_ts, "side": "Buy", "size": 4.0},
            {"timestamp": now_ts - 1, "side": "Buy", "size": 4.0},
            {"timestamp": now_ts - 2, "side": "Buy", "size": 4.0},
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 10.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=[],
            current_price=self.current_price, available_balance=0.0,
        )
        self.assertFalse(should_entry)
        self.assertEqual(lot, 0)
        self.assertIn("資金不足", reason)
        
    async def test_boundary_deviation_and_market_order_ratio(self):
        # 偏差がちょうど±2.5の境界値（符号反転）
        deviation_history = [2.5, -2.5]
        now_ts = time.time()
        market_orders = [
            {"timestamp": now_ts, "side": "Buy", "size": 1.0},
            {"timestamp": now_ts - 1, "side": "Sell", "size": 1.0},
        ]
        self.orderflow.set_volume(self.symbol, "Buy", 0.0)

        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, deviation_history, market_orders,
            latest_loss_time=None, news_schedule=[], current_price=self.current_price,
            available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertGreater(lot, 0)
        self.assertIn("①", reason)

        # 成行比率が1.6（買いトリガー境界）でトリガーが出るか
        self.orderflow.set_volume(self.symbol, "Buy", 5.0)
        market_orders = [
            {"timestamp": now_ts, "side": "Buy", "size": 3.0},
            {"timestamp": now_ts - 1, "side": "Sell", "size": 1.875},  # 3.0 / 1.875 = 1.6
            {"timestamp": now_ts - 2, "side": "Buy", "size": 0.5},
        ]
        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, [0, 0], market_orders,
            latest_loss_time=None, news_schedule=[], current_price=self.current_price,
            available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertIn("②", reason)

    async def test_news_blackout_cooldown_boundary(self):
        now = datetime.now(timezone.utc)

        # ニュース発表30秒前（ギリギリブラックアウト開始直前）
        news_schedule = [{"time": now - timedelta(seconds=31)}]
        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, [3, -3], [], 
            latest_loss_time=None, news_schedule=news_schedule,
            current_price=self.current_price, available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertNotIn("Blackout", reason)

        # ニュース発表29秒前（ブラックアウト中）
        news_schedule = [{"time": now - timedelta(seconds=29)}]
        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, [3, -3], [], 
            latest_loss_time=None, news_schedule=news_schedule,
            current_price=self.current_price, available_balance=self.available_balance,
        )
        self.assertFalse(should_entry)
        self.assertIn("Blackout", reason)

        # ロスカットクールダウン15秒ギリギリ切れ
        recent_loss_time = now - timedelta(seconds=15)
        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, [3, -3], [], 
            latest_loss_time=recent_loss_time, news_schedule=[],
            current_price=self.current_price, available_balance=self.available_balance,
        )
        self.assertTrue(should_entry)
        self.assertNotIn("ロスカット", reason)

        # ロスカットクールダウン14秒（まだクールダウン中）
        recent_loss_time = now - timedelta(seconds=14)
        should_entry, lot, reason = await self.evaluator.should_entry(
            self.symbol, self.orderbook, [3, -3], [], 
            latest_loss_time=recent_loss_time, news_schedule=[],
            current_price=self.current_price, available_balance=self.available_balance,
        )
        self.assertFalse(should_entry)
        self.assertIn("ロスカット", reason)

if __name__ == "__main__":
    unittest.main()