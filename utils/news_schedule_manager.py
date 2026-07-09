import logging
import gspread
from typing import List, Dict, Any
from datetime import datetime, timezone
from utils.news_filter import load_news_schedule_from_gsheet  # 既存のGoogle Sheets読み込み関数
import asyncio

logger = logging.getLogger(__name__)

class NewsScheduleManager:
    def __init__(self, sheet_id: str, worksheet_name: str = "CryptoBot_NewsSchedule", refresh_interval_sec: int = 300):
        self.sheet_id = sheet_id
        self.worksheet_name = worksheet_name
        self.refresh_interval_sec = refresh_interval_sec
        self.news_schedule: List[Dict[str, Any]] = []
        self._task = None
        self._running = False

    async def start(self):
        self._running = True
        logger.info("ニューススケジュール管理開始")
        self._task = asyncio.create_task(self._refresh_loop())
        logger.info("ニューススケジュールの定期更新タスク起動完了")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("ニューススケジュール管理停止")

    async def _refresh_loop(self):
        while self._running:
            try:
                self.news_schedule = await self._load_schedule()
                logger.info(f"ニューススケジュール更新成功: 件数={len(self.news_schedule)} 内容={self.news_schedule}")
            except Exception as e:
                logger.error(f"ニューススケジュール更新失敗: {e}", exc_info=True)
            await asyncio.sleep(self.refresh_interval_sec)

    async def _load_schedule(self) -> List[Dict[str, Any]]:
        # load_news_schedule_from_gsheet は同期関数ならここで非同期化してください
        # もしくはスレッドプールで呼び出し可能
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: load_news_schedule_from_gsheet(self.sheet_id, self.worksheet_name)
        )
        return result

    def get_schedule(self) -> List[Dict[str, Any]]:
        return self.news_schedule

    async def _refresh_loop(self):
        while self._running:
            try:
                self.news_schedule = await self._load_schedule()
                logger.info(f"[NewsScheduleManager] ニューススケジュール更新成功: 件数={len(self.news_schedule)}")
                    # もし中身確認したければ下も有効化
                    # logger.debug(f"取得データ: {self.news_schedule}")
            except Exception as e:
                logger.error(f"[NewsScheduleManager] ニューススケジュール更新失敗: {e}", exc_info=True)
            await asyncio.sleep(self.refresh_interval_sec)
