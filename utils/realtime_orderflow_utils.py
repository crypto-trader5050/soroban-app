# utils/realtime_orderflow_utils.py

# グローバル変数として保持
orderflow_monitor = None

def set_orderflow_monitor(monitor):
    """OrderFlowMonitor のインスタンスをグローバルに保持"""
    global orderflow_monitor
    orderflow_monitor = monitor

def get_orderflow_monitor():
    """保持している OrderFlowMonitor インスタンスを返す"""
    return orderflow_monitor

def get_recent_market_order_volume(symbol: str, side: str, window_sec: int = 2) -> float:
    """
    現在の orderflow_monitor を用いて直近のマーケット注文の出来高を取得
    """
    monitor = get_orderflow_monitor()
    if monitor is None:
        raise RuntimeError("orderflow_monitor が未設定です")
    return monitor.get_recent_volume(symbol, side, within_sec=window_sec)