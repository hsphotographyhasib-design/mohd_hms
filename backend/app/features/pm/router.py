"""
Preventive Maintenance feature router — matches Next.js API routes.

MOHD.HMS ENTERPRISE

5 endpoints:
  GET    /api/v1/pm     — List PM schedules
  POST   /api/v1/pm     — Create PM schedule
  GET    /api/v1/pm/{id} — Get PM schedule detail
  PUT    /api/v1/pm/{id} — Update PM schedule
  DELETE /api/v1/pm/{id} — Delete PM schedule
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_permission
from app.features.pm import service
from app.features.pm.schemas import (
    PmScheduleCreate,
    PmScheduleListResponse,
    PmScheduleUpdate,
)

router = APIRouter(tags=["pm"])


# ============================================================================
# COLLECTION ENDPOINTS
# ============================================================================


@router.get("", response_model=PmScheduleListResponse)
async def list_pm_schedules(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    frequency: str | None = Query(default=None),
):
    """GET /api/v1/pm — List PM schedules."""
    result = await service.list_pm_schedules(user.tenantId, user, {
        "page": page,
        "pageSize": pageSize,
        "search": search or "",
        "status": status or "",
        "frequency": frequency or "",
    })
    return result


@router.post("")
async def create_pm_schedule(
    body: PmScheduleCreate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/pm — Create PM schedule."""
    return await service.create_pm_schedule(user.tenantId, user, body.model_dump())


# ============================================================================
# ITEM ENDPOINTS
# ============================================================================


@router.get("/{pm_id}")
async def get_pm_schedule(
    pm_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/pm/{id} — Get PM schedule detail."""
    return await service.get_pm_schedule(pm_id, user.tenantId, user)


@router.put("/{pm_id}")
async def update_pm_schedule(
    pm_id: str,
    body: PmScheduleUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/pm/{id} — Update PM schedule."""
    return await service.update_pm_schedule(pm_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/{pm_id}")
async def delete_pm_schedule(
    pm_id: str,
    user: AuthUser = Depends(require_permission("pm_module.delete")),
):
    """DELETE /api/v1/pm/{id} — Delete PM schedule (admin only)."""
    return await service.delete_pm_schedule(pm_id, user.tenantId, user)
