from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.api.dependencies import AuthUser, get_current_user
from app.features.presence import service
from app.features.presence.schemas import PresenceUpdate

router = APIRouter(tags=["presence"])


@router.put("")
async def update_presence(
    body: PresenceUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/presence — Update own presence state."""
    result = await service.update_presence(
        tenant_id=user.tenantId,
        user=user,
        state=body.state,
        device_info=body.deviceInfo,
    )
    return {"success": True, **result}


@router.get("")
async def get_presence(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/presence — Get own presence state."""
    result = await service.get_presence(user.tenantId, user)
    if not result:
        return {"success": True, "state": "OFFLINE", "lastSeen": None}
    return {"success": True, **result}


@router.post("/heartbeat")
async def heartbeat(
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/presence/heartbeat — Extend online timeout to 2 minutes."""
    result = await service.heartbeat(user.tenantId, user)
    return {"success": True, **result}


@router.get("/online")
async def get_online_users(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/presence/online — List all online users in tenant."""
    users = await service.get_online_users(user.tenantId, user)
    return {"success": True, "users": users}
