from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, require_role

from . import service

router = APIRouter(tags=["reports"])


@router.get("")
async def get_reports(
    user: AuthUser = Depends(require_role("super_admin", "admin", "manager", "supervisor", "finance")),
    startDate: str | None = Query(default=None, description="ISO date, e.g. 2025-01-01"),
    endDate: str | None = Query(default=None, description="ISO date, e.g. 2025-12-31"),
):
    """GET /api/v1/reports — Summary statistics with date range filtering."""
    return await service.get_summary_reports(
        tenant_id=user.tenantId,
        start_date=startDate,
        end_date=endDate,
    )
