import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import asyncio
import pytest
from unittest.mock import patch
from utils.news_schedule_manager import NewsScheduleManager

@patch("utils.news_filter.load_news_schedule_from_gsheet")
@pytest.mark.asyncio
async def test_news_schedule_manager_refresh(mock_load):
    # load_news_schedule_from_gsheet が返す形式に合わせたダミーデータ
    mock_data = [
        {"datetime_jst": "2025-07-24 14:30:00", "symbol": "BTCUSDT", "importance": "high", "description": "FOMC meeting"},
        {"datetime_jst": "2025-07-24 15:00:00", "symbol": "ETHUSDT", "importance": "medium", "description": "CPI release"},
    ]
    mock_load.return_value = mock_data

    manager = NewsScheduleManager(
        sheet_id="dummy_sheet_id",
        worksheet_name="dummy_worksheet",
        refresh_interval_sec=1
    )

    # 直接非公開メソッドをawaitしてロード処理の動作を確認
    result = await manager._load_schedule()
    assert result == mock_data

    # ニューススケジュールにセットしてから取得できるかテスト
    manager.news_schedule = result
    upcoming = manager.get_schedule()
    assert len(upcoming) == 2
    assert upcoming[0]["symbol"] == "BTCUSDT"
    assert upcoming[1]["importance"] == "medium"

    # 1回だけ更新して終了するテスト用のループを作成
    async def single_refresh_loop():
        try:
            manager.news_schedule = await manager._load_schedule()
        except Exception as e:
            pytest.fail(f"更新失敗: {e}")

    await single_refresh_loop()

    # 更新後もデータが正しく反映されているかチェック
    upcoming2 = manager.get_schedule()
    assert upcoming2 == mock_data
    
@pytest.mark.asyncio
async def test_news_schedule_manager_refresh_loop_once():
    mock_data = [
        {"datetime_jst": "2025-07-24 14:30:00", "symbol": "BTCUSDT", "importance": "high", "description": "FOMC meeting"}
    ]

    with patch("utils.google_sheets.load_news_schedule_from_gsheet", return_value=mock_data):
        manager = NewsScheduleManager("dummy", "dummy", refresh_interval_sec=0.1)

        async def run_limited_loop():
            task = asyncio.create_task(manager._refresh_loop())
            await asyncio.sleep(0.2)  # 少しだけループさせる
            manager._stop_refresh = True  # 明示的に停止フラグ
            await task

        await run_limited_loop()
        schedule = manager.get_schedule()
        assert schedule == mock_data

@pytest.mark.asyncio
async def test_refresh_loop_handles_exception():
    with patch("utils.google_sheets.load_news_schedule_from_gsheet", side_effect=Exception("読み込み失敗")):
        manager = NewsScheduleManager("dummy", "dummy", refresh_interval_sec=0.1)

        async def run_faulty_loop():
            task = asyncio.create_task(manager._refresh_loop())
            await asyncio.sleep(0.2)
            manager._stop_refresh = True
            await task

        await run_faulty_loop()

        # スケジュールは空のままであることを確認
        assert manager.get_schedule() == []
