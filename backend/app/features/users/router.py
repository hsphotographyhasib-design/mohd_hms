"""
Users router — admin user management endpoints.

MOHD.HMS ENTERPRISE

Mounted at /api/v1/users and /api/v1/admin/users (compatibility alias).

Response formats match the frontend:
  - List: { data: [...], total, page, pageSize, totalPages }
  - Role change: { success, user, previousRole, newRole, sessionsRevoked, changedBy, message }
  - Update: { message, user: {...} }
  - Delete: { message: '...' }
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.api.dependencies import AuthUser, get_current_user, require_min_role, require_permission
from app.core.logging import get_logger

from . import service as users_svc
from .schemas import RoleChangeRequest, UserUpdateRequest

log = get_logger(__name__)

router = APIRouter()


# ── GET /users — List all users (admin/super_admin) ─────────────────────────


@router.get("")
async def list_users(
    request: Request,
    user: AuthUser = Depends(require_min_role("admin")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    role: str = Query(default=""),
    department: str = Query(default=""),
    isActive: str = Query(default=""),
):
    """GET /api/v1/users — List users with pagination, search, role filter.

    Matches: GET /api/admin/users
    Returns: { data: [...], total, page, pageSize, totalPages }
    """
    return await users_svc.list_users(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search,
        role_filter=role,
        department=department,
        is_active=isActive,
    )


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    user: AuthUser = Depends(require_min_role("admin")),
):
    """GET /api/v1/users/{user_id} — Get user detail."""
    return await users_svc.get_user(user.tenantId, user_id)


# ── PATCH /users/{user_id}/role — Change role (admin/super_admin) ────────────


@router.patch("/{user_id}/role")
async def change_role(
    request: Request,
    user_id: str,
    body: RoleChangeRequest,
    user: AuthUser = Depends(require_min_role("admin")),
):
    """PATCH /api/v1/users/{user_id}/role — Change user role with audit trail.

    Matches: PATCH /api/admin/users/[id]/role
    Returns: { success, user, previousRole, newRole, sessionsRevoked, changedBy, message }
    """
    ip_address = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip", "unknown")
    )
    user_agent = request.headers.get("user-agent", "unknown")

    return await users_svc.change_role(
        tenant_id=user.tenantId,
        caller_id=user.userId,
        caller_role=user.role,
        caller_email=user.email,
        target_user_id=user_id,
        new_role=body.role,
        reason=body.reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )


# ── GET /users/{user_id}/sessions — List user sessions ───────────────────────


@router.get("/{user_id}/sessions")
async def list_sessions(
    user_id: str,
    user: AuthUser = Depends(require_min_role("admin")),
):
    """GET /api/v1/users/{user_id}/sessions — List active sessions for a user."""
    return await users_svc.list_user_sessions(user.tenantId, user_id)


# ── DELETE /users/{user_id}/sessions — Revoke user sessions ───────────────────


@router.delete("/{user_id}/sessions")
async def revoke_sessions(
    user_id: str,
    user: AuthUser = Depends(require_min_role("admin")),
):
    """DELETE /api/v1/users/{user_id}/sessions — Revoke all active sessions."""
    count = await users_svc.revoke_sessions(user.tenantId, user_id)
    return {"success": True, "sessionsRevoked": count}


# ── DELETE /users/{user_id} — Delete user (super_admin only) ─────────────────


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    user: AuthUser = Depends(require_min_role("super_admin")),
):
    """DELETE /api/v1/users/{user_id} — Delete user (super_admin only)."""
    await users_svc.delete_user(user.tenantId, user.userId, user.role, user_id)
    return {"message": "User deleted successfully"}


# ── PATCH (root) — Update user fields (for /api/admin/users PATCH) ─────────────
# Note: The Next.js frontend sends PATCH /api/admin/users with { userId, role, isActive, name, phone }
# This is handled at the list endpoint level — we add a separate route for it.


@router.patch("")
async def update_user(
    request: Request,
    body: UserUpdateRequest,
    user: AuthUser = Depends(require_min_role("admin")),
):
    """PATCH /api/v1/users — Update user fields (admin only).

    Matches: PATCH /api/admin/users
    Body: { userId, role?, isActive?, name?, phone? }
    Returns: { message, user: {...} }
    """
    return await users_svc.update_user(
        tenant_id=user.tenantId,
        caller={"userId": user.userId, "role": user.role},
        user_id=body.userId,
        role=body.role,
        is_active=body.isActive,
        name=body.name,
        phone=body.phone,
    )
