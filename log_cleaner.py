import os
import time
import logging
from datetime import datetime

# ==========
# 設定項目
# ==========
LOG_DIR = "logs"
DAYS_TO_KEEP = 30  # ログを保管する最大日数

# ==========
# ロガー設定
# ==========
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
cleaner_logger = logging.getLogger("log_cleaner")

# ==========
# 処理開始
# ==========
def delete_old_logs():
    if not os.path.exists(LOG_DIR):
        cleaner_logger.warning(f"ログディレクトリが存在しません: {LOG_DIR}")
        return

    now = time.time()
    cutoff = now - (DAYS_TO_KEEP * 86400)  # 秒に変換

    deleted_count = 0

    for filename in os.listdir(LOG_DIR):
        if not filename.endswith(".log") and not filename.endswith(".log.1") and not filename.endswith(".log.2"):
            continue  # ログファイル以外は無視

        filepath = os.path.join(LOG_DIR, filename)
        if os.path.isfile(filepath):
            file_mtime = os.path.getmtime(filepath)
            file_age_days = int((now - file_mtime) / 86400)

            if file_mtime < cutoff:
                try:
                    os.remove(filepath)
                    cleaner_logger.info(f"🧹 削除: {filename} （{file_age_days}日前）")
                    deleted_count += 1
                except Exception as e:
                    cleaner_logger.error(f"❌ 削除失敗: {filename} → {e}")

    if deleted_count == 0:
        cleaner_logger.info("🧼 削除対象のログはありません。")
    else:
        cleaner_logger.info(f"✅ 合計 {deleted_count} 件の古いログを削除しました。")


if __name__ == "__main__":
    cleaner_logger.info("🔧 ログクリーナー実行開始")
    delete_old_logs()
    cleaner_logger.info("✅ ログクリーナー実行完了")
