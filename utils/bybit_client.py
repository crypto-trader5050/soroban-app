import os
import uuid
import time
import logging
import json
from datetime import datetime
from pybit.unified_trading import HTTP
from requests.exceptions import HTTPError
from requests.exceptions import RequestException
from utils.logger import logger, error_logger
from decimal import Decimal, ROUND_UP
from pybit.exceptions import InvalidRequestError
from utils.error_tracker import ApiErrorTracker

api_error_tracker = ApiErrorTracker()

logger = logging.getLogger(__name__)
error_logger = logging.getLogger("error")

def current_order_link_id(symbol: str) -> str:
    return f"auto_{symbol}_{int(time.time())}"

class BybitClient:
    def __init__(self, testnet: bool = True):
        self.testnet = testnet
        secrets_path = os.path.join("config", "secrets.test.env" if testnet else "secrets.prod.env")
        self._load_secrets(secrets_path)

        self.session = HTTP(
            testnet=self.testnet,
            api_key=self.api_key,
            api_secret=self.api_secret,
        )

    def _load_secrets(self, path: str):
        if not os.path.exists(path):
            raise FileNotFoundError(f"[ERROR] Secrets file not found: {path}")
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip() == "" or line.startswith("#"):
                    continue
                if "=" not in line:
                    logger.warning(f"[WARN] secretsファイルの不正な行をスキップ: {line.strip()}")
                    continue
                key, val = line.strip().split("=", 1)
                os.environ[key] = val

        self.api_key = os.getenv("BYBIT_API_KEY_TEST" if self.testnet else "BYBIT_API_KEY", "")
        self.api_secret = os.getenv("BYBIT_API_SECRET_TEST" if self.testnet else "BYBIT_API_SECRET", "")
        if not self.api_key or not self.api_secret:
            raise ValueError("[ERROR] APIキーまたはシークレットが設定されていません")

    def get_wallet_balance(self):
        try:
            resp = self.session.get_wallet_balance(accountType="UNIFIED")
            if resp.get("retCode", -1) == 0:
                return resp
            error_logger.warning(f"[WARN] get_wallet_balance異常レスポンス: {resp}")
        except HTTPError as http_err:
            error_logger.error(f"[HTTPError] get_wallet_balance: {http_err}")
        except Exception:
            error_logger.exception("[EXCEPTION] get_wallet_balance")
        return {"result": {"list": [{"coin": []}]}}

    def get_available_balance(self, coin: str = "USDT") -> float:
        resp = self.get_wallet_balance()
        logger.info(f"[BybitClient] get_wallet_balanceの生データ: {resp}")
        try:
            coins = resp.get("result", {}).get("list", [{}])[0].get("coin", [])
            logger.debug(f"[BybitClient] ウォレット内のコイン情報: {coins}")
            for c in coins:
                if c.get("coin") == coin:
                    balance = float(c.get("walletBalance", 0))
                    logger.info(f"[BybitClient] ✅ 利用可能残高取得: {coin} = {balance}")
                    return balance
            error_logger.warning(f"[BybitClient] 指定コイン {coin} の残高が見つかりません")
        except Exception:
            error_logger.exception("[EXCEPTION] get_available_balance")
        return 0.0

    def get_position(self, symbol: str):
        try:
            resp = self.session.get_positions(category="linear", symbol=symbol)
            if resp.get("retCode", -1) == 0:
                positions = resp.get("result", {}).get("list", [])
                if positions:
                    pos = positions[0]
                    size = float(pos.get("size", 0))
                    if size > 0:
                        logger.info(f"[{symbol}] 🔍 ポジション取得: side={pos.get('side')}, size={size}")
                        return pos
                logger.info(f"[{symbol}] 現在ポジションはなし")
                return None
            error_logger.warning(f"[WARN] get_position異常レスポンス: {resp}")
        except HTTPError as http_err:
            error_logger.error(f"[HTTPError] get_position ({symbol}): {http_err}")
        except Exception:
            error_logger.exception(f"[EXCEPTION] get_position ({symbol})")
        return None

    def get_current_price(self, symbol: str) -> float:
        ob = self.get_orderbook(symbol)
        try:
            bids = ob.get("result", {}).get("b", [])
            asks = ob.get("result", {}).get("a", [])
            if not bids or not asks:
                error_logger.warning(f"[WARN] 板情報なし: {symbol} → get_tickerで代替取得")
                ticker = self.get_ticker(symbol)
                price = ticker.get("lastPrice")
                return float(price) if price else 0.0
            return (float(bids[0][0]) + float(asks[0][0])) / 2
        except Exception as e:
            error_logger.error(f"[ERROR] get_current_price ({symbol}): {e}")
            return 0.0

    def get_orderbook(self, symbol: str):
        try:
            resp = self.session.get_orderbook(category="linear", symbol=symbol)
            if resp.get("retCode", -1) == 0:
                return resp
            error_logger.warning(f"[WARN] get_orderbook異常レスポンス: {resp}")
        except Exception:
            error_logger.exception(f"[EXCEPTION] get_orderbook ({symbol})")
        return {"result": {"b": [], "a": []}}

    def get_ticker(self, symbol: str) -> dict:
        try:
            res = self.session.get_tickers(category="linear", symbol=symbol)
            if res.get("retCode", -1) == 0:
                tickers = res.get("result", {}).get("list", [])
                return tickers[0] if tickers else {}
            error_logger.warning(f"[WARN] get_ticker異常レスポンス: {res}")
        except Exception:
            error_logger.exception(f"[EXCEPTION] get_ticker ({symbol})")
        return {}

    def place_market_order(self, symbol: str, side: str, qty: float, reduce_only: bool = False) -> dict:
        retries = 3
        delay = 1  # 秒

        for attempt in range(1, retries + 1):
            try:
                qty_rounded = self.round_qty_for_symbol(symbol, qty)

                res = self.session.place_order(
                    category="linear",
                    symbol=symbol,
                    side=side,
                    orderType="Market",
                    qty=qty_rounded,
                    timeInForce="IOC",
                    reduceOnly=reduce_only,
                    closeOnTrigger=False,
                    orderLinkId=current_order_link_id(symbol)
                )

                if res.get("retCode", -1) == 0:
                    logger.info(f"✅ Market注文成功: {symbol} {side} {qty_rounded}")
                    return res
                else:
                    error_logger.warning(
                        f"[WARN] Market注文失敗: {symbol} {side} {qty_rounded} → "
                        f"retCode={res.get('retCode')} retMsg={res.get('retMsg')} data={res.get('result')}"
                    )
                    api_error_tracker.report_error(symbol)

            except InvalidRequestError as e:
                error_logger.error(f"[Bybit API ERROR] {e}")
                if hasattr(e, "request_details"):
                    error_logger.debug(f"[Request Dump] {e.request_details}")
                api_error_tracker.report_error(symbol)

            except RequestException as e:
                error_logger.warning(f"[RETRYABLE ERROR] {symbol} {side} → {e}")

            except Exception:
                error_logger.exception(f"[EXCEPTION] place_market_order ({symbol}, {side})")

            if attempt < retries:
                logger.info(f"[Retry] Market注文再試行 {attempt}/{retries} for {symbol}")
                time.sleep(delay)

        logger.error(f"[FAILURE] Market注文全リトライ失敗: {symbol} {side}")
        return {
            "retCode": -1,
            "retMsg": "全リトライ失敗",
            "symbol": symbol,
            "qty": qty
        }

    def place_limit_order(self, symbol: str, side: str, qty: float, price: float, reduce_only: bool = False) -> dict:
        min_order_value = 6.5
        min_qty = MIN_QTY.get(symbol, 0.0)
        qty_step = min_qty

        order_value = qty * price
        if order_value < min_order_value:
            required_qty = min_order_value / price
            rounded_qty = ((required_qty + qty_step - 1e-8) // qty_step) * qty_step
            error_logger.warning(f"[ADJUST] 最低注文額未満 → 数量調整: {qty:.4f} → {rounded_qty:.4f} (価格: {price})")
            qty = round(rounded_qty, 6)
            
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                res = self.session.place_order(
                    category="linear",
                    symbol=symbol,
                    side=side,
                    orderType="Limit",
                    qty=qty,
                    price=price,
                    timeInForce="GTC",
                    reduceOnly=reduce_only,
                    closeOnTrigger=False,
                    orderLinkId=f"auto_{symbol}_{int(time.time())}"
                )
                if res.get("retCode", -1) == 0:
                    logger.info(f"✅ Limit注文成功: {symbol} {side} {qty} @ {price}")
                    return res
                else:
                    error_logger.warning(f"[WARN] Limit注文失敗: {symbol} {side} {qty} @ {price} → {res}")
            except Exception:
                error_logger.exception(f"[EXCEPTION] place_limit_order ({symbol}, {side}, {price}) - {attempt}回目リトライ")

            time.sleep(1)  # リトライ前に少し待つ

        logger.error(f"[LimitOrder最終失敗] {symbol} {side} {qty} @ {price}")
        return {}

    def cancel_order(self, symbol: str, order_id: str) -> dict:
        try:
            return self.session.cancel_order(category="linear", symbol=symbol, orderId=order_id)
        except Exception:
            error_logger.exception(f"[EXCEPTION] cancel_order ({symbol}, {order_id})")
            return {}

    def cancel_all_orders(self, symbol: str) -> dict:
        try:
            res = self.session.cancel_all_orders(category="linear", symbol=symbol)
            if res.get("retCode", -1) == 0:
                logger.info(f"全注文キャンセル成功: {symbol}")
            else:
                error_logger.warning(f"[WARN] 全注文キャンセル失敗: {symbol} → {res}")
            return res
        except Exception:
            error_logger.exception(f"[EXCEPTION] cancel_all_orders ({symbol})")
            return {}

    def set_margin_mode(self, symbol: str, mode: str = "ISOLATED", leverage: int = 10):
        if self.testnet:
            logger.info(f"テスト環境のため set_margin_mode() はスキップ: {symbol}")
            return {}
        try:
            margin_res = self.session.set_margin_mode(category="linear", symbol=symbol, tradeMode=1 if mode.upper() == "ISOLATED" else 0)
            if margin_res.get("retCode") != 0:
                error_logger.warning(f"[WARN] set_margin_mode失敗: {symbol} → {margin_res}")
                return margin_res
            leverage_res = self.session.set_leverage(category="linear", symbol=symbol, buyLeverage=str(leverage), sellLeverage=str(leverage))
            return leverage_res
        except Exception:
            error_logger.exception(f"[EXCEPTION] set_margin_mode ({symbol})")
            return {}

    def force_isolated_mode(self, symbol: str, leverage: int = 5):
        try:
            res_margin = self.session.switch_margin_mode(category="linear", symbol=symbol, tradeMode=1)
            if res_margin.get("retCode") != 0:
                error_logger.warning(f"[WARN] 分離マージン切替失敗: {symbol} → {res_margin}")
            else:
                logger.info(f"分離マージン切替成功: {symbol}")
            res_leverage = self.session.set_leverage(category="linear", symbol=symbol, buyLeverage=str(leverage), sellLeverage=str(leverage))
            if res_leverage.get("retCode") != 0:
                error_logger.warning(f"[WARN] レバレッジ設定失敗: {symbol} → {res_leverage}")
            else:
                logger.info(f"レバレッジ設定成功: {symbol} {leverage}倍")
        except Exception:
            error_logger.exception(f"[EXCEPTION] force_isolated_mode ({symbol})")

    def get_board_deviation(self, symbol: str, depth: int = 20) -> float:
        try:
            ob = self.get_orderbook(symbol)
            bids = ob.get("result", {}).get("b", [])
            asks = ob.get("result", {}).get("a", [])
            bid_qty = sum(float(b[1]) for b in bids[:depth])
            ask_qty = sum(float(a[1]) for a in asks[:depth])
            total = bid_qty + ask_qty
            if total == 0:
                return 0.0
            return round((bid_qty - ask_qty) / total * 100, 2)
        except Exception:
            error_logger.exception(f"[EXCEPTION] get_board_deviation ({symbol})")
            return 0.0

    def detect_reverse_large_order(self, symbol: str, direction: str, threshold_ratio: float = 0.005) -> bool:
        try:
            from utils.volume_stats import load_volume_data
            volume_dict = load_volume_data(symbol)
            if not volume_dict:
                return False
            threshold = volume_dict[symbol] * threshold_ratio
            trades = self.session.get_public_trading_history(category="linear", symbol=symbol, limit=50)
            if trades.get("retCode", -1) != 0:
                return False
            reverse_side = "Sell" if direction == "Buy" else "Buy"
            recent = trades.get("result", {}).get("list", [])
            total_vol = sum(float(t["qty"]) for t in recent if t.get("side") == reverse_side)
            if total_vol >= threshold:
                logger.info(f"逆方向大口検出: {symbol} {reverse_side} vol={total_vol:.2f}")
                return True
            return False
        except Exception:
            error_logger.exception(f"[EXCEPTION] detect_reverse_large_order ({symbol})")
            return False

def round_qty_for_symbol(symbol: str, qty: float) -> float:
    """
    シンボルごとのステップ・最小数量・桁数ルールに従って、ロット数量を切り上げで丸める。
    """
    min_qty = Decimal(str(MIN_QTY.get(symbol, 1)))
    step_size = Decimal(str(STEP_SIZE.get(symbol, 1))) 
    decimals = MAX_DECIMALS.get(symbol, 0)

    qty_dec = Decimal(str(qty))
    logger.debug(f"[round_qty] symbol={symbol} 入力qty={qty} (Decimal={qty_dec})")

    # ステップ単位で切り上げ
    rounded_qty = (qty_dec / step_size).to_integral_value(rounding=ROUND_UP) * step_size
    logger.debug(f"[round_qty] symbol={symbol} ステップ切り上げ後={rounded_qty}")

    # 最小数量未満を補正
    if rounded_qty < min_qty:
        logger.debug(f"[round_qty] symbol={symbol} 最小数量未満なので補正 min_qty={min_qty}")
        rounded_qty = min_qty

    # 桁数調整（ここは切り捨てでも良いですが、統一したければROUND_UPに）
    rounded_qty = rounded_qty.quantize(Decimal(f'1.{"0"*decimals}'), rounding=ROUND_UP)
    logger.debug(f"[round_qty] symbol={symbol} 桁数調整後={rounded_qty} (decimals={decimals})")

    return float(rounded_qty) if decimals > 0 else int(rounded_qty)

def load_symbols_from_cache(path="config/symbol_tick_cache.json") -> list[str]:
    """
    シンボルキャッシュから有効なシンボルリストを取得
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return list(data.keys())