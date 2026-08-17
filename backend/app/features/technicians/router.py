"""
Technicians router — centralized technician data endpoints.

MOHD.HMS ENTERPRISE

This is the SINGLE source of technician data for the entire system.
Mounted at /api/v1/technicians.

Response formats match the frontend:
  - List: { stats: {...}, technicians: [...], pagination: {...} }
  - Detail: flat object with nested activeComplaints, performance, etc.
  - Timeline: { technicianId, technicianName, date, attendance, timeline, summary }
  - Performance: { technicianId, technicianName, completedJobs, ... }
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, require_permission
from app.core.logging import get_logger

from . import service as tech_svc

log = get_logger(__name__)

router = APIRouter()


@router.get("")
async def list_technicians(
    user: AuthUser = Depends(require_permission("technicians")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=50, alias="pageSize"),
    search: str = Query(default=""),
    department: str = Query(default=""),
    status: str = Query(default=""),
    skill: str = Query(default=""),
    sortBy: str = Query(default="name"),
):
    """GET /api/v1/technicians — List all technicians/supervisors with KPI stats.

    Returns: { stats: {...}, technicians: [...], pagination: {...} }
    """
    return await tech_svc.list_technicians(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search,
        department=department,
        status=status,
        skill=skill,
        sort_by=sortBy,
    )


@router.get("/available")
async def list_available_technicians(
    user: AuthUser = Depends(require_permission("technicians")),
    search: str = Query(default=""),
    department: str = Query(default=""),
):
    """GET /api/v1/technicians/available — List available technicians for assignment.

    Returns same shape as list but filtered to available status.
    """
    return await tech_svc.get_available_technicians(
        tenant_id=user.tenantId,
        search=search,
        department=department,
    )


@router.get("/{tech_id}")
async def get_technician(
    tech_id: str,
    user: AuthUser = Depends(require_permission("technicians")),
):
    """GET /api/v1/technicians/{id} — Get technician full detail.

    Returns flat object with activeComplaints, activeWorkOrders, performance, etc.
    """
    return await tech_svc.get_technician(user.tenantId, tech_id)


@router.get("/{tech_id}/timeline")
async def get_technician_timeline(
    tech_id: str,
    user: AuthUser = Depends(require_permission("technicians")),
):
    """GET /api/v1/technicians/{id}/timeline — Get today's activity timeline.

    Returns: { technicianId, technicianName, date, attendance, timeline, summary }
    """
    return await tech_svc.get_technician_timeline(user.tenantId, tech_id)


@router.get("/{tech_id}/performance")
async def get_technician_performance(
    tech_id: str,
    user: AuthUser = Depends(require_permission("technicians")),
):
    """GET /api/v1/technicians/{id}/performance — Get performance metrics.

    Returns: { technicianId, technicianName, completedJobs, pendingJobs, slaCompliance, ... }
    """
    return await tech_svc.get_technician_performance(user.tenantId, tech_id)
