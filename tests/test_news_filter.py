import sys
import os
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from utils.news_filter import is_in_blackout_period

def test_blackout_true_case():
    news_list = [
        {
            "time": datetime.datetime.now() + datetime.timedelta(seconds=10),
            "symbol": "BTCUSDT",
            "impact": "high",
            "event": "Test event"
        }
    ]
    now = datetime.datetime.now()
    assert is_in_blackout_period("BTCUSDT", now, news_list) is True

def test_blackout_false_case_outside_window():
    news_list = [
        {
            "time": datetime.datetime.now() - datetime.timedelta(minutes=31),  # 30分以上前
            "symbol": "BTCUSDT",
            "impact": "high",
            "event": "Old event"
        }
    ]
    now = datetime.datetime.now()
    assert is_in_blackout_period("BTCUSDT", now, news_list) is False

def test_blackout_other_symbol():
    news_list = [
        {
            "time": datetime.datetime.now() + datetime.timedelta(seconds=10),
            "symbol": "ETHUSDT",
            "impact": "high",
            "event": "ETH Event"
        }
    ]
    now = datetime.datetime.now()
    assert is_in_blackout_period("BTCUSDT", now, news_list) is False
    
def test_blackout_low_impact():
    news_list = [
        {
            "time": datetime.datetime.now() + datetime.timedelta(seconds=15),
            "symbol": "BTCUSDT",
            "impact": "low",
            "event": "Low impact event"
        }
    ]
    now = datetime.datetime.now()
    assert is_in_blackout_period("BTCUSDT", now, news_list) is False

def test_blackout_just_outside_30s_window():
    now = datetime.datetime.now()
    news_time = now - datetime.timedelta(seconds=31.1)  # 31秒よりちょっと後
    news_list = [
        {
            "time": news_time,
            "symbol": "BTCUSDT",
            "impact": "high",
            "event": "Past event"
        }
    ]
    assert is_in_blackout_period("BTCUSDT", now, news_list) is False

def test_blackout_just_inside_30s_window():
    now = datetime.datetime.now()
    news_time = now - datetime.timedelta(seconds=29.9)
    news_list = [
        {
            "time": news_time,
            "symbol": "BTCUSDT",
            "impact": "high",
            "event": "Recent event"
        }
    ]
    assert is_in_blackout_period("BTCUSDT", now, news_list) is True

