# utils/trade_logger.py

import re
from datetime import datetime, timezone
from utils.logger import logger  # 共通ロガーを利用


def log_trade_result(data: dict):
    """
    トレード結果をログファイルに記録（CSV出力は廃止）
    """
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        data.setdefault("datetime", now_str)

        # ログにわかりやすく整形して出力
        log_msg = (
            f"[TradeResult] datetime={data['datetime']} symbol={data.get('symbol', '')} side={data.get('side', '')} "
            f"entry_price={data.get('entry_price', '')} exit_price={data.get('exit_price', '')} quantity={data.get('quantity', '')} "
            f"pnl={data.get('pnl', '')} trigger={data.get('trigger', '')} exit_type={data.get('exit_type', '')} "
            f"fee={data.get('fee', '')} funding_fee={data.get('funding_fee', '')} holding_sec={data.get('holding_sec', '')} "
            f"entry_time={data.get('entry_time', '')} exit_time={data.get('exit_time', '')} note={data.get('note', '')}"
        )
        logger.info(log_msg)
    except Exception as e:
        logger.error(f"Failed to log trade result: {e}")


def summarize_daily_pnl(log_path="logs/crypto_bot.log", date: str = None):
    """
    ログファイルを解析して指定日の損益を集計。
    date省略時はUTC今日の日付で集計。

    解析対象はログ内の [TradeResult] 行のみ。
    """
    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    total_pnl = 0.0
    total_fee = 0.0
    total_funding = 0.0
    num_trades = 0

    # ログからTradeResult行を正規表現で抽出
    pattern = re.compile(
        r"\[TradeResult\].*datetime=(?P<dt>[\d\-T:\.]+).*pnl=(?P<pnl>[-+]?\d*\.?\d*).*fee=(?P<fee>[-+]?\d*\.?\d*).*funding_fee=(?P<funding>[-+]?\d*\.?\d*)"
    )

    try:
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                m = pattern.search(line)
                if not m:
                    continue

                log_datetime_str = m.group("dt")
                try:
                    log_date = datetime.fromisoformat(log_datetime_str).strftime("%Y-%m-%d")
                except Exception:
                    continue

                if log_date != date:
                    continue

                try:
                    pnl = float(m.group("pnl") or 0)
                    fee = float(m.group("fee") or 0)
                    funding = float(m.group("funding") or 0)
                except Exception:
                    continue

                total_pnl += pnl
                total_fee += fee
                total_funding += funding
                num_trades += 1

    except FileNotFoundError:
        logger.warning(f"Log file not found: {log_path}")
        return {}

    except Exception as e:
        logger.error(f"Failed to summarize daily pnl: {e}")
        return {}

    summary = {
        "date": date,
        "total_pnl": round(total_pnl, 2),
        "total_fee": round(total_fee, 2),
        "total_funding": round(total_funding, 2),
        "num_trades": num_trades,
    }

    logger.info(f"📊 日次損益サマリー({date}): {summary}")
    return summary


# --- 例：トレード記録と日次集計の使い方 ---
if __name__ == "__main__":
    # サンプルトレードログ出力
    log_trade_result({
        "symbol": "BTCUSDT",
        "side": "Buy",
        "entry_price": 102500,
        "exit_price": 103000,
        "quantity": 0.01,
        "pnl": 5.0,
        "trigger": "①②",
        "exit_type": "Trailing Stop",
        "fee": 0.2,
        "funding_fee": 0.1,
        "entry_time": "2025-06-24T10:00:00",
        "exit_time": "2025-06-24T10:10:00",
        "holding_sec": 600,
        "note": "自動売買Bot"
    })

    # 本日分の日次集計をログに出す
    summarize_daily_pnl()
