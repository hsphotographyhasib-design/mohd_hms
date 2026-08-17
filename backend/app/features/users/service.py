"""
User management service layer.

MOHD.HMS ENTERPRISE

Provides: list_users, get_user, update_user, change_role, list_user_sessions, revoke_sessions.
All queries enforce tenant isolation and use the PostgREST adapter.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.core.database import MODEL_TO_TABLE
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.core.security import VALID_ROLES, normalize_role
from app.integrations.supabase import AsyncSupabaseClient, get_supabase
from app.rbac.permissions import ROLE_TRANSITION_MATRIX, can_assign_role

log = get_logger(__name__)


async def _safe_query(fn, fallback=None, label=""):
    """Run a query, returning fallback on error (resilient pattern from frontend)."""
    try:
        return await fn()
    except Exception as exc:
        log.warning(f"[{label}] query failed: {exc}")
        return fallback


def _to_iso(val: Any) -> str | None:
    """Convert a value to ISO string, returning None for null/missing."""
    if val is None:
        return None
    try:
        return str(val).replace(" ", "T") if "T" not in str(val) else str(val)
    except Exception:
        return None


def _format_user(user: dict[str, Any], department: dict | None = None) -> dict[str, Any]:
    """Format a user row into the frontend-expected shape."""
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "phone": user.get("phone"),
        "avatar": user.get("avatar"),
        "googleId": user.get("googleId"),
        "role": user.get("role"),
        "employeeNumber": user.get("employeeNumber"),
        "isActive": user.get("isActive", True),
        "isOnline": user.get("isOnline", False),
        "lastLogin": _to_iso(user.get("lastLogin")),
        "profileCompleted": user.get("profileCompleted", False),
        "createdAt": _to_iso(user.get("createdAt")),
        "department": department or None,
    }


async def list_users(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    role_filter: str = "",
    department: str = "",
    is_active: str = "",
) -> dict[str, Any]:
    """List users with pagination, search, and filters.

    Returns: { data: [...], total, page, pageSize, totalPages }
    Matches: GET /api/admin/users
    """
    db: AsyncSupabaseClient = get_supabase()
    offset = (page - 1) * page_size

    # Build where clause
    where: dict[str, Any] = {"tenantId": tenant_id}

    if search:
        where["OR"] = [
            {"name": {"contains": search}},
            {"email": {"contains": search}},
        ]

    if role_filter:
        where["role"] = role_filter

    if department:
        where["departmentId"] = department

    if is_active.lower() in ("true", "false"):
        where["isActive"] = is_active.lower() == "true"

    # Fetch users with department
    select = "id,email,name,phone,avatar,googleId,role,employeeNumber,isActive,isOnline,lastLogin,profileCompleted,createdAt,department:Department(id,name)"

    result = await db.query(
        "User",
        select=select,
        where=where,
        order="createdAt.desc",
        offset=offset,
        limit=page_size,
        count="exact",
    )

    users = result.get("data", [])
    count_str = result.get("count", "0")
    try:
        total = int(count_str) if count_str != "*" else len(users)
    except (ValueError, TypeError):
        total = len(users)

    # Format users - handle department being embedded or separate
    formatted = []
    for u in users:
        dept = u.pop("department", None)
        if dept and isinstance(dept, dict):
            dept = {"id": dept.get("id"), "name": dept.get("name")}
        formatted.append(_format_user(u, dept))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "data": formatted,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }


async def get_user(tenant_id: str, user_id: str) -> dict[str, Any]:
    """Get a single user by ID.

    Returns the user object directly (no wrapping).
    """
    db: AsyncSupabaseClient = get_supabase()

    select = "id,email,name,phone,avatar,googleId,role,employeeNumber,isActive,isOnline,lastLogin,profileCompleted,createdAt,updatedAt,department:Department(id,name)"

    result = await db.query(
        "User",
        select=select,
        where={"id": user_id, "tenantId": tenant_id},
        single=True,
    )

    user = result.get("data")
    if isinstance(user, list):
        user = user[0] if user else None

    if not user:
        raise NotFoundException(resource="User")

    dept = user.pop("department", None)
    if dept and isinstance(dept, dict):
        dept = {"id": dept.get("id"), "name": dept.get("name")}

    return _format_user(user, dept)


async def update_user(
    tenant_id: str,
    caller: dict[str, str],
    user_id: str,
    role: str | None = None,
    is_active: bool | None = None,
    name: str | None = None,
    phone: str | None = None,
) -> dict[str, Any]:
    """Update a user's fields (admin only).

    Matches: PATCH /api/admin/users
    Returns: { message, user: {...} }
    """
    db: AsyncSupabaseClient = get_supabase()

    update_data: dict[str, Any] = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    if role is not None:
        update_data["role"] = role
    if is_active is not None:
        update_data["isActive"] = is_active
    if name is not None and name.strip():
        update_data["name"] = name.strip()
    if phone is not None:
        update_data["phone"] = phone if phone else None

    if not update_data or len(update_data) <= 1:
        raise ValidationException(message="No fields to update")

    # Verify target user exists in tenant
    existing = await _safe_query(
        lambda: db.query("User", where={"id": user_id, "tenantId": tenant_id}, select="id", single=True),
        label="update_user-check",
    )
    if not existing or not existing.get("data"):
        raise NotFoundException(resource="User")

    updated = await db.update("User", user_id, update_data)

    return {
        "message": "User updated successfully",
        "user": _format_user(updated),
    }


async def change_role(
    tenant_id: str,
    caller_id: str,
    caller_role: str,
    caller_email: str | None,
    target_user_id: str,
    new_role: str,
    reason: str | None = None,
    ip_address: str = "unknown",
    user_agent: str = "unknown",
) -> dict[str, Any]:
    """Change a user's role with full RBAC validation and audit trail.

    Matches: PATCH /api/admin/users/[id]/role
    Returns: { success, user, previousRole, newRole, sessionsRevoked, changedBy, message }
    """
    db: AsyncSupabaseClient = get_supabase()

    # 1. Self-change prevention
    if caller_id == target_user_id:
        raise ForbiddenException(
            message="You cannot change your own role. Ask another administrator."
        )

    # 2. Validate and normalize role
    normalized_role = normalize_role(new_role)

    # 3. RBAC: can_assign_role check
    if not can_assign_role(caller_role, normalized_role):
        allowed = ROLE_TRANSITION_MATRIX.get(caller_role, set())
        raise ForbiddenException(
            message=f"Role assignment not permitted. Your role can assign: {', '.join(sorted(allowed)) or 'none'}.",
            details={"requestedRole": normalized_role, "permittedRoles": sorted(allowed)},
        )

    # 4. Find target user
    target = await _safe_query(
        lambda: db.query(
            "User",
            where={"id": target_user_id, "tenantId": tenant_id},
            select="id,tenantId,name,email,role,isActive",
            single=True,
        ),
        label="change_role-find",
    )
    target_user = target.get("data") if isinstance(target.get("data"), dict) else (target.get("data", [None])[0] if target.get("data") else None)

    if not target_user or target_user.get("tenantId") != tenant_id:
        raise NotFoundException(resource="User")

    previous_role = target_user.get("role", "")

    # 5. No-op check
    if normalized_role == previous_role:
        raise ValidationException(
            message=f'User already has the role "${normalized_role}". No change needed.'
        )

    # 6. Protect last super_admin
    if previous_role == "super_admin" and normalized_role != "super_admin":
        count_result = await _safe_query(
            lambda: db.query(
                "User",
                where={"tenantId": tenant_id, "role": "super_admin", "isActive": True},
                select="id",
                count="exact",
                limit=1,
            ),
            label="change_role-super_count",
        )
        super_count = 0
        count_str = count_result.get("count", "0")
        try:
            super_count = int(count_str) if count_str != "*" else 0
        except (ValueError, TypeError):
            pass

        if super_count <= 1:
            raise ValidationException(
                message="Cannot demote the last remaining Super Admin. Promote another user first."
            )

    # 7. Update role
    updated = await db.update(
        "User",
        target_user_id,
        {"role": normalized_role, "updatedAt": datetime.now(timezone.utc).isoformat()},
    )

    # 8. Revoke active sessions for target user
    sessions_revoked = 0
    try:
        revoke_result = await _safe_query(
            lambda: db.update(
                "LoginSession",
                "__never__",  # We use a different approach - query then update
            ),
            label="change_role-sessions-skip",
        )
        # Use raw query approach for session revocation
        client = db._client
        resp = await client.patch(
            "/rest/v1/LoginSession",
            params={
                "userId": f"eq.{target_user_id}",
                "tenantId": f"eq.{tenant_id}",
                "isRevoked": "eq.false",
            },
            json={"isRevoked": True},
            headers={
                "apikey": db._key,
                "Authorization": f"Bearer {db._key}",
                "Prefer": "return=representation",
            },
        )
        if resp.status_code in (200, 204):
            revoked_data = resp.json() if resp.status_code == 200 else []
            sessions_revoked = len(revoked_data) if isinstance(revoked_data, list) else 1
    except Exception as exc:
        log.warning(f"[Role Change] Failed to revoke sessions: {exc}")

    # 9. Audit log
    try:
        await _safe_query(
            lambda: db.insert("AuditLog", {
                "tenantId": tenant_id,
                "userId": caller_id,
                "action": "role_change",
                "entity": "User",
                "entityId": target_user_id,
                "oldValue": json.dumps({"role": previous_role}),
                "newValue": json.dumps({"role": normalized_role}),
                "details": json.dumps({
                    "previousRole": previous_role,
                    "newRole": normalized_role,
                    "changedBy": caller_role,
                    "changedByName": caller_email or "Unknown",
                    "targetUserName": target_user.get("name"),
                    "targetUserEmail": target_user.get("email"),
                    "reason": reason,
                    "sessionsRevoked": sessions_revoked,
                }),
                "ipAddress": ip_address,
                "userAgent": user_agent,
                "device": "api",
            }),
            label="change_role-audit",
        )
    except Exception as exc:
        log.warning(f"[Role Change Audit] Failed: {exc}")

    # 10. Notification
    try:
        await _safe_query(
            lambda: db.insert("NotificationLog", {
                "tenantId": tenant_id,
                "userId": target_user_id,
                "type": "role_change",
                "title": "Role Updated",
                "message": f"Your account role has been updated from {previous_role} to {normalized_role} by {caller_email or 'an administrator'}.",
                "data": json.dumps({
                    "previousRole": previous_role,
                    "newRole": normalized_role,
                    "changedBy": caller_id,
                    "changedByName": caller_email or "Unknown",
                    "changedByRole": caller_role,
                }),
                "isRead": False,
            }),
            label="change_role-notification",
        )
    except Exception as exc:
        log.warning(f"[Role Change Notification] Failed: {exc}")

    # Format the updated user with department
    dept_select = "department:Department(id,name)"
    full_result = await _safe_query(
        lambda: db.query(
            "User",
            select=f"id,name,email,role,isActive,avatar,employeeNumber,profileCompleted,lastLogin,createdAt,{dept_select}",
            where={"id": target_user_id},
            single=True,
        ),
        label="change_role-get_updated",
    )
    full_user = full_result.get("data")
    if isinstance(full_user, list):
        full_user = full_user[0] if full_user else None

    formatted_user = _format_user(full_user or updated)

    return {
        "success": True,
        "user": formatted_user,
        "previousRole": previous_role,
        "newRole": normalized_role,
        "sessionsRevoked": sessions_revoked,
        "changedBy": {
            "id": caller_id,
            "role": caller_role,
            "name": caller_email or "Unknown",
        },
        "message": f"Role changed from {previous_role} to {normalized_role}. {sessions_revoked} active session(s) revoked." if sessions_revoked > 0 else f"Role changed from {previous_role} to {normalized_role}.",
    }


async def delete_user(tenant_id: str, caller_id: str, caller_role: str, user_id: str) -> None:
    """Delete a user (super_admin only)."""
    db: AsyncSupabaseClient = get_supabase()

    # Verify target exists in tenant
    existing = await _safe_query(
        lambda: db.query("User", where={"id": user_id, "tenantId": tenant_id}, select="id", single=True),
        label="delete_user-check",
    )
    if not existing or not existing.get("data"):
        raise NotFoundException(resource="User")

    # Prevent self-deletion
    if caller_id == user_id:
        raise ValidationException(message="Cannot delete your own account")

    await db.delete("User", user_id)


async def list_user_sessions(tenant_id: str, user_id: str) -> list[dict[str, Any]]:
    """List active sessions for a user."""
    db: AsyncSupabaseClient = get_supabase()

    result = await db.query(
        "LoginSession",
        where={"userId": user_id, "tenantId": tenant_id, "isRevoked": False},
        order="createdAt.desc",
        limit=50,
    )

    return result.get("data", [])


async def revoke_sessions(tenant_id: str, user_id: str) -> int:
    """Revoke all active sessions for a user.

    Returns the number of sessions revoked.
    """
    db: AsyncSupabaseClient = get_supabase()

    try:
        client = db._client
        resp = await client.patch(
            "/rest/v1/LoginSession",
            params={
                "userId": f"eq.{user_id}",
                "tenantId": f"eq.{tenant_id}",
                "isRevoked": "eq.false",
            },
            json={"isRevoked": True},
            headers={
                "apikey": db._key,
                "Authorization": f"Bearer {db._key}",
                "Prefer": "return=representation",
            },
        )
        if resp.status_code in (200, 204):
            data = resp.json() if resp.status_code == 200 else []
            return len(data) if isinstance(data, list) else 1
        return 0
    except Exception as exc:
        log.warning(f"Failed to revoke sessions: {exc}")
        return 0
