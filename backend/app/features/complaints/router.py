"""
Complaints feature router — matches Next.js API routes exactly.

MOHD.HMS ENTERPRISE

15 endpoints matching the frontend contract:
  GET  /api/v1/complaints                   — List complaints (RBAC scoped)
  POST /api/v1/complaints                   — Create complaint
  GET  /api/v1/complaints/counts               — Status counts (RBAC scoped)
  GET /api/v1/complaints/escalation-rules    — Escalation rules
  POST /api/v1/complaints/escalation-check     — Run escalation check
  GET /api/v1/complaints/my-profile           — Customer profile
  GET  /api/v1/complaints/{id}                 — Get complaint detail
  PUT  /api/v1/complaints/{id}                 — Update complaint fields
  DELETE /api/v1/complaints/{id}              — Delete complaint (admin, NEW only)
  POST /api/v1/complaints/{id}/assign-technician  — Assign technician
  GET  /api/v1/complaints/{id}/assign-technician  — Get available technicians
  POST /api/v1/complaints/{id}/accept-reject      — Accept/reject assignment
  GET /api/v1/complaints/{id}/assignment-history — Assignment history
  POST /api/v1/complaints/{id}/workflow          — Workflow transition
  GET /api/v1/complaints/{id}/workflow          — Get workflow state
"""

from __future__ import annotations
from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.api.dependencies import AuthUser, get_current_user, require_role
from app.features.complaints import service
from app.features.complaints.schemas import (
    ComplaintAcceptReject,
    ComplaintAssign,
    ComplaintCountResponse,
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintWorkflow,
    EscalationCheckResponse,
    EscalationRulesResponse,
)

router = APIRouter(tags=["complaints"])


# ============================================================================
# COLLECTION ENDPOINTS
# ============================================================================


@router.get("/counts", response_model=ComplaintCountResponse)
async def get_complaint_counts(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/complaints/counts"""
    counts = await service.get_counts(user.tenantId, user)
    return {"counts": counts}


@router.get("/escalation-rules", response_model=EscalationRulesResponse)
async def get_escalation_rules(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/complaints/escalation-rules"""
    rules = await service.get_escalation_rules(user)
    return {"rules": rules}


@router.post("/escalation-check", response_model=EscalationCheckResponse)
async def post_escalation_check(
    user: AuthUser = Depends(get_current_user),
    body: dict[str, Any] | None = None,
):
    """POST /api/v1/complaints/escalation-check"""
    target_tenant = None
    if body and body.get("tenantId"):
        target_tenant = body["tenantId"]
    result = await service.check_escalation(user.tenantId, user, target_tenant)
    return result


@router.get("/my-profile")
async def get_my_profile(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/complaints/my-profile"""
    return await service.get_customer_profile(user.tenantId, user)


@router.get("")
async def list_complaints(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    category: str | None = Query(default=None),
    assignedToId: str | None = Query(default=None),
    customerId: str | None = Query(default=None),
    search: str | None = Query(default=None),
    dateFrom: str | None = Query(default=None),
    dateTo: str | None = Query(default=None),
    sortBy: str | None = Query(default=None),
    sortOrder: str | None = Query(default="desc"),
):
    """GET /api/v1/complaints"""
    params = {
        "page": page, "pageSize": pageSize, "status": status, "priority": priority,
        "category": category, "assignedToId": assignedToId, "customerId": customerId,
        "search": search, "dateFrom": dateFrom, "dateTo": dateTo,
        "sortBy": sortBy, "sortOrder": sortOrder,
    }
    return await service.list_complaints(user.tenantId, user, params)


@router.post("", status_code=201)
async def create_complaint(
    body: ComplaintCreate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/complaints"""
    data = body.model_dump(exclude_unset=True)
    return await service.create_complaint(user.tenantId, user, data)


# ============================================================================
# ITEM ENDPOINTS
# ============================================================================


@router.get("/{complaint_id}")
async def get_complaint(
    complaint_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/complaints/{id}"""
    return await service.get_complaint(user.tenantId, user, complaint_id)


@router.put("/{complaint_id}")
async def update_complaint(
    complaint_id: str,
    body: ComplaintUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/complaints/{id}"""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    return await service.update_complaint(user.tenantId, user, complaint_id, data)


@router.delete("/{complaint_id}")
async def delete_complaint(
    complaint_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/complaints/{id}"""
    await service.delete_complaint(user.tenantId, user, complaint_id)
    return {"message": "Complaint deleted successfully"}


# ── Assign Technician ───────────────────────────────────────────────────────────


@router.get("/{complaint_id}/assign-technician")
async def get_available_technicians(
    complaint_id: str,
    user: AuthUser = Depends(get_current_user),
    q: str = Query(default=""),
    status: str = Query(default=""),
    department: str = Query(default=""),
    sortBy: str = Query(default="availability"),
    limit: int = Query(default=25, ge=1, le=50),
):
    """GET /api/v1/complaints/{id}/assign-technician"""
    return await service.get_available_technicians(
        user.tenantId, user, complaint_id, q, status, department, sortBy, limit
    )


@router.post("/{complaint_id}/assign-technician")
async def assign_technician(
    complaint_id: str,
    body: ComplaintAssign,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/complaints/{id}/assign-technician"""
    data = body.model_dump(exclude_unset=True)
    return await service.assign_technician(user.tenantId, user, complaint_id, data)


# ── Accept/Reject ─────────────────────────────────────────────────────────────


@router.post("/{complaint_id}/accept-reject")
async def accept_reject_complaint(
    complaint_id: str,
    body: ComplaintAcceptReject,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/complaints/{id}/accept-reject"""
    data = body.model_dump(exclude_unset=True)
    return await service.accept_reject_complaint(user.tenantId, user, complaint_id, data)


# ── Assignment History ──────────────────────────────────────────────────────────


@router.get("/{complaint_id}/assignment-history")
async def get_assignment_history(
    complaint_id: str,
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=50, alias="pageSize"),
):
    """GET /api/v1/complaints/{id}/assignment-history"""
    return await service.get_assignment_history(user.tenantId, complaint_id, user, page, pageSize)


# ── Workflow ───────────────────────────────────────────────────────────────


@router.get("/{complaint_id}/workflow")
async def get_workflow_state(
    complaint_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/complaints/{id}/workflow"""
    return await service.get_workflow_state(user.tenantId, user, complaint_id)


@router.post("/{complaint_id}/workflow")
async def process_workflow(
    complaint_id: str,
    body: ComplaintWorkflow,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/complaints/{id}/workflow"""
    data = body.model_dump(exclude_unset=True)
    return await service.process_workflow(user.tenantId, user, complaint_id, data)
