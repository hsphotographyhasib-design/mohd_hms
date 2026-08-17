"""Upstash Redis integration via REST API.

MOHD.HMS ENTERPRISE

Uses httpx to call the Upstash Redis REST API (not redis-py).
All methods have graceful degradation: if Redis is unavailable,
they log a warning and continue without erroring.

Singleton access via get_redis().
"""

from __future__ import annotations

import json
from typing import Any, Callable, TypeVar

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

T = TypeVar("T")

# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: RedisClient | None = None


def get_redis() -> RedisClient:
    """Return the singleton RedisClient.

    If Redis is not configured, returns a no-op client that logs
    warnings on every operation but never raises.
    """
    global _instance
    if _instance is not None:
        return _instance

    settings = get_settings()
    _instance = RedisClient(
        url=settings.redis_url,
        token=settings.redis_token,
    )
    return _instance


# ── Client ─────────────────────────────────────────────────────────────────────


class RedisClient:
    """Async Redis client using the Upstash Redis REST API.

    All methods gracefully degrade when Redis is unavailable.
    """

    def __init__(self, url: str | None, token: str | None) -> None:
        self._url = url
        self._token = token
        self._available: bool | None = None  # None = not yet checked
        self._client = httpx.AsyncClient(
            base_url=url or "",
            headers={
                "Authorization": f"Bearer {token}" if token else "",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(5.0, connect=2.0),
        )
        if not url or not token:
            log.warning("Redis not configured — all cache operations will be no-ops")
            self._available = False

    @property
    def available(self) -> bool:
        """Whether Redis is configured and believed available."""
        return bool(self._available)

    async def close(self) -> None:
        """Close the underlying httpx client."""
        await self._client.aclose()

    async def _execute(self, command: list[str]) -> Any:
        """Execute a single Redis command via the REST API.

        Returns the parsed result, or None on error.
        """
        if not self._available is False and not self._url:
            return None

        try:
            response = await self._client.post(
                "/pipeline",
                json=[command],
            )
            if response.status_code == 200:
                data = response.json()
                # Pipeline returns array of results
                if isinstance(data, list) and len(data) > 0:
                    return data[0].get("result")
                return data
            else:
                self._available = False
                log.warning(f"Redis command failed: {response.status_code} {response.text}")
                return None
        except httpx.HTTPError as exc:
            self._available = False
            log.warning(f"Redis unavailable: {exc}")
            return None
        except Exception as exc:
            self._available = False
            log.warning(f"Redis error: {exc}")
            return None

    async def _pipeline(self, commands: list[list[str]]) -> list[Any]:
        """Execute multiple Redis commands in a pipeline.

        Returns list of results.
        """
        if not self._url:
            return [None] * len(commands)

        try:
            response = await self._client.post(
                "/pipeline",
                json=commands,
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return [item.get("result") for item in data]
                return [data] * len(commands)
            else:
                self._available = False
                log.warning(f"Redis pipeline failed: {response.status_code}")
                return [None] * len(commands)
        except Exception as exc:
            self._available = False
            log.warning(f"Redis pipeline error: {exc}")
            return [None] * len(commands)

    # ── Basic key operations ──────────────────────────────────────────────────

    async def get(self, key: str) -> str | None:
        """Get a string value by key. Returns None on miss or error."""
        result = await self._execute(["GET", key])
        if result is None:
            return None
        return str(result) if not isinstance(result, str) else result

    async def set(
        self,
        key: str,
        value: str,
        ex: int | None = None,
    ) -> bool:
        """Set a string value. Optional TTL in seconds.

        Returns True if successful, False otherwise.
        """
        command: list[str] = ["SET", key, value]
        if ex is not None:
            command.extend(["EX", str(ex)])
        result = await self._execute(command)
        return result == "OK"

    async def delete(self, key: str) -> bool:
        """Delete a key. Returns True if the key existed."""
        result = await self._execute(["DEL", key])
        return isinstance(result, int) and result > 0

    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        result = await self._execute(["EXISTS", key])
        return isinstance(result, int) and result > 0

    async def keys(self, pattern: str) -> list[str]:
        """Get keys matching a glob pattern.

        Warning: KEYS is O(N) — prefer SCAN for production.
        This is acceptable for cache invalidation with specific prefixes.
        """
        result = await self._execute(["KEYS", pattern])
        if isinstance(result, list):
            return [str(k) for k in result]
        return []

    async def incr(self, key: str) -> int | None:
        """Atomically increment a key. Returns the new value or None."""
        result = await self._execute(["INCR", key])
        return int(result) if result is not None else None

    async def expire(self, key: str, seconds: int) -> bool:
        """Set TTL on an existing key."""
        result = await self._execute(["EXPIRE", key, str(seconds)])
        return isinstance(result, int) and result > 0

    # ── Cache-through pattern ────────────────────────────────────────────────

    async def cached_fetch(
        self,
        key: str,
        fetcher: Callable[..., Any],
        ttl: int = 300,
    ) -> Any:
        """Cache-through fetch pattern.

        1. Try to get cached value from Redis.
        2. On miss, call fetcher() to get the fresh value.
        3. Cache the result with the given TTL.
        4. Return the value.

        If Redis is unavailable, calls fetcher directly (no caching).

        Args:
            key:      Cache key.
            fetcher:  Async callable that returns the value to cache.
            ttl:      Cache TTL in seconds (default 5 min).

        Returns:
            The cached or freshly fetched value.
        """
        # Try cache first
        cached = await self.get(key)
        if cached is not None:
            try:
                return json.loads(cached)
            except (json.JSONDecodeError, TypeError):
                # If the cached value isn't valid JSON, treat as cache miss
                pass

        # Cache miss — fetch fresh data
        try:
            value = await fetcher()
        except Exception as exc:
            log.error(f"Cache-through fetcher failed for key {key}: {exc}")
            raise

        # Store in cache
        try:
            serialized = json.dumps(value, default=str)
            await self.set(key, serialized, ex=ttl)
        except Exception as exc:
            log.warning(f"Failed to cache value for key {key}: {exc}")

        return value

    # ── Pattern invalidation ─────────────────────────────────────────────────

    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a glob pattern.

        Returns the number of keys deleted.
        """
        keys = await self.keys(pattern)
        if not keys:
            return 0

        # Use pipeline DEL for efficiency
        if len(keys) == 1:
            deleted = await self.delete(keys[0])
            return 1 if deleted else 0

        commands = [["DEL"] + keys]  # Single DEL with multiple keys
        results = await self._pipeline(commands)
        deleted_count = results[0] if results else 0
        return int(deleted_count) if deleted_count else 0

    # ── Cache key builder ────────────────────────────────────────────────────

    @staticmethod
    def build_cache_key(tenant_id: str, prefix: str, *parts: str) -> str:
        """Build a structured Redis cache key.

        Format: hms:{tenant_id}:{prefix}:{parts...}

        Example: build_cache_key("t123", "dashboard", "stats", "daily")
                 -> "hms:t123:dashboard:stats:daily"
        """
        all_parts = ["hms", tenant_id, prefix, *parts]
        return ":".join(str(p) for p in all_parts if p)

    # ── Health Check ─────────────────────────────────────────────────────────

    async def health_check(self) -> bool:
        """Check if Redis is reachable.

        Returns:
            True if Redis is healthy, False otherwise.
        """
        if not self._url:
            return False

        try:
            response = await self._client.get(
                f"/ping/{self._token}",
                timeout=3.0,
            )
            self._available = response.status_code == 200
            return self._available
        except Exception:
            self._available = False
            return False
