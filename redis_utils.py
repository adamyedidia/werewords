import redis as r
from typing import Optional, Any

redis = r.Redis(connection_pool=r.ConnectionPool(host='localhost', port=6379, db=0))

def rget(key: str, *, game_id: str) -> Optional[str]:
    return raw_result.decode('utf-8') if (raw_result := redis.get(f'{game_id}:{key}')) is not None else None

def rset(key: str, value: Any, *, game_id: str) -> None:
    redis.set(f'{game_id}:{key}', value)

