import os
import csv
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv(dotenv_path="config/secrets.test.env")

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
GOOGLE_WORKSHEET_NAME = os.getenv("GOOGLE_WORKSHEET_NAME")

# 🔍 デバッグ：値を確認する
print("GOOGLE_SHEET_ID =", GOOGLE_SHEET_ID)
print("GOOGLE_WORKSHEET_NAME =", GOOGLE_WORKSHEET_NAME)

def fetch_news_schedule_and_save_to_csv(csv_path: str):
    # 🔽 ディレクトリがなければ作成
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)

    # スコープと認証
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name('config/gcp_credentials.json', scope)
    client = gspread.authorize(creds)

    sheet = client.open_by_key(GOOGLE_SHEET_ID)
    worksheet = sheet.worksheet(GOOGLE_WORKSHEET_NAME)

    rows = worksheet.get_all_values()

    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(rows)

    print(f"[✅] ニューススケジュールをCSVとして保存しました: {csv_path}")

if __name__ == "__main__":
    csv_output_path = "output/news_schedule.csv"  # ← 出力先パスを修正
    print("GOOGLE_SHEET_ID =", GOOGLE_SHEET_ID)
    print("GOOGLE_WORKSHEET_NAME =", GOOGLE_WORKSHEET_NAME)
    fetch_news_schedule_and_save_to_csv(csv_output_path)
