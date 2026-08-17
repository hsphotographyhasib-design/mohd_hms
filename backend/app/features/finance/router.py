"""
Finance feature router — read-only metrics.

MOHD.HMS ENTERPRISE

Endpoints:
  GET /api/v1/finance — Revenue metrics, invoice summaries, payment summaries
"""

from fastapi import APIRouter, Depends

from app.api.dependencies import AuthUser, require_permission
from app.features.finance import service

router = APIRouter(tags=["finance"])


@router.get("")
async def get_finance_metrics(
    user: AuthUser = Depends(require_permission("finance_module.view")),
):
    """GET /api/v1/finance — Get finance metrics (RBAC: finance/admin only)."""
    return await service.get_finance_metrics(user.tenantId)
