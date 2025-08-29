# config/settings.py
import os
from dotenv import load_dotenv

# 実行環境を切り替える（test or prod）
env_file = 'secrets.test.env' if os.getenv("ENV_TYPE", "test") == "test" else 'secrets.prod.env'
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), env_file))

# 値の取得例
ENV_NAME = os.getenv("ENV_NAME")
BYBIT_API_KEY = os.getenv("BYBIT_API_KEY")
BYBIT_API_SECRET = os.getenv("BYBIT_API_SECRET")
BYBIT_BASE_URL = os.getenv("BYBIT_BASE_URL")
VOLUME_SAVE_DIR = os.getenv("VOLUME_SAVE_DIR")
TARGET_SYMBOLS = os.getenv("TARGET_SYMBOLS").split(",")
VOLUME_DAYS = int(os.getenv("VOLUME_DAYS"))
USE_FORCE_ENTRY = os.getenv("USE_FORCE_ENTRY", "false").lower() == "true"

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# ✅ テスト環境かどうかの判定
ENV_TYPE = os.getenv("ENV_TYPE", "test")  # "test" or "prod"
USE_FIXED_BALANCE = ENV_TYPE == "test"
FIXED_TEST_BALANCE = float(os.getenv("FIXED_TEST_BALANCE", 1500.0)) if USE_FIXED_BALANCE else 0.0

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
GOOGLE_WORKSHEET_NAME = os.getenv("GOOGLE_SHEET_WORKSHEET")