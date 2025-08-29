# utils/news_schedule_runner.py
import time
from utils.news_schedule import fetch_news_schedule_and_save_to_csv

def periodic_fetch(interval_minutes=5):
    csv_output_path = "output/news_schedule.csv"
    while True:
        print("ニューススケジュールを取得中...")
        fetch_news_schedule_and_save_to_csv(csv_output_path)
        print(f"{interval_minutes}分間待機します...")
        time.sleep(interval_minutes * 60)

if __name__ == "__main__":
    periodic_fetch()
