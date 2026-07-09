import sys
import os
import gspread
import pytz
from datetime import datetime
from oauth2client.service_account import ServiceAccountCredentials
from typing import List, Dict

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

# ✅ 認証ファイルの絶対パス
SERVICE_ACCOUNT_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__),
    "..",
    "config",
    "service_account.json"
))

def load_news_schedule_from_gsheet(sheet_id: str, worksheet_name: str = "CryptoBot_NewsSchedule") -> List[Dict]:
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_ACCOUNT_PATH, scope)
    client = gspread.authorize(creds)

    sheet = client.open_by_key(sheet_id).worksheet(worksheet_name)
    records = sheet.get_all_records()

    news_schedule = []
    jst = pytz.timezone("Asia/Tokyo")

    for row in records:
        date_str = row.get("日時") or row.get("date")
        if not date_str:
            continue
        try:
            dt_jst = jst.localize(datetime.strptime(date_str, "%Y/%m/%d %H:%M"))
            dt_utc = dt_jst.astimezone(pytz.utc)

            news_schedule.append({
                "time": dt_utc,
                "impact": (row.get("impact") or row.get("重要度") or "").strip().capitalize(),
                "symbol": (row.get("通貨") or row.get("currency") or "").strip().upper(),
                "event": row.get("イベント内容") or row.get("指標名", "")
            })
        except Exception as e:
            print(f"❌ 日付パース失敗: {date_str} → {e}")

    return news_schedule


def is_in_blackout_period(symbol: str, now: datetime, schedule: List[Dict]) -> bool:
    """
    現在時刻が、指定シンボルのニュースのブラックアウト期間内かを判定
    """
    for item in schedule:
        if item.get("symbol") != symbol:
            continue

        news_time = item["time"]
        impact = item.get("impact", "").lower()

        if impact == "high":
            window = 30
        elif impact == "medium":
            window = 15
        elif impact == "low" or impact == "":
            continue
        else:
            continue

        if abs((now - news_time).total_seconds()) <= window:
            return True

    return False
