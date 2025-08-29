import os
import requests
from utils.logger import logger

class TelegramNotifier:
    def __init__(self, bot_token: str = None, chat_id: str = None):
        # 環境変数から取得（引数が None の場合）
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID")

        if not self.bot_token or not self.chat_id:
            raise ValueError("TELEGRAM_BOT_TOKEN と TELEGRAM_CHAT_ID は必須です")

    def send_message(self, text: str) -> bool:
        """
        Telegram にメッセージを送信する

        Args:
            text (str): 送信するメッセージ

        Returns:
            bool: 成功 True / 失敗 False
        """
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        data = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML"  # 任意（装飾したい場合）
        }
        try:
            response = requests.post(url, data=data, timeout=10)
            response.raise_for_status()
            logger.info(f"[TelegramNotifier] メッセージ送信成功: {text}")
            return True
        except requests.RequestException as e:
            logger.error(f"[TelegramNotifier] メッセージ送信失敗: {e}")
            return False