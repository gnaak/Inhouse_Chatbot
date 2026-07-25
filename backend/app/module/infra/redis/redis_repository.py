import json

class RedisRepository:

    def __init__(self, redis_client, ttl: int):
        self.redis = redis_client
        self.ttl = ttl

    async def get(self, key: str):
        data = await self.redis.get(key)
        if not data:
            return None
        return json.loads(data)
    
    async def set(self, key:str, value: dict, ttl: int = None):
        expire = ttl if ttl is not None else self.ttl

        await self.redis.set(
            key,
            json.dumps(value),
            ex=expire
        )
    
    async def delete(self, key: str):
        await self.redis.delete(key)

    async def delete_pattern(self, pattern: str):
        async with self.redis.pipeline() as pipe:
            count = 0
            async for key in self.redis.scan_iter(match=pattern):
                pipe.delete(key)
                count += 1

            if count > 0:
                await pipe.execute()