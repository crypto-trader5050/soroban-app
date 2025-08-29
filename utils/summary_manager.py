from datetime import datetime, timedelta
import pytz
import os
import re
from config.strategy_version import STRATEGY_VERSION
from utils.logger import logger, summary_logger

def log_performance_summary(
    symbol: str,
    side: str,
    qty: float,
    pnl: float,
    reason: str,
    entry_price: float = None,
    exit_price: float = None,
    comment: str = ""
) -> None:
    now = datetime.now(pytz.utc).strftime("%Y-%m-%d %H:%M:%S")
    version = STRATEGY_VERSION
    
    try:
        pnl = float(pnl)  # ← ✅ ここを追加
    except Exception as e:
        logger.warning(f"[summary_manager] pnlが数値に変換できませんでした: {pnl} ({e})")
    
    pnl_str = f"{pnl:.2f}" 

    msg = (
        f"📈 {now} | Version: {version} | {symbol} {side} {qty}枚 | "
        f"損益: {pnl_str} USDT | 理由: {reason}"
    )
    
    if entry_price is not None and exit_price is not None:
        msg += f" | Entry: {entry_price:.2f}, Exit: {exit_price:.2f}"
    if comment:
        msg += f" | {comment}"

    summary_logger.info(msg)


def log_order_summary(
    action: str,
    symbol: str,
    side: str,
    qty: float,
    price: float = None,
    trigger: str = "",
    order_type: str = "market",
    order_id: str = "",
    status: str = "unknown",
    comment: str = ""
) -> None:
    now = datetime.now(pytz.utc).strftime("%Y-%m-%d %H:%M:%S")
    version = STRATEGY_VERSION

    msg = (
        f"📝 {now} | Version: {version} | Action: {action} | "
        f"{symbol} {side} {qty}枚 | Type: {order_type} | Status: {status}"
    )
    if price is not None:
        msg += f" | Price: {price:.2f}"
    if order_id:
        msg += f" | OrderID: {order_id}"
    if trigger:
        msg += f" | Trigger: {trigger}"
    if comment:
        msg += f" | {comment}"

    summary_logger.info(msg)


def generate_summary_report(log_file_path: str, mode: str = "daily") -> None:
    """
    日次 or 週次のパフォーマンスレポートを集計出力

    :param log_file_path: summary_logger のログファイルパス
    :param mode: "daily" or "weekly"
    """
    if not os.path.exists(log_file_path):
        summary_logger.warning(f"[Summary] ログファイルが存在しません: {log_file_path}")
        return

    try:
        with open(log_file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        summary_logger.error(f"[Summary] ログ読み込み失敗: {e}")
        return

    now = datetime.now(pytz.utc)
    start_time = now - timedelta(days=1 if mode == "daily" else 7)

    pnl_list = []

    for line in lines:
        if "📈" not in line:
            continue
        try:
            match = re.search(
                r"📈 (.*?) \| .*? \| (.*?) (Buy|Sell) .*?損益: (-?\d+\.?\d*) USDT", line)
            if not match:
                continue

            log_time = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M:%S")
            log_time = pytz.utc.localize(log_time)  # 明示的に UTC に変換
            if log_time < start_time:
                continue

            pnl = float(match.group(4))
            pnl_list.append(pnl)
        except Exception as e:
            summary_logger.warning(f"[Summary] 行解析エラー: {e} → {line.strip()}")
            continue

    total = len(pnl_list)
    wins = sum(1 for p in pnl_list if p > 0)
    losses = sum(1 for p in pnl_list if p <= 0)
    win_rate = (wins / total * 100) if total > 0 else 0
    net_profit = sum(pnl_list)

    # 最大連勝・連敗計算
    max_win_streak = max_lose_streak = curr_streak = 0
    curr_type = None

    for pnl in pnl_list:
        if pnl > 0:
            if curr_type == "win":
                curr_streak += 1
            else:
                curr_streak = 1
                curr_type = "win"
            max_win_streak = max(max_win_streak, curr_streak)
        else:
            if curr_type == "loss":
                curr_streak += 1
            else:
                curr_streak = 1
                curr_type = "loss"
            max_lose_streak = max(max_lose_streak, curr_streak)

    # 最大ドローダウン計算
    cumulative = 0.0
    peak = 0.0
    max_dd = 0.0
    for pnl in pnl_list:
        cumulative += pnl
        peak = max(peak, cumulative)
        dd = peak - cumulative
        max_dd = max(max_dd, dd)

    summary_logger.info("📊==============================")
    summary_logger.info(f"📊 Summary Report ({mode.upper()}) for {now.strftime('%Y-%m-%d')}")
    summary_logger.info(f"🧾 トレード数: {total}回")
    summary_logger.info(f"✅ 勝ち: {wins}回 / ❌ 負け: {losses}回 / 勝率: {win_rate:.1f}%")
    summary_logger.info(f"💰 総損益: {net_profit:.2f} USDT")
    summary_logger.info(f"🏆 最大連勝: {max_win_streak}回 / 😵 最大連敗: {max_lose_streak}回")
    summary_logger.info(f"📉 最大ドローダウン: -{max_dd:.2f} USDT")
    summary_logger.info("📊==============================")
