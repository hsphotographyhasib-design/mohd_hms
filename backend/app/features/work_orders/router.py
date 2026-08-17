from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_permission, require_role
from app.features.work_orders import service
from app.features.work_orders.schemas import (
    ChecklistListResponse,
    FeedbackResponse,
    NextNumberResponse,
    WorkOrderCreate,
    WorkOrderFeedback,
    WorkOrderListResponse,
    WorkOrderUpdate,
)

router = APIRouter(tags=["work-orders"])


# ============================================================================
# COLLECTION ENDPOINTS
# ============================================================================


@router.get("", response_model=WorkOrderListResponse)
async def list_work_orders(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    type: str | None = Query(default=None),
):
    """GET /api/v1/work-orders — List work orders (RBAC scoped)."""
    result = await service.list_work_orders(user.tenantId, user, {
        "page": page,
        "pageSize": pageSize,
        "search": search or "",
        "status": status or "",
        "type": type or "",
    })
    return result


@router.post("")
async def create_work_order(
    body: WorkOrderCreate,
    user: AuthUser = Depends(require_permission("work-order.create")),
):
    """POST /api/v1/work-orders — Create a work order."""
    wo = await service.create_work_order(user.tenantId, user, body.model_dump())
    return wo


@router.get("/next-number", response_model=NextNumberResponse)
async def get_next_number(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/work-orders/next-number — Get next WO number (cached 120s)."""
    return await service.get_next_number(user.tenantId, user)


@router.get("/checklists", response_model=ChecklistListResponse)
async def get_checklists(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/work-orders/checklists — List checklist templates."""
    return await service.get_checklists(user.tenantId, user)


# ============================================================================
# ITEM ENDPOINTS
# ============================================================================


@router.get("/{wo_id}")
async def get_work_order(
    wo_id: str,
    user: AuthUser = Depends(require_permission("work-order.view")),
):
    """GET /api/v1/work-orders/{id} — Get work order detail."""
    return await service.get_work_order(wo_id, user.tenantId, user)


@router.put("/{wo_id}")
async def update_work_order(
    wo_id: str,
    body: WorkOrderUpdate,
    user: AuthUser = Depends(require_permission("work-order.update")),
):
    """PUT /api/v1/work-orders/{id} — Update work order."""
    return await service.update_work_order(wo_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/{wo_id}")
async def delete_work_order(
    wo_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/work-orders/{id} — Delete work order (admin only)."""
    return await service.delete_work_order(wo_id, user.tenantId, user)


# ============================================================================
# SUB-RESOURCE ENDPOINTS
# ============================================================================


@router.post("/{wo_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    wo_id: str,
    body: WorkOrderFeedback,
    user: AuthUser = Depends(require_permission("work-order.provide_feedback")),
):
    """POST /api/v1/work-orders/{id}/feedback — Submit customer feedback."""
    return await service.submit_feedback(wo_id, user.tenantId, user, body.rating, body.comment)
