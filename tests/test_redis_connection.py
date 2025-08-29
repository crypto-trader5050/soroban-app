import redis

def test_redis_connection():
    try:
        r = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=2)

        # 接続確認
        r.ping()

        # 書き込み確認
        r.set('test_key', 'hello_redis')
        value = r.get('test_key')

        # アサーションで自動チェックにも対応
        assert value == b'hello_redis', "Redisから取得した値が想定と異なります"
        print(f"✅ Redisから取得した値: {value.decode()}")

        # クリーンアップ
        r.delete('test_key')

    except redis.ConnectionError as e:
        print(f"❌ Redis接続エラー: {e}")
    except AssertionError as e:
        print(f"❌ 値の検証エラー: {e}")
    except Exception as e:
        print(f"❌ その他のエラー: {e}")

if __name__ == "__main__":
    test_redis_connection()
