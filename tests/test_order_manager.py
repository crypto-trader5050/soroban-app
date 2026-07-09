import unittest  
from unittest.mock import MagicMock, patch
import time
import sys
import os
import config

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.order_manager import OrderManager
from utils.bybit_client import BybitClient
from core.entry_conditions import EntryConditionEvaluator
from utils.lot_calculator import round_qty_to_minimum

class TestOrderManager(unittest.TestCase):
    def setUp(self):
        # BybitClient と EntryConditionEvaluator をモック化
        self.mock_client = MagicMock(spec=BybitClient)
        self.mock_client.cancel_order = MagicMock()
        self.mock_client.get_board_deviation = MagicMock(return_value=2.0)  # 3.5%未満に設定
        self.mock_evaluator = MagicMock(spec=EntryConditionEvaluator)
        # DRY_RUNはテスト毎に切り替えるためここでは設定しない
        # OrderManagerはテスト毎に生成するためsetUpで作らない

        self.symbol = "BTCUSDT"
        self.side = "Buy"

    def create_order_manager(self, dry_run: bool) -> OrderManager:
        config.DRY_RUN = dry_run
        return OrderManager(client=self.mock_client, evaluator=self.mock_evaluator, dry_run=dry_run)

    def test_can_enter_normal(self):
        config.DRY_RUN = True
        om = self.create_order_manager(dry_run=True)
        self.assertTrue(om.can_enter(self.symbol))

    def test_can_enter_already_position(self):
        om = self.create_order_manager(dry_run=True)
        om.position_opened_symbols.add(self.symbol)
        self.assertFalse(om.can_enter(self.symbol))

    def test_can_enter_cooldown(self):
        om = self.create_order_manager(dry_run=True)
        om.position_closed_time[self.symbol] = time.time()
        self.assertFalse(om.can_enter(self.symbol))
        om.position_closed_time[self.symbol] = time.time() - 16
        self.assertTrue(om.can_enter(self.symbol))

    def test_update_position_opened_and_closed(self):
        om = self.create_order_manager(dry_run=True)
        om.update_position_opened(self.symbol)
        self.assertIn(self.symbol, om.position_opened_symbols)
        om.update_position_closed(self.symbol)
        self.assertNotIn(self.symbol, om.position_opened_symbols)
        self.assertIn(self.symbol, om.position_closed_time)

    def test_place_entry_orders_cannot_enter(self):
        om = self.create_order_manager(dry_run=True)
        om.position_opened_symbols.add(self.symbol)
        result = om.place_entry_orders(self.symbol, self.side, 1.0, 100.0, 10, 0.1, 1000)
        self.assertEqual(result, {})

    @patch('utils.lot_calculator.calculate_min_lot', return_value=0.001)
    @patch('utils.lot_calculator.calculate_safe_lot', return_value=1.0) 
    def test_place_entry_orders_success_dry_run(self, mock_safe_lot, mock_min_lot):
        om = self.create_order_manager(dry_run=True)
        # can_enter をモックしてTrueに
        om.can_enter = MagicMock(return_value=True)
        om.client.place_market_order = MagicMock(return_value={"retCode": 0, "result": {"orderId": "dryrun-market", "avgPrice": 100.0}})
        om.evaluator.estimate_stoploss_usdt.return_value = 1.5
        
        # 丸めを通すとqtyが変わるため、round_qtyをモックして丸め処理をスキップ
        with patch('core.order_manager.round_qty_to_minimum', side_effect=lambda symbol, qty: qty):
        
            entry_price = 100.0
            stop_ticks = 10
            tick_size = 0.1
            available_balance = 1000

            result = om.place_entry_orders(
                self.symbol, self.side, 1.0, entry_price, stop_ticks, tick_size, available_balance
            )

        self.assertIn("market_order", result)
        self.assertIn("limit_orders", result)
        self.assertIn("order_ids", result)
        self.assertEqual(result["symbol"], self.symbol)
        self.assertEqual(result["side"], self.side)
        self.assertGreater(result["qty"], 0)
        self.assertAlmostEqual(result["qty"], 1.0, places=6)
        # DRY_RUNなので呼ばれないはず
        self.assertEqual(result["market_order"]["result"]["orderId"], "dryrun-market")

    @patch('utils.lot_calculator.calculate_safe_lot', return_value=1.0)
    def test_place_entry_orders_fail_invalid_price(self, mock_safe_lot):
        om = self.create_order_manager(dry_run=True)
        result = om.place_entry_orders(self.symbol, self.side, 1.0, 0, 10, 0.1, 1000)
        self.assertEqual(result, {})

    def test_handle_order_failure_and_close_positions_success(self):
        om = self.create_order_manager(dry_run=True)
        self.mock_client.place_market_order.return_value = {
            "retCode": 0,
            "result": {"orderId": "close123"}
        }
        om.position_opened_symbols.add(self.symbol)
        om.handle_order_failure_and_close_positions(self.symbol, self.side, 1.0, "test_reason")
        # ✅ 成功時は position_opened_symbols から削除される
        self.assertNotIn(self.symbol, om.position_opened_symbols)
        # ✅ 成功時は position_closed_time に登録される
        self.assertIn(self.symbol, om.position_closed_time)

    def test_handle_order_failure_and_close_positions_fail(self):
        om = self.create_order_manager(dry_run=False)
        self.mock_client.place_market_order.return_value = {
            "retCode": 10001,
            "retMsg": "Error"
        }
        om.position_opened_symbols.add(self.symbol)
        om.handle_order_failure_and_close_positions(self.symbol, self.side, 1.0, "test_reason")
        # ❌ 失敗時は position_opened_symbols に残る（削除されない）
        self.assertIn(self.symbol, om.position_opened_symbols)
        # ❌ 失敗時は position_closed_time に追加されない
        self.assertNotIn(self.symbol, om.position_closed_time)

    @patch('utils.lot_calculator.calculate_safe_lot', return_value=1.0)
    def test_place_stop_loss_order_dry_run(self, mock_safe_lot):
        om = self.create_order_manager(dry_run=True)
        resp = om.place_stop_loss_order(self.symbol, self.side, 1.0, trigger_reason="unit_test")
        self.assertEqual(resp["retCode"], 0)

    def test_generate_limit_orders_basic(self):
        om = self.create_order_manager(dry_run=True)
        base_price = 113800.0  # 実価格ベースで正しく検証

        # side=Buy のとき価格が下がる方向に分割
        orders = om._generate_limit_orders(self.symbol, "Buy", 1.0, base_price)
        prices = [price for _, price in orders]
        self.assertEqual(len(prices), 5)
        self.assertTrue(all(prices[i] > prices[i + 1] for i in range(4)))

        # side=Sell のとき価格が上がる方向に分割
        orders = om._generate_limit_orders(self.symbol, "Sell", 1.0, base_price)
        prices = [price for _, price in orders]
        self.assertEqual(len(prices), 5)
        self.assertTrue(all(prices[i] < prices[i + 1] for i in range(4)))

    def test_cancel_pending_limits_dry_run(self):
        om = self.create_order_manager(dry_run=True)
        om.active_limit_orders[self.symbol] = ["order1", "order2"]
        om.cancel_pending_limits(self.symbol)
        self.mock_client.cancel_order.assert_not_called()
        self.assertEqual(om.active_limit_orders[self.symbol], [])

    def test_cancel_pending_limits_real(self):
        om = self.create_order_manager(dry_run=False)
        om.active_limit_orders[self.symbol] = ["order1"]

        self.mock_client.cancel_order.return_value = {"retCode": 0}
        om.cancel_pending_limits(self.symbol)

        self.mock_client.cancel_order.assert_called_once_with(self.symbol, "order1")
        self.assertEqual(om.active_limit_orders[self.symbol], [])

    def test_evaluate_and_cancel_limits_conditions(self):
        om = self.create_order_manager(dry_run=True)
        om.active_limit_orders[self.symbol] = ["order1"]

        now = time.time()

        # 偏差が低いならキャンセル
        om.evaluate_and_cancel_limits(self.symbol, 3.0, False, now)
        self.assertEqual(om.active_limit_orders[self.symbol], [])

        # 大口逆注文検知でキャンセル
        om.active_limit_orders[self.symbol] = ["order2"]
        om.evaluate_and_cancel_limits(self.symbol, 4.0, True, now)
        self.assertEqual(om.active_limit_orders[self.symbol], [])

        # 待機時間超過でキャンセル
        om.active_limit_orders[self.symbol] = ["order3"]
        past = now - 5
        om.evaluate_and_cancel_limits(self.symbol, 4.0, False, past)
        self.assertEqual(om.active_limit_orders[self.symbol], [])

        # 条件に合わない場合キャンセルしない
        om.active_limit_orders[self.symbol] = ["order4"]
        om.evaluate_and_cancel_limits(self.symbol, 4.0, False, now)
        self.assertIn("order4", om.active_limit_orders[self.symbol])
        
    @patch('utils.lot_calculator.calculate_safe_lot', return_value=0.05)
    @patch('utils.price_qty_utils.get_symbol_config', return_value={
        "qty_step": 0.001,
        "min_qty": 0.001
    })
    def test_place_entry_orders_retry_on_failure(self, mock_get_symbol_config, mock_safe_lot):
        om = self.create_order_manager(dry_run=False)
        om.can_enter = MagicMock(return_value=True)
        om.evaluator.estimate_stoploss_usdt = MagicMock(return_value=1.5) 

        # 1回目は例外を投げる → 2回目は成功を返す（リトライ想定）
        om.place_market_order = MagicMock(side_effect=[
            {"retCode": -1},  # 1回目失敗（ExceptionではなくBybit APIエラー風）
            {"retCode": 0, "result": {"orderId": "retry-success", "avgPrice": 100.0}}  # 2回目成功
        ])
    
        with patch('core.order_manager.round_qty_to_minimum', side_effect=lambda symbol, qty: qty):
            entry_price = 100.0
            stop_ticks = 10
            tick_size = 0.1
            available_balance = 1000
    
            result = om.place_entry_orders(self.symbol, self.side, 1.0, entry_price, stop_ticks, tick_size, available_balance)
    
        # 2回目成功なので結果は成功のはず
        self.assertIn("market_order", result)
        self.assertEqual(result["market_order"]["result"]["orderId"], "retry-success")
    
        # place_market_order が2回呼ばれたことを検証
        self.assertEqual(om.place_market_order.call_count, 2)

    @patch('utils.lot_calculator.calculate_safe_lot', return_value=1.0)
    def test_place_entry_orders_exception_handling(self, mock_safe_lot):
        om = self.create_order_manager(dry_run=False)
        om.can_enter = MagicMock(return_value=True)

        # place_market_order が例外を出すがリトライはしない設計の場合のテスト
        om.client.place_market_order = MagicMock(side_effect=Exception("API error"))

        result = om.place_entry_orders(self.symbol, self.side, 1.0, 100, 10, 0.1, 1000)
    
        # 例外発生時は空辞書返却などを想定
        self.assertEqual(result, {})
    
    def test_round_qty_for_symbol_basic():
        # 例: BTCUSDTのstep=0.001、min=0.001、小数点3桁の場合
        symbol = "BTCUSDT"
        qty = 0.0004
        rounded = round_qty_for_symbol(symbol, qty)
        assert rounded >= 0.001  # 最小数量を下回らないこと

        qty = 0.00123
        rounded2 = round_qty_for_symbol(symbol, qty)
        # step単位かつ小数点3桁以下で丸められていること
        assert abs(rounded2 - 0.002) < 1e-6

    def test_handle_stoploss_failure_places_limit_orders(self):
        om = self.create_order_manager(dry_run=False)
        om.client.get_orderbook = MagicMock(return_value={
            "result": {
                "bids": [["100.0", 5]],
                "asks": [["101.0", 5]]
            }
        })
        om.client.get_last_price = MagicMock(return_value=100.5)
        om.client.place_limit_order = MagicMock(return_value={"retCode": 0, "result": {"orderId": "limit123"}})

        # モックで数量丸めもそのまま通す
        with patch('core.order_manager.round_qty_to_minimum', side_effect=lambda symbol, qty: qty):
            om.handle_stoploss_failure(self.symbol, "Buy", 1.0)

        # place_limit_orderが2回呼ばれたか検証
        self.assertEqual(om.client.place_limit_order.call_count, 2)

if __name__ == '__main__':
    unittest.main()
