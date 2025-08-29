import threading
import websocket
import json
import time
import ssl
from collections import deque
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class RealtimeOrderFlow(threading.Thread):
    def __init__(self, symbols: List[str]):
        super().__init__()
        self.symbols = symbols
        self.ws_url = "wss://stream.bybit.com/v5/public/linear"
        self.ws = None
        self.lock = threading.Lock()
        self.running = False

        self.recent_trades: Dict[str, deque] = {sym: deque(maxlen=1000) for sym in symbols}
        self.last_trade_time: Dict[str, float] = {sym: 0.0 for sym in symbols}

    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            topic = data.get("topic", "")
            if topic.startswith("publicTrade."):
                symbol = topic.split(".")[1]
                trades = data.get("data", [])

                with self.lock:
                    for trade in trades:
                        self.recent_trades[symbol].append(trade)
                    self.last_trade_time[symbol] = time.time()

                logger.debug(f"[{symbol}] 📥 WebSocket 成行注文受信: {len(trades)}件")
        except Exception as e:
            logger.exception("❌ WebSocket on_message 処理中に例外")

    def on_error(self, ws, error):
        logger.error(f"WebSocket error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        logger.warning(f"WebSocket closed: code={close_status_code}, msg={close_msg}")

    def on_open(self, ws):
        print("<<< on_open() CALL >>>")  # ★追加
        logger.info("✅ WebSocket接続成功。購読チャネル送信中...")
        try:
            logger.info(f"📌 購読対象: {self.symbols}")
            subscribe_args = [f"publicTrade.{sym}" for sym in self.symbols]
            subscribe_msg = {
                "op": "subscribe",
                "args": subscribe_args
            }
            ws.send(json.dumps(subscribe_msg))
            logger.info(f"📨 サブスクライブ送信済: {subscribe_msg}")
        except Exception as e:
            logger.error(f"❌ サブスクライブ送信失敗: {e}")

    def run(self):
        self.running = True
        while self.running:
            try:
                self.ws = websocket.WebSocketApp(
                    self.ws_url,
                    on_open=self.on_open,
                    on_message=self.on_message,
                    on_error=self.on_error,
                    on_close=self.on_close
                )
                logger.info("🛰️ WebSocketApp 起動中...")
                self.ws.run_forever(
                    ping_interval=20,
                    ping_timeout=10,
                    sslopt={"cert_reqs": ssl.CERT_NONE}  # ← ここが重要！
                )
            except Exception as e:
                logger.exception("❌ WebSocketApp 起動中に例外発生")

            if self.running:
                logger.warning("WebSocket切断。5秒後に再接続します。")
                time.sleep(5)

    def stop(self):
        self.running = False
        if self.ws:
            try:
                self.ws.close()
            except Exception as e:
                logger.warning(f"WebSocket close 失敗: {e}")

    def get_recent_trades(self, symbol: str) -> List[dict]:
        with self.lock:
            return list(self.recent_trades.get(symbol, []))

    def get_last_trade_time(self, symbol: str) -> float:
        with self.lock:
            return self.last_trade_time.get(symbol, 0.0)

    def reconnect_if_needed(self, timeout_sec: int = 10):
        now = time.time()
        with self.lock:
            for sym, last_time in self.last_trade_time.items():
                if now - last_time > timeout_sec:
                    logger.warning(f"[{sym}] 受信が {timeout_sec}秒以上停止。再接続をトリガー")
                    self._trigger_reconnect()
                    break

    def _trigger_reconnect(self):
        if self.ws:
            try:
                if self.ws.sock and self.ws.sock.connected:
                    self.ws.close()
                    logger.info("🔄 WebSocket 再接続を試みます")
                else:
                    logger.warning("⚠️ WebSocket は既に閉じられています")
            except Exception as e:
                logger.error(f"WebSocket close 時に例外: {e}")
                
    def get_recent_market_order_volume(self, symbol: str, side: str, window_sec: float = 1.0) -> float:
        """
        symbol の recent_trades から直近 window_sec 秒以内の
        指定 side ('Buy' or 'Sell') の成行注文量を合計して返す。
        """
        now = time.time()
        volume = 0.0
        with self.lock:
            for trade in self.recent_trades.get(symbol, []):
                # Bybit のトレード情報に timestamp が 'T' フィールドでms単位で入っている想定
                trade_time = trade.get("T", 0) / 1000
                if trade_time >= now - window_sec and trade.get("S") == side:
                    volume += float(trade.get("v", 0))
        return volume
