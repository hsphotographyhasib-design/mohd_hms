from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.logging import get_logger
from app.integrations.redis import get_redis
from app.utils.helpers import utcnow

log = get_logger(__name__)

# Presence TTL: 2 minutes for heartbeat extension
PRESENCE_TTL_SECONDS = 120

# Presence key format: hms:{tenantId}:presence:{userId}


def _presence_key(tenant_id: str, user_id: str) -> str:
    """Build the Redis key for a user's presence."""
    return f"hms:{tenant_id}:presence:{user_id}"


def _presence_pattern(tenant_id: str) -> str:
    """Build the Redis key pattern for all presence in a tenant."""
    return f"hms:{tenant_id}:presence:*"


def _serialize_presence(state: str, device_info: dict[str, Any] | None = None) -> str:
    """Serialize presence data for Redis storage."""
    data = {
        "state": state,
        "lastSeen": utcnow().isoformat(),
    }
    if device_info:
        data["deviceInfo"] = device_info
    return json.dumps(data)


def _deserialize_presence(value: str | None) -> dict[str, Any] | None:
    """Deserialize presence data from Redis."""
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


# ── Service functions ────────────────────────────────────────────────────


async def update_presence(
    tenant_id: str,
    user: AuthUser,
    state: str,
    device_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Set user's presence state in Redis with TTL."""
    redis = get_redis()
    key = _presence_key(tenant_id, user.userId)
    value = _serialize_presence(state, device_info)

    if state == "OFFLINE":
        # Remove key on offline — no TTL needed
        await redis.delete(key)
    else:
        await redis.set(key, value, ex=PRESENCE_TTL_SECONDS)

    return _deserialize_presence(value) or {"state": state, "lastSeen": utcnow().isoformat()}


async def get_presence(
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any] | None:
    """Get user's current presence state."""
    redis = get_redis()
    key = _presence_key(tenant_id, user.userId)
    value = await redis.get(key)
    return _deserialize_presence(value)


async def heartbeat(
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Extend online timeout to 2 minutes.

    Returns current presence data. If no presence exists,
    creates an ONLINE entry.
    """
    redis = get_redis()
    key = _presence_key(tenant_id, user.userId)
    value = await redis.get(key)

    if value:
        # Extend TTL
        await redis.expire(key, PRESENCE_TTL_SECONDS)
        data = _deserialize_presence(value)
        if data:
            data["lastSeen"] = utcnow().isoformat()
            return data

    # No existing presence — set ONLINE
    return await update_presence(tenant_id, user, "ONLINE")


async def get_online_users(
    tenant_id: str,
    user: AuthUser,
) -> list[dict[str, Any]]:
    """List all online users in the tenant.

    Scans Redis keys matching the presence pattern and returns
    enriched user data.
    """
    redis = get_redis()
    pattern = _presence_pattern(tenant_id)
    keys = await redis.keys(pattern)

    if not keys:
        return []

    # Fetch all presence values in pipeline
    online_users: list[dict[str, Any]] = []
    for key in keys:
        value = await redis.get(key)
        if not value:
            continue
        data = _deserialize_presence(value)
        if not data or data.get("state") == "OFFLINE":
            continue

        # Extract userId from key: hms:{tenantId}:presence:{userId}
        parts = key.rsplit(":", 1)
        user_id = parts[-1] if len(parts) >= 2 else ""

        online_users.append({
            "userId": user_id,
            "state": data.get("state", "ONLINE"),
            "lastSeen": data.get("lastSeen"),
            "deviceInfo": data.get("deviceInfo"),
        })

    # Enrich with user names/roles
    if online_users:
        from app.core.database import query_table
        user_ids = [u["userId"] for u in online_users if u["userId"]]
        if user_ids:
            users_result = await query_table(
                "user",
                select="id,name,role,departmentId",
                where={"id": {"in": user_ids}},
            )
            users_map = {
                u["id"]: {
                    "name": u.get("name"),
                    "role": u.get("role"),
                    "departmentId": u.get("departmentId"),
                }
                for u in users_result.get("data", [])
                if u.get("id")
            }
            for u in online_users:
                user_data = users_map.get(u["userId"], {})
                u["name"] = user_data.get("name")
                u["role"] = user_data.get("role")
                u["department"] = user_data.get("departmentId")

    return online_users


async def get_user_presence_batch(
    tenant_id: str,
    user_ids: list[str],
) -> dict[str, dict[str, Any]]:
    """Batch lookup of user presence states.

    Returns a dict mapping userId → presence data.
    """
    redis = get_redis()
    result: dict[str, dict[str, Any]] = {}

    for uid in user_ids:
        key = _presence_key(tenant_id, uid)
        value = await redis.get(key)
        data = _deserialize_presence(value)
        if data:
            result[uid] = data
        else:
            result[uid] = {"state": "OFFLINE", "lastSeen": None}

    return result
