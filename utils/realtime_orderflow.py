import asyncio  
import json
import os
import logging
import websockets
import aiohttp 
from collections import defaultdict, deque
from typing import Dict, Deque, List
from datetime import datetime, timezone  # ← timezone を追加インポート

logger = logging.getLogger(__name__)

class RealtimeOrderFlow:
    def __init__(self, symbols: List[str], volume_data_dir: str = "data/avg_volume"):
        self.symbols = symbols
        self.orderflow_data: Dict[str, Deque[Dict]] = defaultdict(lambda: deque(maxlen=500))
        self.avg_volumes: Dict[str, Dict[str, float]] = {}
        self.ws_url = "wss://stream.bybit.com/v5/public/linear"
        self.volume_data_dir = volume_data_dir
        self._load_avg_volumes()

    def _load_avg_volumes(self):
        for symbol in self.symbols:
            file_path = os.path.join(self.volume_data_dir, f"{symbol}.json")
            try:
                with open(file_path, "r") as f:
                    self.avg_volumes[symbol] = json.load(f)
                logger.info(f"[VolumeLoad] {symbol} 平均出来高読み込み成功")
            except Exception as e:
                logger.warning(f"[VolumeLoad] {symbol} 読み込み失敗: {e}")
                self.avg_volumes[symbol] = {}

    async def connect(self):
        while True:
            try:
                async with websockets.connect(self.ws_url, ping_interval=20) as ws:
                    await self.subscribe(ws)
                    async for message in ws:
                        await self.handle_message(message)
            except Exception as e:
                logger.error(f"[WebSocket] エラー発生: {e} - 5秒後に再接続")
                await asyncio.sleep(5)

    async def subscribe(self, ws):
        params = [{"channel": "publicTrade", "symbol": sym} for sym in self.symbols]
        subscribe_msg = {
            "op": "subscribe",
            "args": params
        }
        await ws.send(json.dumps(subscribe_msg))
        logger.info(f"[WebSocket] 購読リクエスト送信: {params}")

    async def handle_message(self, message):
        try:
            data = json.loads(message)
            if "topic" in data and "data" in data:
                symbol = data["topic"].split(".")[1]
                now = datetime.now(timezone.utc).timestamp()  # ← 修正
                
                for trade in data["data"]:
                    side = trade["S"]  # 'Buy' or 'Sell'
                    volume = float(trade["v"])
                    timestamp = trade.get("T", int(now * 1000)) / 1000

                    self.orderflow_data[symbol].append({
                        "timestamp": timestamp,
                        "side": side,
                        "volume": volume
                    })

                # 古いデータ削除（1秒以上前）
                cutoff = now - 1
                original_len = len(self.orderflow_data[symbol])
                self.orderflow_data[symbol] = deque(
                    [d for d in self.orderflow_data[symbol] if d["timestamp"] >= cutoff], maxlen=500
                )
                pruned = original_len - len(self.orderflow_data[symbol])
                if pruned:
                    logger.debug(f"[{symbol}] {pruned}件の古い注文を削除")

        except json.JSONDecodeError:
            logger.warning("[WebSocket] JSONデコード失敗")
        except Exception as e:
            logger.error(f"[WebSocket] メッセージ処理エラー: {e}")

    def get_recent_volume(self, symbol: str, side: str, within_sec: float = 1.0) -> float:
        now = datetime.now(timezone.utc).timestamp()  # ← 修正
        volume = sum(
            trade["volume"]
            for trade in self.orderflow_data[symbol]
            if trade["side"] == side and trade["timestamp"] >= now - within_sec
        )
        logger.debug(f"[{symbol}] {side}成行出来高(直近{within_sec}s): {volume:.2f}")
        return volume

    def get_recent_volume_total(self, symbol: str, within_sec: float = 1.0) -> float:
        now = datetime.now(timezone.utc).timestamp()  # ← 修正
        volume = sum(
            trade["volume"]
            for trade in self.orderflow_data[symbol]
            if trade["timestamp"] >= now - within_sec
        )
        logger.debug(f"[{symbol}] 総成行出来高(直近{within_sec}s): {volume:.2f}")
        return volume

    def is_large_market_order(self, symbol: str, side: str, threshold_rate: float = 0.005) -> bool:
        avg_volume = self._get_avg_volume(symbol)
        if avg_volume is None:
            logger.warning(f"[{symbol}] 平均出来高データなし")
            return False

        recent_volume = self.get_recent_volume(symbol, side)
        is_large = recent_volume >= avg_volume * threshold_rate
        logger.info(f"[{symbol}] {side}側の大口判定: recent={recent_volume:.2f} / threshold={avg_volume * threshold_rate:.2f} => {is_large}")
        return is_large

    def is_strong_large_order(self, symbol: str, side: str, threshold_rate: float = 0.012) -> bool:
        avg_volume = self._get_avg_volume(symbol)
        if avg_volume is None:
            return False
        recent_volume = self.get_recent_volume(symbol, side)
        return recent_volume >= avg_volume * threshold_rate

    def check_large_market_order(self, symbol: str, threshold_rate: float = 0.005) -> str:
        if self.is_large_market_order(symbol, "Buy", threshold_rate):
            return "Buy"
        if self.is_large_market_order(symbol, "Sell", threshold_rate):
            return "Sell"
        return ""

    def _get_avg_volume(self, symbol: str) -> float:
        now = datetime.now(timezone.utc)  # ← 修正
        time_key = now.strftime("%H:%M")
        volume = self.avg_volumes.get(symbol, {}).get(time_key)
        if volume is None:
            logger.debug(f"[{symbol}] {time_key} の平均出来高が見つかりません")
        return volume

    def get_recent_trades(self, symbol: str) -> list:
        """指定シンボルの直近のトレード情報を返す（時系列ソート済）"""
        return list(self.orderflow_data[symbol])

    def run(self):
        asyncio.run(self.connect())
        
    async def fetch_recent_ohlcv(self, symbol: str, interval: str = "1", limit: int = 2) -> List[Dict[str, float]]:
        """
        Bybitから指定シンボルのローソク足を取得する（高・安・終値 含む）
        interval: "1" = 1分足
        """
        url = f"https://api.bybit.com/v5/market/kline?category=linear&symbol={symbol}&interval={interval}&limit={limit}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    res = await resp.json()
                    if res["retCode"] != 0:
                        logger.warning(f"[{symbol}] OHLCV取得失敗: {res}")
                        return []

                    candles = res["result"]["list"]  # 最新が最後
                    ohlcv = [
                        {
                            "timestamp": int(c[0]) / 1000,
                            "open": float(c[1]),
                            "high": float(c[2]),
                            "low": float(c[3]),
                            "close": float(c[4]),
                            "volume": float(c[5])
                        }
                        for c in candles
                    ]
                    return ohlcv
        except Exception as e:
            logger.error(f"[{symbol}] OHLCV取得中の例外: {e}")
            return []

# 🔽 グローバルに共有されるインスタンス（main.py などで初期化されていると仮定）
orderflow_monitor: RealtimeOrderFlow = None  # 外部でセットする前提

def get_recent_market_order_volume(symbol: str, side: str, window_sec: int = 2) -> float:
    """
    RealtimeOrderFlow のグローバルインスタンスから、指定期間内の成行注文量を取得

    Parameters:
        - symbol: 例 "BTCUSDT"
        - side: "Buy" or "Sell"
        - window_sec: 集計する秒数

    Returns:
        - 成行注文の合計ボリューム
    """
    if orderflow_monitor is None:
        raise RuntimeError("orderflow_monitor が初期化されていません")
    return orderflow_monitor.get_recent_volume(symbol, side, within_sec=window_sec)
