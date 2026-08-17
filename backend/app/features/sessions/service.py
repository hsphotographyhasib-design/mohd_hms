"""
Session management business logic.

MOHD.HMS ENTERPRISE

Implements session listing, creation, deletion, refresh, activity recording,
audit log retrieval, settings management, and session revocation.
Uses LoginSession and AuthAuditLog tables via PostgREST.
"""

import json
from datetime import datetime, timezone
from typing import Any

from app.core.database import (
    MODEL_TO_TABLE,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger

log = get_logger(__name__)

# ── Table name constants ─────────────────────────────────────────────────────

SESSION_TABLE = MODEL_TO_TABLE.get("loginSession", "LoginSession")
AUDIT_TABLE = MODEL_TO_TABLE.get("authAuditLog", "AuthAuditLog")
CMS_SETTING_TABLE = MODEL_TO_TABLE.get("cmsSetting", "CmsSetting")

# ── Default session settings ─────────────────────────────────────────────────

DEFAULT_SESSION_SETTINGS = {
    "maxConcurrentSessions": 5,
    "sessionTimeoutMinutes": 480,
    "idleTimeoutMinutes": 30,
    "rememberMeDays": 30,
    "enforceIpBinding": False,
}


# ── Session CRUD ─────────────────────────────────────────────────────────────


async def list_sessions(
    tenant_id: str,
    user_id: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> dict[str, Any]:
    """List login sessions with optional user filter and pagination."""
    where: dict[str, Any] = {}
    if user_id:
        where["userId"] = user_id

    offset = (page - 1) * page_size

    result = await query_table(
        SESSION_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    sessions = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(sessions)

    return {
        "success": True,
        "data": sessions,
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": max(1, (total + page_size - 1) // page_size),
        },
    }


async def create_session(
    tenant_id: str,
    user_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new login session record."""
    record = {
        "tenantId": tenant_id,
        "userId": user_id,
        "deviceName": data.get("deviceName"),
        "deviceType": data.get("deviceType"),
        "browser": data.get("browser"),
        "os": data.get("os"),
        "ipAddress": data.get("ipAddress"),
        "userAgent": data.get("userAgent"),
        "authProvider": data.get("authProvider", "email"),
        "isCurrent": True,
        "status": "active",
        "expiresAt": data.get("expiresAt"),
    }
    return await insert_record(SESSION_TABLE, record)


async def delete_session(session_id: str, tenant_id: str) -> dict[str, Any]:
    """Delete (revoke) a specific login session."""
    result = await query_table(
        SESSION_TABLE,
        select="id",
        where={"id": session_id},
        tenant_id=tenant_id,
    )
    if not result.get("data"):
        raise NotFoundException(resource="LoginSession")

    await delete_record(SESSION_TABLE, session_id)
    return {"success": True, "message": "Session revoked successfully"}


async def refresh_session(session_id: str, tenant_id: str) -> dict[str, Any]:
    """Refresh a session — update lastActivityAt to extend expiry."""
    result = await query_table(
        SESSION_TABLE,
        select="id",
        where={"id": session_id},
        tenant_id=tenant_id,
    )
    if not result.get("data"):
        raise NotFoundException(resource="LoginSession")

    now = datetime.now(timezone.utc).isoformat()
    return await update_record(SESSION_TABLE, session_id, {"lastActivityAt": now})


async def record_activity(tenant_id: str, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Record a user activity entry in the auth audit log."""
    record = {
        "tenantId": tenant_id,
        "userId": user_id,
        "sessionId": data.get("sessionId"),
        "action": data.get("action"),
        "page": data.get("page"),
        "metadata": json.dumps(data.get("metadata")) if data.get("metadata") else None,
        "ipAddress": data.get("ipAddress"),
        "userAgent": data.get("userAgent"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return await insert_record(AUDIT_TABLE, record)


async def list_audit(
    tenant_id: str,
    user_id: str | None = None,
    action: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> dict[str, Any]:
    """List auth audit log entries with optional filters and pagination."""
    where: dict[str, Any] = {}
    if user_id:
        where["userId"] = user_id
    if action:
        where["action"] = action

    offset = (page - 1) * page_size

    result = await query_table(
        AUDIT_TABLE,
        select="*",
        where=where,
        order="timestamp.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    entries = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(entries)

    return {
        "success": True,
        "data": entries,
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": max(1, (total + page_size - 1) // page_size),
        },
    }


# ── Session Settings ─────────────────────────────────────────────────────────


async def get_settings(tenant_id: str) -> dict[str, Any]:
    """Get session settings for the tenant.

    Returns stored settings merged with defaults for any missing keys.
    """
    result = await query_table(
        CMS_SETTING_TABLE,
        select="value",
        where={"key": "session_settings", "tenantId": tenant_id},
        tenant_id=tenant_id,
    )
    rows = result.get("data", [])

    if rows and rows[0].get("value"):
        try:
            stored = json.loads(rows[0]["value"]) if isinstance(rows[0]["value"], str) else rows[0]["value"]
        except (json.JSONDecodeError, TypeError):
            stored = {}
    else:
        stored = {}

    # Merge with defaults
    merged = {**DEFAULT_SESSION_SETTINGS, **stored}
    return {"success": True, "data": merged}


async def update_settings(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update session settings for the tenant.

    Upserts the session_settings record in cmsSetting table.
    """
    # Get current settings first
    current_result = await get_settings(tenant_id)
    current = current_result.get("data", {})

    # Merge: only update keys that are explicitly provided (non-None)
    for key, value in data.items():
        if value is not None:
            current[key] = value

    # Upsert into cmsSetting
    # Check if record exists
    existing = await query_table(
        CMS_SETTING_TABLE,
        select="id",
        where={"key": "session_settings", "tenantId": tenant_id},
        tenant_id=tenant_id,
    )

    value_json = json.dumps(current)

    if existing.get("data"):
        record_id = existing["data"][0]["id"]
        await update_record(CMS_SETTING_TABLE, record_id, {"value": value_json})
    else:
        await insert_record(CMS_SETTING_TABLE, {
            "tenantId": tenant_id,
            "key": "session_settings",
            "value": value_json,
        })

    return {"success": True, "data": current, "message": "Session settings updated"}


async def get_config_public() -> dict[str, Any]:
    """Get public session configuration (non-sensitive).

    Returns default session timeout and concurrent session limits.
    This endpoint does not require authentication.
    """
    return {
        "success": True,
        "data": {
            "maxConcurrentSessions": DEFAULT_SESSION_SETTINGS["maxConcurrentSessions"],
            "sessionTimeoutMinutes": DEFAULT_SESSION_SETTINGS["sessionTimeoutMinutes"],
            "idleTimeoutMinutes": DEFAULT_SESSION_SETTINGS["idleTimeoutMinutes"],
            "rememberMeDays": DEFAULT_SESSION_SETTINGS["rememberMeDays"],
        },
    }


async def revoke_other_sessions(
    tenant_id: str,
    user_id: str,
    keep_session_id: str | None = None,
    reason: str | None = None,
) -> dict[str, Any]:
    """Revoke all sessions for a user except the current one.

    Args:
        tenant_id: Tenant ID for isolation.
        user_id: The user whose sessions to revoke.
        keep_session_id: Session ID to keep (the current session).
        reason: Optional reason for the revocation.
    """
    # Fetch all active sessions for this user
    where: dict[str, Any] = {"userId": user_id, "status": "active"}
    if keep_session_id:
        where["id"] = {"ne": keep_session_id}

    result = await query_table(
        SESSION_TABLE,
        select="id",
        where=where,
        tenant_id=tenant_id,
    )

    sessions = result.get("data", [])
    revoked_count = 0

    for session in sessions:
        try:
            await update_record(SESSION_TABLE, session["id"], {
                "status": "revoked",
                "revokedAt": datetime.now(timezone.utc).isoformat(),
                "revokeReason": reason,
            })
            revoked_count += 1
        except Exception as exc:
            log.warning(f"Failed to revoke session {session['id']}: {exc}")

    return {
        "success": True,
        "message": f"Revoked {revoked_count} session(s)",
        "revokedCount": revoked_count,
    }
