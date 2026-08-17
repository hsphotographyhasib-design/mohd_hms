"""
Purchase order feature router.

MOHD.HMS ENTERPRISE

Endpoints:
  GET  /api/v1/purchases — List purchase orders
  POST /api/v1/purchases — Create a purchase order
"""

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, require_permission
from app.features.purchases import service
from app.features.purchases.schemas import PurchaseOrderCreate

router = APIRouter(tags=["purchases"])


@router.get("")
async def list_purchase_orders(
    user: AuthUser = Depends(require_permission("purchase.view")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    """GET /api/v1/purchases — List purchase orders."""
    return await service.list_purchase_orders(user.tenantId, user, {
        "page": page,
        "pageSize": pageSize,
        "search": search or "",
        "status": status or "",
    })


@router.post("")
async def create_purchase_order(
    body: PurchaseOrderCreate,
    user: AuthUser = Depends(require_permission("purchase.create")),
):
    """POST /api/v1/purchases — Create a purchase order."""
    return await service.create_purchase_order(user.tenantId, user, body.model_dump())
