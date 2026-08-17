"""
Notification service — CRUD, device token management, FCM push.

MOHD.HMS ENTERPRISE
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ServiceUnavailableException,
    ValidationException,
)
from app.core.logging import get_logger
from app.integrations.firebase import get_firebase
from app.rbac.permissions import has_action_permission
from app.utils.helpers import utcnow

log = get_logger(__name__)

MAX_DEVICES_PER_USER_PLATFORM = 5


# ── List notifications ──────────────────────────────────────────────────────


async def list_notifications(
    tenant_id: str,
    user: AuthUser,
    page: int = 1,
    page_size: int = 25,
    is_read: bool | None = None,
    notification_type: str | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    """List notifications (paginated, filterable).

    Admin/super_admin can see all notifications; others see only their own.
    """
    if not has_action_permission(user.role, "notification", "view"):
        raise ForbiddenException(message="No permission to view notifications")

    is_admin = user.role in ("super_admin", "admin")
    where: dict[str, Any] = {"tenantId": tenant_id}
    if not is_admin:
        where["userId"] = user.userId

    if is_read is True:
        where["isRead"] = True
    elif is_read is False:
        where["isRead"] = False

    if notification_type:
        where["type"] = notification_type

    if search:
        where["OR"] = [
            {"title": {"contains": search}},
            {"message": {"contains": search}},
        ]

    offset = (page - 1) * page_size

    result = await query_table(
        "notification",
        select="id,userId,type,title,message,data,priority,isRead,readAt,archivedAt,relatedEntityType,relatedEntityId,actionUrl,actionLabel,createdBy,createdAt,updatedAt",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
    )

    data = result.get("data", [])
    # Parse JSON data field
    for n in data:
        if isinstance(n.get("data"), str):
            try:
                n["data"] = json.loads(n["data"])
            except (json.JSONDecodeError, TypeError):
                pass

    total_str = result.get("count", "0")
    try:
        total = int(total_str) if total_str not in ("*", None) else len(data)
    except (ValueError, TypeError):
        total = len(data)

    # Unread count for this user
    unread_count = await count_records(
        "notification",
        where={"tenantId": tenant_id, "userId": user.userId, "isRead": False},
    )

    return {
        "notifications": data,
        "unreadCount": unread_count,
        "total": total,
        "page": page,
        "limit": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


# ── Get single notification ─────────────────────────────────────────────────


async def get_notification(
    tenant_id: str,
    notification_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get a single notification by ID."""
    is_admin = user.role in ("super_admin", "admin")
    where: dict[str, Any] = {"id": notification_id, "tenantId": tenant_id}
    if not is_admin:
        where["userId"] = user.userId

    result = await query_table(
        "notification",
        select="id,userId,type,title,message,data,priority,isRead,readAt,archivedAt,relatedEntityType,relatedEntityId,actionUrl,actionLabel,createdBy,createdAt,updatedAt",
        where=where,
        limit=1,
    )
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Notification")

    n = data[0]
    if isinstance(n.get("data"), str):
        try:
            n["data"] = json.loads(n["data"])
        except (json.JSONDecodeError, TypeError):
            pass
    return n


# ── Update notification ─────────────────────────────────────────────────────


async def update_notification(
    tenant_id: str,
    notification_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update a notification (mark read, archive, etc.)."""
    is_admin = user.role in ("super_admin", "admin")

    # Verify ownership
    where: dict[str, Any] = {"id": notification_id, "tenantId": tenant_id}
    if not is_admin:
        where["userId"] = user.userId

    existing = await query_table("notification", select="id,userId", where=where, limit=1)
    if not existing.get("data"):
        raise NotFoundException(resource="Notification")

    update_data: dict[str, Any] = {"updatedAt": utcnow().isoformat()}
    if "isRead" in data and data["isRead"] is True:
        update_data["isRead"] = True
        update_data["readAt"] = utcnow().isoformat()
    elif "isRead" in data:
        update_data["isRead"] = data["isRead"]

    if "isArchived" in data:
        update_data["archivedAt"] = utcnow().isoformat() if data["isArchived"] else None

    updated = await update_record("notification", notification_id, update_data)
    return updated


# ── Delete notification ─────────────────────────────────────────────────────


async def delete_notification(
    tenant_id: str,
    notification_id: str,
    user: AuthUser,
) -> None:
    """Delete a notification."""
    is_admin = user.role in ("super_admin", "admin")

    where: dict[str, Any] = {"id": notification_id, "tenantId": tenant_id}
    if not is_admin:
        where["userId"] = user.userId

    existing = await query_table("notification", select="id,userId", where=where, limit=1)
    if not existing.get("data"):
        raise NotFoundException(resource="Notification")

    await delete_record("notification", notification_id)


# ── Mark all as read ────────────────────────────────────────────────────────


async def mark_all_read(
    tenant_id: str,
    user: AuthUser,
) -> int:
    """Mark all unread notifications as read for the current user."""
    now = utcnow().isoformat()

    # Fetch unread notification IDs
    result = await query_table(
        "notification",
        select="id",
        where={"tenantId": tenant_id, "userId": user.userId, "isRead": False},
        limit=1000,
    )
    unread = result.get("data", [])
    if not unread:
        return 0

    count = 0
    for n in unread:
        await update_record("notification", n["id"], {"isRead": True, "readAt": now, "updatedAt": now})
        count += 1
    return count


# ── Unread count ────────────────────────────────────────────────────────────


async def get_unread_count(
    tenant_id: str,
    user: AuthUser,
) -> int:
    """Get unread notification count for the current user."""
    return await count_records(
        "notification",
        where={"tenantId": tenant_id, "userId": user.userId, "isRead": False},
    )


# ── Create notification (centralized) ───────────────────────────────────────


async def create_notification(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create notification(s) and optionally send via FCM.

    Supports targeting by userId or by role.
    """
    if not has_action_permission(user.role, "notification", "send"):
        raise ForbiddenException(message="No permission to send notifications")

    title = data.get("title", "")
    message = data.get("message", "")
    if not title:
        raise ValidationException(message="Notification title is required")

    # Resolve target user IDs
    target_user_ids: list[str] = []
    if data.get("userId"):
        target_user_ids = [data["userId"]] if isinstance(data["userId"], str) else list(data["userId"])
    elif data.get("role"):
        # Role-based targeting
        role = data["role"]
        users_result = await query_table(
            "user",
            select="id",
            where={"tenantId": tenant_id, "isActive": True, "role": role},
        )
        target_user_ids = [u["id"] for u in users_result.get("data", []) if u.get("id")]

    if not target_user_ids:
        return {"created": 0, "message": "No target users found"}

    now = utcnow().isoformat()
    created_ids: list[str] = []

    for uid in target_user_ids:
        record: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "tenantId": tenant_id,
            "userId": uid,
            "title": title,
            "message": message,
            "channel": "push",
            "isRead": False,
            "priority": data.get("priority", "normal"),
            "createdBy": user.userId,
            "createdAt": now,
            "updatedAt": now,
        }
        if data.get("type"):
            record["type"] = data["type"]
        if data.get("category"):
            record["category"] = data["category"]
        if data.get("data"):
            record["data"] = json.dumps(data["data"])
        if data.get("relatedEntityType"):
            record["relatedEntityType"] = data["relatedEntityType"]
        if data.get("relatedEntityId"):
            record["relatedEntityId"] = data["relatedEntityId"]
        if data.get("actionUrl"):
            record["actionUrl"] = data["actionUrl"]
        if data.get("actionLabel"):
            record["actionLabel"] = data["actionLabel"]

        try:
            await insert_record("notification", record)
            created_ids.append(uid)
        except Exception as exc:
            log.warning(f"Failed to create notification for user {uid}: {exc}")

    # Send FCM push
    if data.get("sendPush", True) and created_ids:
        firebase = get_firebase()
        for uid in created_ids:
            await firebase.send_notification(
                user_id=uid,
                title=title,
                message=message,
                data=data.get("data"),
                tenant_id=tenant_id,
                entity_type=data.get("relatedEntityType"),
                entity_id=data.get("relatedEntityId"),
            )

    return {"created": len(created_ids)}


# ── Device token management ─────────────────────────────────────────────────


async def register_device(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Register a device token for push notifications.

    Max 5 devices per user per platform. Older tokens are deactivated.
    """
    if not has_action_permission(user.role, "notification", "manage_devices"):
        # Allow all authenticated users to register their own device
        pass  # self-registration is always allowed

    token = data.get("token")
    platform = data.get("platform")
    if not token or not platform:
        raise ValidationException(message="Token and platform are required")

    # Check if token already exists
    existing = await query_table(
        "deviceToken",
        select="id",
        where={"token": token},
        limit=1,
    )
    existing_records = existing.get("data", [])

    record_data: dict[str, Any] = {
        "userId": user.userId,
        "token": token,
        "platform": platform,
        "isActive": True,
        "updatedAt": utcnow().isoformat(),
    }
    if data.get("browser"):
        record_data["browser"] = data["browser"]
    if data.get("os"):
        record_data["os"] = data["os"]
    if data.get("deviceName"):
        record_data["deviceName"] = data["deviceName"]
    if data.get("userAgent"):
        record_data["userAgent"] = data["userAgent"]

    if existing_records:
        # Update existing token
        await update_record("deviceToken", existing_records[0]["id"], record_data)
        log.info(f"Device token updated for user {user.userId} ({platform})")
    else:
        # Check device count per user/platform
        user_devices = await query_table(
            "deviceToken",
            select="id",
            where={"userId": user.userId, "platform": platform, "isActive": True},
        )
        active_devices = user_devices.get("data", [])

        if len(active_devices) >= MAX_DEVICES_PER_USER_PLATFORM:
            # Deactivate the oldest one
            oldest = active_devices[-1]
            await update_record("deviceToken", oldest["id"], {
                "isActive": False,
                "unregisteredAt": utcnow().isoformat(),
            })

        record_data["id"] = str(uuid.uuid4())
        record_data["tenantId"] = tenant_id
        record_data["createdAt"] = utcnow().isoformat()
        await insert_record("deviceToken", record_data)
        log.info(f"Device token registered for user {user.userId} ({platform})")

    return {"success": True}


async def unregister_device(
    user: AuthUser,
    token: str,
) -> dict[str, Any]:
    """Unregister a device token."""
    if not token:
        raise ValidationException(message="Token is required")

    existing = await query_table(
        "deviceToken",
        select="id",
        where={"token": token},
        limit=1,
    )
    existing_records = existing.get("data", [])

    if existing_records:
        await update_record("deviceToken", existing_records[0]["id"], {
            "isActive": False,
            "unregisteredAt": utcnow().isoformat(),
        })
        log.info(f"Device token unregistered")

    return {"success": True}


async def list_devices(
    tenant_id: str,
    user: AuthUser,
) -> list[dict[str, Any]]:
    """List user's registered devices."""
    is_admin = user.role in ("super_admin", "admin")
    where: dict[str, Any] = {"tenantId": tenant_id}
    if not is_admin:
        where["userId"] = user.userId

    result = await query_table(
        "deviceToken",
        select="id,userId,platform,deviceName,browser,os,isActive,createdAt,unregisteredAt",
        where={**where, "isActive": True},
        order="createdAt.desc",
    )
    return result.get("data", [])


# ── Test notification ───────────────────────────────────────────────────────


async def send_test_notification(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Send a test FCM notification (admin only)."""
    if user.role not in ("super_admin", "admin"):
        raise ForbiddenException(message="Only admins can send test notifications")

    firebase = get_firebase()
    if not firebase.is_configured:
        raise ServiceUnavailableException(
            message="Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
        )

    target_user_id = data.get("userId") or user.userId
    message = data.get("message") or "Real-time notification is working correctly."

    success = await firebase.send_notification(
        user_id=target_user_id,
        title="\U0001f514 Firebase Connected Successfully",
        message=message,
        tenant_id=tenant_id,
    )

    return {"success": success, "message": "Test notification sent"}
