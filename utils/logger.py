import logging 
import os
import sys
import atexit
from logging.handlers import RotatingFileHandler
from datetime import datetime

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)


def setup_logger(
    name: str,
    log_file: str,
    level: int = logging.INFO,
    max_bytes: int = 5 * 1024 * 1024,
    backup_count: int = 3,
    stream: bool = True
) -> logging.Logger:
    """
    ロガーを作成（ファイル + コンソール、ローテーション付き）
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    if logger.hasHandlers():
        return logger

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_path = os.path.join(LOG_DIR, log_file)
    file_handler = RotatingFileHandler(
        file_path, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # sys.stdout が閉じていないときのみ console handler を追加
    if stream:
        try:
            if sys.stdout and not sys.stdout.closed:
                console_handler = logging.StreamHandler(sys.stdout)
                console_handler.setLevel(level)
                console_handler.setFormatter(formatter)
                logger.addHandler(console_handler)
        except Exception:
            pass

    return logger


# ===================== 🔔 ロガー定義一覧（7分類） =====================

# ① システム全体ログ
logger = setup_logger(name="crypto_bot", log_file="crypto_bot.log")

# ② 実エントリー・決済ログ（trades_YYYY_MM_DD.log）
execution_logger = setup_logger(
    name="execution_logger",
    log_file=f"trades_{datetime.now().strftime('%Y_%m_%d')}.log"
)

# ③ ポジションログ
position_logger = setup_logger(name="position_logger", log_file="positions.log", stream=False)

# ④ エントリー条件ログ
entry_logger = setup_logger(name="entry_logger", log_file="entry_conditions.log", stream=False)

# ⑤ API・通信エラーなど
error_logger = setup_logger(name="error_logger", log_file="execution_errors.log", stream=False)

# ⑥ 約定ログ
fills_logger = setup_logger(name="fills_logger", log_file="fills.log", stream=False)

# ⑦ 日次・週次サマリー
summary_logger = setup_logger(name="summary_logger", log_file="performance_summary.log", stream=False)

# 🔚 Python 終了時にすべてのハンドラを安全に閉じる
atexit.register(logging.shutdown)
