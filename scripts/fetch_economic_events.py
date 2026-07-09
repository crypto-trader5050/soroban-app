# scripts/fetch_economic_events.py

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

def fetch_investing_calendar():
    url = "https://jp.investing.com/economic-calendar/"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "ja-JP",
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"❌ Failed to fetch page: {response.status_code}")

    soup = BeautifulSoup(response.text, "html.parser")

    results = []
    rows = soup.select("table.genTbl.closedTbl.ecEventsTable > tbody > tr")

    for row in rows:
        if "js-event-item" not in row.get("class", []):
            continue

        try:
            time_str = row.select_one(".first.left.time").get_text(strip=True)
            currency = row.select_one(".left.flagCur.noWrap span").get_text(strip=True)
            event = row.select_one(".left.event").get_text(strip=True)
            impact_icon = row.select(".sentiment")  # 重要度はアイコン数で判定
            importance = len(impact_icon)

            if not time_str or not currency or not event:
                continue

            # 日本時間に変換（Investing.com はデフォルトで日本時間表示）
            today = datetime.now(pytz.timezone("Asia/Tokyo")).strftime("%Y-%m-%d")
            dt = datetime.strptime(f"{today} {time_str}", "%Y-%m-%d %H:%M")
            dt_jst = pytz.timezone("Asia/Tokyo").localize(dt)

            results.append({
                "time": dt_jst.isoformat(),
                "currency": currency,
                "event": event,
                "importance": importance,
            })
        except Exception:
            continue

    return results
