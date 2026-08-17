"""
Notifications feature router.

MOHD.HMS ENTERPRISE

11 endpoints:
  GET    /api/v1/notifications                    — List notifications
  POST   /api/v1/notifications                    — Create notification
  GET    /api/v1/notifications/unread-count       — Unread count
  PATCH  /api/v1/notifications/read-all          — Mark all as read
  GET    /api/v1/notifications/devices            — List registered devices
  POST   /api/v1/notifications/devices/register   — Register device token
  POST   /api/v1/notifications/devices/unregister — Unregister device token
  POST   /api/v1/notifications/test                — Send test notification
  GET    /api/v1/notifications/{id}                — Get single notification
  PUT    /api/v1/notifications/{id}                — Update notification
  DELETE /api/v1/notifications/{id}                — Delete notification
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role
from app.features.notifications import service
from app.features.notifications.schemas import (
    DeviceTokenRegister,
    DeviceTokenUnregister,
    NotificationCreate,
    NotificationUpdate,
    TestNotificationRequest,
)

router = APIRouter(tags=["notifications"])


# ── Collection endpoints (must come before /{id}) ────────────────────────


@router.get("")
async def list_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=50),
    isRead: bool | None = Query(default=None),
    type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/notifications — List notifications."""
    result = await service.list_notifications(
        tenant_id=user.tenantId,
        user=user,
        page=page,
        page_size=limit,
        is_read=isRead,
        notification_type=type,
        search=search,
    )
    return {"success": True, **result}


@router.post("")
async def create_notification(
    body: NotificationCreate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/notifications — Create notification."""
    result = await service.create_notification(
        tenant_id=user.tenantId,
        user=user,
        data=body.model_dump(exclude_unset=True),
    )
    return {"success": True, **result}


@router.get("/unread-count")
async def get_unread_count(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/notifications/unread-count."""
    count = await service.get_unread_count(user.tenantId, user)
    return {"success": True, "count": count}


@router.patch("/read-all")
async def read_all(
    user: AuthUser = Depends(get_current_user),
):
    """PATCH /api/v1/notifications/read-all — Mark all as read."""
    marked = await service.mark_all_read(user.tenantId, user)
    return {"success": True, "markedRead": marked}


# ── Device endpoints ────────────────────────────────────────────────────


@router.get("/devices")
async def list_devices(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/notifications/devices — List registered devices."""
    devices = await service.list_devices(user.tenantId, user)
    return {"success": True, "devices": devices}


@router.post("/devices/register")
async def register_device(
    body: DeviceTokenRegister,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/notifications/devices/register."""
    result = await service.register_device(
        tenant_id=user.tenantId,
        user=user,
        data=body.model_dump(exclude_unset=True),
    )
    return {"success": True, **result}


@router.post("/devices/unregister")
async def unregister_device(
    body: DeviceTokenUnregister,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/notifications/devices/unregister."""
    result = await service.unregister_device(user, body.token)
    return {"success": True, **result}


# ── Test notification ────────────────────────────────────────────────────


@router.post("/test")
async def test_notification(
    body: TestNotificationRequest | None = None,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """POST /api/v1/notifications/test — Send test FCM notification."""
    data = body.model_dump(exclude_unset=True) if body else {}
    result = await service.send_test_notification(user.tenantId, user, data)
    return {"success": True, **result}


# ── Single notification endpoints ────────────────────────────────────────


@router.get("/{notification_id}")
async def get_notification(
    notification_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/notifications/{id}."""
    result = await service.get_notification(user.tenantId, notification_id, user)
    return {"success": True, "data": result}


@router.put("/{notification_id}")
async def update_notification(
    notification_id: str,
    body: NotificationUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/notifications/{id}."""
    result = await service.update_notification(
        tenant_id=user.tenantId,
        notification_id=notification_id,
        user=user,
        data=body.model_dump(exclude_unset=True),
    )
    return {"success": True, "data": result}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """DELETE /api/v1/notifications/{id}."""
    await service.delete_notification(user.tenantId, notification_id, user)
    return {"success": True, "deleted": True}
