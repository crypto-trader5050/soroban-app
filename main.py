import sys
import os
import time
import asyncio
import threading
from datetime import datetime
import pytz
import redis
from dotenv import load_dotenv

load_dotenv("config/secrets.test.env")

from utils.logger import logger

FIXED_TEST_BALANCE_STR = os.getenv("FIXED_TEST_BALANCE", "")
try:
    FIXED_TEST_BALANCE = float(FIXED_TEST_BALANCE_STR) if FIXED_TEST_BALANCE_STR else 0.0
except ValueError:
    logger.error(f"FIXED_TEST_BALANCE の値が不正です: {FIXED_TEST_BALANCE_STR}")
    FIXED_TEST_BALANCE = 0.0

if FIXED_TEST_BALANCE > 0:
    logger.info(f"⚙️ テスト用固定残高を使用: {FIXED_TEST_BALANCE} USDT")
else:
    logger.info("⚙️ 実口座残高を使用します")

# パス解決
sys.path.append(os.path.abspath(os.path.dirname(__file__)))        # main.pyのあるディレクトリ
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "core")))  # coreフォルダ

# モジュール読み込み
from config import settings
from config.strategy_version import STRATEGY_VERSION
from utils.bybit_client import BybitClient
from utils.volume_stats import init_volume_data, load_volume_data, update_all_symbols_avg_volume
from core.order_flow_monitor import RealtimeOrderFlow
from core.entry_conditions import EntryConditionEvaluator
from core.symbol_monitor import SymbolMonitor
from core.order_manager import OrderManager
from core.position_manager import PositionManager
from utils.summary_manager import generate_summary_report
from utils.news_filter import load_news_schedule_from_gsheet, is_in_blackout_period
from utils import realtime_orderflow_utils
from config.settings import GSHEET_ID, WORKSHEET_NAME
from utils.news_schedule_manager import NewsScheduleManager
from utils.bybit_client import load_symbols_from_cache

symbols = load_symbols_from_cache()

# 起動ログ
logger.info(f"🔧 Starting crypto_bot in {settings.ENV_NAME.upper()} environment.")
logger.info(f"📌 戦略バージョン: {STRATEGY_VERSION}")

GSHEET_ID = "1aKrZEnd1tqvroerR35vyYVmJ9kk536bSxV65b0EYojA"
WORKSHEET_NAME = "CryptoBot_NewsSchedule"
NEWS_SCHEDULE = load_news_schedule_from_gsheet(GSHEET_ID)
logger.info(f"📰 Google Sheetsからニューススケジュール取得完了: {len(NEWS_SCHEDULE)}件")

# Redis接続
try:
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True
    )
    redis_client.ping()
    logger.info("🧠 Redis接続成功")
except redis.ConnectionError as e:
    logger.error(f"❌ Redis接続失敗: {e}")
    sys.exit(1)

# Bybitクライアント初期化
client = BybitClient(testnet=(settings.ENV_NAME == "test"))
SYMBOLS = settings.TARGET_SYMBOLS
logger.info(f"📦 対象通貨: {SYMBOLS}")

# マージンモード（アイソレート強制）
def enforce_isolated_mode():
    for symbol in SYMBOLS:
        try:
            client.set_margin_mode(symbol=symbol, mode="ISOLATED", leverage=10)
            time.sleep(0.2)
        except Exception as e:
            logger.error(f"[{symbol}] マージンモード設定失敗: {e}")

enforce_isolated_mode()

# 出来高データの準備
def prepare_avg_volumes(symbols):
    logger.info("📊 出来高データの初期化確認...")
    missing = [s for s in symbols if not os.path.exists(f"data/avg_volume/{s}.json")]
    if missing:
        logger.info(f"⏳ 不足データあり: {missing} → APIから取得中")
        init_volume_data(missing)
    avg_volumes = {symbol: load_volume_data(symbol) for symbol in symbols}
    logger.info("✅ 出来高データ読込完了")
    return avg_volumes

update_all_symbols_avg_volume(SYMBOLS)
avg_volumes = prepare_avg_volumes(SYMBOLS)

# RealtimeOrderFlow を非同期で起動
orderflow_monitor = RealtimeOrderFlow(SYMBOLS)

# 🔧 ここで orderflow_monitor をユーティリティに登録
realtime_orderflow_utils.set_orderflow_monitor(orderflow_monitor)

def run_orderflow_ws():
    orderflow_monitor.start()

threading.Thread(target=run_orderflow_ws, daemon=True, name="RealtimeOrderFlowThread").start()
logger.info("🧬 RealtimeOrderFlow WebSocket監視スレッド起動")

# エントリー条件評価インスタンス
entry_evaluator = EntryConditionEvaluator(
    avg_volumes=avg_volumes,
    orderflow=orderflow_monitor
)

# 🔽 ここに追加する！
entry_evaluator.force_entry = settings.USE_FORCE_ENTRY
if settings.USE_FORCE_ENTRY:
    logger.warning("⚠️ 強制エントリーモードが有効です。テスト用途以外で使わないでください。")

# 注文マネージャ
order_manager = OrderManager(client, evaluator=entry_evaluator)

# ポジションマネージャ
position_managers = {
    symbol: PositionManager(
        client=client,
        symbol=symbol,
        order_manager=order_manager,
        redis_client=redis_client
    ) for symbol in SYMBOLS
}

# → OrderManagerにPositionManagerを渡す
order_manager.position_managers = position_managers

# PositionManager監視スレッド
for pm in position_managers.values():
    threading.Thread(target=pm.monitor, daemon=True, name=f"PM_{pm.symbol}").start()
logger.info("📱 全PositionManager監視スレッド起動")

# SymbolMonitor 準備
monitor = SymbolMonitor(
    client=client,
    symbols=SYMBOLS,
    entry_evaluator=entry_evaluator,
    news_schedule=NEWS_SCHEDULE,
    redis_client=redis_client,
    order_manager=order_manager,
    order_flow_monitor=orderflow_monitor,
    fixed_test_balance=FIXED_TEST_BALANCE,
)
logger.info("🎯 SymbolMonitor初期化完了")

# API接続確認
logger.info("🔌 API接続確認中...")
try:
    client.get_wallet_balance()  # 内部キャッシュ更新
    available_balance = client.get_available_balance("USDT")
    logger.info(f"💰 Wallet USDT残高: {available_balance}")

    for symbol in SYMBOLS[:2]:
        pos = client.get_position(symbol=symbol)
        logger.info(f"📦 Position for {symbol}: {pos}")
except Exception as e:
    logger.exception(f"❌ API接続失敗: {e}")
    sys.exit(1)

# 日次・週次レポート
def run_scheduled_summary():
    now = datetime.now(tz=pytz.UTC)
    if now.hour == 3 and now.minute == 0:
        log_file_path = f"logs/summary_{now.strftime('%Y_%m_%d')}.log"
        if os.path.exists(log_file_path):
            logger.info("🗕️ 自動レポート出力実行中 (daily & weekly)")
            generate_summary_report(log_file_path, mode="daily")
            generate_summary_report(log_file_path, mode="weekly")
        else:
            logger.warning(f"❗ 指定ログが存在しないためレポートスキップ: {log_file_path}")
        
async def main():
    logger.info("🚀 リアルタイム監視開始")

    news_manager = NewsScheduleManager(sheet_id=GSHEET_ID, worksheet_name=WORKSHEET_NAME, refresh_interval_sec=300)

    # 初回ロードをawaitして待つ
    news_manager.news_schedule = await news_manager._load_schedule()

    # 以降はバックグラウンドで定期更新を開始
    asyncio.create_task(news_manager.start())

    await main_loop(news_manager)


# ✅ 既存のロジックはそのまま、news_manager 経由でスケジュールを取得
async def main_loop(news_manager: NewsScheduleManager):
    try:
        while True:
            now = datetime.now(pytz.utc)

            run_scheduled_summary()

            # ← 🔄 NEWS_SCHEDULE を news_manager から動的に取得
            news_schedule = news_manager.get_schedule()
            if is_in_blackout_period(now, news_schedule):
                logger.info("🕒 Blackout期間中 → エントリー停止")
                await asyncio.sleep(1)
                continue

            balance_data = client.get_wallet_balance()
            available_balance = FIXED_TEST_BALANCE if FIXED_TEST_BALANCE > 0 else client.get_available_balance("USDT")

            for symbol in SYMBOLS:
                try:
                    ticker = client.get_ticker(symbol)
                    current_price = float(ticker["lastPrice"])
                except Exception as e:
                    logger.error(f"[{symbol}] 現価格取得失敗: {e}")
                    continue

                executed, detail = await monitor.execute_entry_if_applicable(
                    symbol,
                    return_detail=True,
                    current_price=current_price,
                    available_balance=available_balance
                )

                if executed:
                    logger.info(f"✅ {symbol} エントリー成功 → 理由: {detail}")
                else:
                    logger.debug(f"❌ {symbol} 見送り → 理由: {detail}")

            await asyncio.sleep(1)

    except KeyboardInterrupt:
        logger.info("🚩 手動停止 → Bot終了します。")
    except Exception as e:
        logger.exception(f"🔥 致命的エラー: {e}")


# ✅ エントリーポイント
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 停止されました")