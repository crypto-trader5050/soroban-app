# utils/error_tracker.py

import time
from collections import defaultdict

class ApiErrorTracker:
    def __init__(self, max_errors=5, pause_duration=60):
        self.api_error_count = defaultdict(int)
        self.entry_pause_until = defaultdict(float)
        self.max_errors = max_errors
        self.pause_duration = pause_duration

    def report_error(self, symbol: str):
        self.api_error_count[symbol] += 1
        if self.api_error_count[symbol] >= self.max_errors:
            self.entry_pause_until[symbol] = time.time() + self.pause_duration
            self.api_error_count[symbol] = 0  # リセット
            return True  # 新たに一時停止を設定した
        return False

    def entry_allowed(self, symbol: str):
        return time.time() >= self.entry_pause_until[symbol]
