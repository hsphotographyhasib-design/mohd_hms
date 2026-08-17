from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role

from . import service
from .schemas import SessionActivity, SessionCreate, SessionSettings, RevokeOthersRequest

router = APIRouter(tags=["sessions"])


@router.get("")
async def list_sessions(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
    userId: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
):
    """GET /api/v1/sessions — List login sessions."""
    return await service.list_sessions(user.tenantId, user_id=userId, page=page, page_size=pageSize)


@router.post("")
async def create_session(
    body: SessionCreate,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """POST /api/v1/sessions — Create a login session."""
    return await service.create_session(user.tenantId, user.userId, body.model_dump())


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/sessions/{id} — Revoke a session."""
    return await service.delete_session(session_id, user.tenantId)


@router.post("/{session_id}/refresh")
async def refresh_session(
    session_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """POST /api/v1/sessions/{id}/refresh — Refresh a session."""
    return await service.refresh_session(session_id, user.tenantId)


@router.post("/activity")
async def record_activity(
    body: SessionActivity,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/sessions/activity — Record user activity."""
    return await service.record_activity(user.tenantId, user.userId, body.model_dump())


@router.get("/audit")
async def list_audit(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
    userId: str | None = Query(default=None),
    action: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
):
    """GET /api/v1/sessions/audit — List auth audit log."""
    return await service.list_audit(user.tenantId, user_id=userId, action=action, page=page, page_size=pageSize)


@router.get("/settings")
async def get_settings(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/sessions/settings — Get session settings."""
    return await service.get_settings(user.tenantId)


@router.put("/settings")
async def update_settings(
    body: SessionSettings,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """PUT /api/v1/sessions/settings — Update session settings."""
    return await service.update_settings(user.tenantId, body.model_dump(exclude_none=True))


@router.get("/config/public")
async def get_config_public():
    """GET /api/v1/sessions/config/public — Get public session config (no auth required)."""
    return await service.get_config_public()


@router.post("/revoke-others")
async def revoke_other_sessions(
    body: RevokeOthersRequest,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/sessions/revoke-others — Revoke all other sessions for the current user."""
    return await service.revoke_other_sessions(
        tenant_id=user.tenantId,
        user_id=user.userId,
        keep_session_id=body.keepSessionId,
        reason=body.reason,
    )
