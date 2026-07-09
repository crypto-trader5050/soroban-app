import logging
import pytest
import unittest
from unittest.mock import MagicMock, patch
import time
from utils.bybit_client import MIN_QTY, TICK_SIZES
from core.order_manager import OrderManager
from core.position_manager import PositionManager
from unittest.mock import MagicMock

def fake_place_stop_loss_order(*args, **kwargs):
    print("[DEBUG] place_stop_loss_order called with:", args, kwargs)
    return {"retCode": 0}

class TestPositionManager(unittest.TestCase):
    def setUp(self):
        self.mock_order_manager = MagicMock()
        self.mock_order_manager.place_stop_loss_order.side_effect = fake_place_stop_loss_order
        self.mock_client = MagicMock()
        self.mock_redis = MagicMock()
        self.symbol = "BTCUSDT"

        self.pm = PositionManager(
            client=self.mock_client,
            symbol=self.symbol,
            order_manager=self.mock_order_manager,
            redis_client=self.mock_redis
        )
        self.pm.active = True
        self.pm.quantity = 1.0  # デフォルトロット
        self.pm._get_position_size = MagicMock(return_value=1.0)
        self.pm.trailing_active = False

    def test_trailing_stop_triggered(self):
        self.pm.entry_price = 100.0
        self.pm.highest_price = 104.0  # +4%
        self.pm.side = "Buy"

        with patch.object(self.pm, '_retry_api_call', return_value=101.0):
            self.pm._check_price_trail()

        self.mock_order_manager.place_stop_loss_order.assert_called_once_with(
            symbol=self.symbol,
            side="Sell",
            qty=1.0,
            trigger_reason="トレーリングストップ"  # ✅ 実装と一致させた
        )
        self.assertFalse(self.pm.active)

    def test_limit_order_cancel_due_to_deviation(self):
        self.pm.side = "Buy"
        self.pm.active = True
        self.pm.active_limit_orders = {"order1": time.time() - 3, "order2": time.time() - 5}
        self.pm.limit_order_timestamps = self.pm.active_limit_orders.copy()

        with patch.object(self.pm, '_retry_api_call', side_effect=[100.0, 0.01]):  # price, deviation < 3.5%
            self.pm._check_limit_order_cancel()

        self.mock_order_manager.cancel_order.assert_any_call(self.symbol,"order1")
        self.mock_order_manager.cancel_order.assert_any_call(self.symbol,"order2")
        self.assertEqual(self.mock_order_manager.cancel_order.call_count, 2)
        
    def test_stop_resets_state(self):
        # 事前に各状態変数をセット
        self.pm.entry_price = 100.0
        self.pm.highest_price = 105.0
        self.pm.lowest_price = 95.0
        self.pm.side = "Buy"
        self.pm.quantity = 2.0
        self.pm.trigger_condition = "test_trigger"
        self.pm.active_limit_orders = {"order1": 100.5}
        self.pm.limit_order_timestamps = {"order1": time.time()}
        self.pm.active = True

        # stop() 実行
        self.pm.stop()

        # 状態がリセットされていることを確認
        self.assertFalse(self.pm.active)
        self.assertIsNone(self.pm.entry_price)
        self.assertIsNone(self.pm.highest_price)
        self.assertIsNone(self.pm.lowest_price)
        self.assertIsNone(self.pm.side)
        self.assertIsNone(self.pm.quantity)
        self.assertEqual(self.pm.trigger_condition, "")
        self.assertEqual(self.pm.active_limit_orders, {})
        self.assertEqual(self.pm.limit_order_timestamps, {})

        # Redis.set がクールダウンキーで呼ばれていることを確認
        self.pm.redis.set.assert_called_once()
        cooldown_key, _, ex_arg = self.pm.redis.set.call_args[0][0], self.pm.redis.set.call_args[0][1], self.pm.redis.set.call_args[1].get("ex", None)
        self.assertIn("cooldown:", cooldown_key)
        self.assertEqual(ex_arg, 30)  # もし ex=30 秒を設定しているなら        

    def test_reverse_flow_exit_triggers_stop_loss(self):
        self.pm.entry_price = 100.0
        self.pm.side = "Buy"
        self.pm.quantity = 1.0

        with patch.object(self.pm, '_retry_api_call', side_effect=[
            100.2,   # price
            1.5,     # deviation (3.5%未満)
            True     # detect_reverse_large_order
        ]), patch('core.position_manager.is_reverse_large_order_triggered', return_value=True):
            with patch('utils.trade_logger.log_trade_result'), \
                patch('utils.summary_manager.log_performance_summary'):
                self.pm._check_reverse_flow_exit()

        self.mock_order_manager.place_stop_loss_order.assert_called_once_with(
            symbol=self.symbol,
            side="Sell",
            qty=1.0,
            trigger_reason="逆方向大口成行"
        )
        self.assertFalse(self.pm.active)

    def test_drawdown_exit(self):
        self.pm.entry_price = 100.0
        self.pm.side = "Buy"
        self.pm.quantity = 1.0
        self.mock_redis.get.return_value = "100"  # 総資産100ドル

        with patch.object(self.pm, '_retry_api_call', return_value=98.0):
            with patch('utils.trade_logger.log_trade_result'), \
                patch('utils.summary_manager.log_performance_summary'):
                self.pm._check_drawdown_exit()

        self.mock_order_manager.place_stop_loss_order.assert_called_once()
        self.assertFalse(self.pm.active)

    def test_timeout_exit(self):
        self.pm.entry_price = 100.0
        self.pm.entry_time = time.time() - 65
        self.pm.side = "Buy"
        self.pm.quantity = 1.0

        with patch.object(self.pm, '_retry_api_call', return_value=99.0):
            with patch('utils.trade_logger.log_trade_result'), \
                patch('utils.summary_manager.log_performance_summary'):
                self.pm._check_timeout_exit()

        self.mock_order_manager.place_stop_loss_order.assert_called_once()
        self.assertFalse(self.pm.active)

    def test_additional_stop_loss_by_redis_failure(self):
        self.pm.entry_price = 100.0
        self.pm.side = "Buy"
        self.pm.quantity = 1.0
        self.pm.redis_error_count = 3  # 閾値に達している

        with patch.object(self.pm, '_retry_api_call', return_value=95.0):
            with patch('utils.trade_logger.log_trade_result'), \
                patch('utils.summary_manager.log_performance_summary'):
                self.pm._check_additional_stop_loss()

        self.mock_order_manager.place_stop_loss_order.assert_called_once()
        self.assertFalse(self.pm.active)

    def fake_place_stop_loss_order(*args, **kwargs):
        print("[DEBUG] place_stop_loss_order called with:", args, kwargs)
        return True

    def test_additional_stop_loss_by_api_failure(self):
        self.pm.entry_price = 100.0
        self.pm.side = "Buy"
        self.pm.quantity = 1.0
        self.pm.api_error_count = 3  # 閾値に達している
        self.pm.active = True

        mock_om = MagicMock()
        mock_om.place_stop_loss_order.side_effect = fake_place_stop_loss_order
        self.pm.order_manager = mock_om

        with patch.object(self.pm, '_retry_api_call', return_value=96.0), \
            patch('utils.trade_logger.log_trade_result'), \
            patch('utils.summary_manager.log_performance_summary'):
                
            self.pm._check_additional_stop_loss()

        mock_om.place_stop_loss_order.assert_called_once()
        self.assertFalse(self.pm.active)

    def test_trailing_stop_not_triggered_if_already_active(self):
        self.pm.entry_price = 100.0
        self.pm.highest_price = 104.0
        self.pm.side = "Buy"
        self.pm.trailing_active = True  # すでにトレーリング有効

        with patch.object(self.pm, '_retry_api_call', return_value=101.0):
            self.pm._check_price_trail()

        # 新たに損切り注文が出ないこと
        self.mock_order_manager.place_stop_loss_order.assert_not_called()

    def test_position_size_fetch_failure_graceful_exit(self):
        self.pm.entry_price = 100.0
        self.pm.side = "Buy"
        self.pm._get_position_size.side_effect = Exception("Size fetch failed")

        with patch('core.position_manager.logger') as mock_logger:
            self.pm._check_drawdown_exit()

        # ログにエラー出力されること
        mock_logger.exception.assert_called_once()

    def test_calculate_entry_lot_min_qty(self):
        om = OrderManager(client=MagicMock(), redis=MagicMock())
        symbol = "BTCUSDT"
        stop_ticks = 100  # 仮の損切幅
        tick_size = 0.1
        stop_loss_usdt = stop_ticks * tick_size  # $10
        balance = 100  # USDT

        lot = om.calculate_entry_lot(symbol, stop_ticks, tick_size, balance)
        min_qty = MIN_QTY[symbol]
        assert lot >= min_qty, f"Lot {lot} should not be less than min_qty {min_qty}"

    def test_calculate_entry_lot_within_balance(self):
        om = OrderManager(client=MagicMock(), redis=MagicMock())
        symbol = "BTCUSDT"
        stop_ticks = 100
        tick_size = 0.1
        stop_loss_usdt = stop_ticks * tick_size  # $10
        balance = 100  # USDT

        lot = om.calculate_entry_lot(symbol, stop_ticks, tick_size, balance)
        risk_amount = balance * 0.005  # 0.5%
        actual_loss = lot * stop_loss_usdt
        assert actual_loss <= risk_amount + 1e-6, f"損失がリスク許容量を超えています: {actual_loss} > {risk_amount}"

    def test_stop_loss_order_failure_logs_error(self, caplog):
        mock_client = MagicMock()
        mock_client.place_order.side_effect = Exception("API Error")
        om = OrderManager(client=mock_client, redis=MagicMock())

        with caplog.at_level("ERROR"):
            result = om.place_stop_loss_order(
                symbol="BTCUSDT",
                side="Sell",
                quantity=0.01,
                entry_price=30000,
                stop_ticks=50,
                tick_size=0.1
            )

        assert result is False
        assert any("API Error" in record.message for record in caplog.records)

    def test_redis_set_failure_handled_gracefully(self, caplog):
        mock_redis = MagicMock()
        mock_redis.set.side_effect = Exception("Redis Down")
        mock_client = MagicMock()
        om = OrderManager(client=mock_client, redis=mock_redis)

        with caplog.at_level("ERROR"):
            om._check_drawdown_exit("BTCUSDT", "Buy", 30000, 0.01)

        assert any("Redis Down" in record.message for record in caplog.records)
        
if __name__ == '__main__':
    unittest.main()