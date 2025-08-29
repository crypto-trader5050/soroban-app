import os
import argparse
from datetime import datetime
from summary_manager import generate_summary_report

# デフォルトのログディレクトリとファイル名パターン
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
DEFAULT_LOG_FILE = f"summary_{datetime.utcnow().strftime('%Y_%m_%d')}.log"

def main():
    parser = argparse.ArgumentParser(description="日次・週次サマリーレポート出力ツール")
    parser.add_argument("--mode", choices=["daily", "weekly"], default="daily", help="集計モード（daily or weekly）")
    parser.add_argument("--log", type=str, default=None, help="集計対象ログファイルのパス")

    args = parser.parse_args()

    # ログファイルが指定されていなければデフォルトで推定
    log_file_path = args.log or os.path.join(LOG_DIR, DEFAULT_LOG_FILE)

    if not os.path.exists(log_file_path):
        print(f"❌ ログファイルが見つかりません: {log_file_path}")
        return

    print(f"📊 {args.mode.upper()} モードでログ集計を開始します...")
    generate_summary_report(log_file_path, mode=args.mode)
    print(f"✅ サマリーレポート出力完了")

if __name__ == "__main__":
    main()
