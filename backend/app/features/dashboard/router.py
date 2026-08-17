"""
Dashboard feature router.

MOHD.HMS ENTERPRISE

4 endpoints:
  GET /api/v1/dashboard          — Full dashboard (cached 30s)
  GET /api/v1/dashboard/kpi     — KPI metrics (cached 30s)
  GET /api/v1/dashboard/recent  — Recent activity (cached 30s)
  GET /api/v1/dashboard/charts  — Chart data (cached 60s)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import AuthUser, get_current_user
from app.features.dashboard import service

router = APIRouter(tags=["dashboard"])


@router.get("")
async def get_dashboard(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/dashboard — Full combined dashboard."""
    result = await service.get_full_dashboard(user.tenantId, user.userId, user.role)
    return {"success": True, **result}


@router.get("/kpi")
async def get_kpi(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/dashboard/kpi — KPI metrics."""
    result = await service.get_kpi(user.tenantId, user.userId, user.role)
    return {"success": True, **result}


@router.get("/recent")
async def get_recent(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/dashboard/recent — Recent activity."""
    result = await service.get_recent(user.tenantId, user.userId, user.role)
    return {"success": True, **result}


@router.get("/charts")
async def get_charts(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/dashboard/charts — Chart data."""
    result = await service.get_charts(user.tenantId, user.userId, user.role)
    return {"success": True, **result}
