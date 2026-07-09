import os
import csv
import requests
import gspread
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from oauth2client.service_account import ServiceAccountCredentials
from utils.logger import logger
from dotenv import load_dotenv

load_dotenv(dotenv_path="config/secrets.test.env")

NEWS_CSV_PATH = "config/news_schedule.csv"

def get_gsheet_client(json_path: str):
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name(json_path, scope)
        return gspread.authorize(creds)
    except Exception as e:
        logger.exception("[NewsUpdater] Google認証クライアントの作成に失敗しました。")
        raise

def update_sheet_with_news(sheet_id: str, sheet_name: str, json_path: str, news_data: list[dict]):
    try:
        client = get_gsheet_client(json_path)
        sheet = client.open_by_key(sheet_id).worksheet(sheet_name)
        sheet.clear()

        headers = list(news_data[0].keys())
        values = [headers] + [[item[h] for h in headers] for item in news_data]
        sheet.update(range_name="A1", values=values)

        logger.info(f"[NewsUpdater] シート '{sheet_name}' を最新ニュースで更新しました。")
    except Exception as e:
        logger.exception("[NewsUpdater] シート更新に失敗しました。")

def save_news_to_csv(news_list, csv_path=NEWS_CSV_PATH):
    if not news_list:
        logger.warning("[NewsUpdater] 保存するニュースがありません。")
        return
    fieldnames = list(news_list[0].keys())
    try:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(news_list)
        logger.info(f"[NewsUpdater] {csv_path} に保存しました。")
    except Exception as e:
        logger.exception("[NewsUpdater] CSV保存に失敗しました。")

def scrape_latest_news():
    url = "https://fx.minkabu.jp/indicators"
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() 

        soup = BeautifulSoup(response.text, "html.parser")
        rows = soup.select("table.tbl-border tr") 

        news_items = []

        for row in rows:
            time_el = row.select_one("td.eilist__time span")
            if time_el is None:
                continue
            time_text = time_el.text.strip()

            try:
                today = datetime.now()
                event_time = datetime.strptime(time_text, "%H:%M")  # 時刻のみの例
                event_time = event_time.replace(year=today.year, month=today.month, day=today.day)
                if event_time < today - timedelta(hours=12):
                    event_time += timedelta(days=1)
                dt_str = event_time.strftime("%Y/%m/%d %H:%M")
            except Exception as e:
                logger.warning(f"日付変換エラー: {time_text} → {e}")
                continue

            title_el = row.select_one("td.tbl__middle p")
            if title_el is None:
                continue
            title = title_el.text.strip()

            star_svgs = row.select("td.eilist__star svg.i-star.yellow")
            star_count = len(star_svgs)

            importance = "大" if star_count >= 3 else "中" if star_count == 2 else "小"

            news_items.append({
                "日時（JST）": dt_str,
                "イベント内容": title,
                "重要度": importance
            })

        logger.info(f"✅ ニュース件数: {len(news_items)}")
        return news_items

    except Exception as e:
        logger.error(f"[scrape_latest_news] エラー: {e}")
        return [], "", []

def update_news_schedule():
    SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
    SHEET_NAME = os.getenv("GOOGLE_WORKSHEET_NAME")
    CREDENTIAL_JSON = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not SHEET_ID or not SHEET_NAME or not CREDENTIAL_JSON:
        logger.error("[NewsUpdater] 環境変数が不足しています。スプレッドシートの更新は中止されました。")
        return

    news_data = scrape_latest_news()

    if news_data:
        update_sheet_with_news(SHEET_ID, SHEET_NAME, CREDENTIAL_JSON, news_data)
        save_news_to_csv(news_data)
        logger.info("[NewsUpdater] ニューススケジュールの更新が完了しました。")
    else:
        logger.warning("[NewsUpdater] ニュースデータが取得できませんでした。更新をスキップします。")

if __name__ == "__main__":
    update_news_schedule()
