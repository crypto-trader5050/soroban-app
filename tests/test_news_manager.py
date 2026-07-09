# tests/test_news_manager.py

import asyncio
import os
from dotenv import load_dotenv
from utils.news_schedule import NewsScheduleManager

# .envファイルのパスを指定して読み込む
load_dotenv(dotenv_path="config/secrets.test.env")

async def test_news_manager():
    sheet_id = os.getenv("GOOGLE_SHEET_ID")
    worksheet_name = os.getenv("GOOGLE_WORKSHEET_NAME")

    if not sheet_id or not worksheet_name:
        raise ValueError("環境変数が正しく設定されていません")

    manager = NewsScheduleManager(
        sheet_id=sheet_id,
        worksheet_name=worksheet_name,
        refresh_interval_sec=5
    )
    await manager.start()
    await asyncio.sleep(6)  # データ取得を待つ
    await manager.stop()

    schedule = manager.get_schedule()
    print("取得したnews_schedule:", schedule)

if __name__ == "__main__":
    asyncio.run(test_news_manager())
