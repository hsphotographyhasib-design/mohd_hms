"""
Equipment feature router — matches Next.js API routes exactly.

MOHD.HMS ENTERPRISE

9 endpoints:
  GET  /api/v1/equipment               — List equipment (RBAC scoped)
  POST /api/v1/equipment               — Create equipment
  POST /api/v1/equipment/bulk-qr      — Bulk QR generation
  GET  /api/v1/equipment/qr-analytics  — QR scan analytics
  GET  /api/v1/equipment/qr/{id}       — Get QR info
  POST /api/v1/equipment/qr/{id}       — Regenerate QR code
  GET  /api/v1/equipment/{id}           — Get equipment detail
  PUT  /api/v1/equipment/{id}           — Update equipment
  DELETE /api/v1/equipment/{id}         — Delete equipment (admin only)
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_permission, require_role
from app.features.equipment import service
from app.features.equipment.schemas import (
    BulkQrRequest,
    BulkQrResponse,
    EquipmentCreate,
    EquipmentListResponse,
    EquipmentUpdate,
    QrAnalyticsResponse,
    QrRegenerateResponse,
)

router = APIRouter(tags=["equipment"])


# ============================================================================
# COLLECTION ENDPOINTS
# ============================================================================


@router.get("", response_model=EquipmentListResponse)
async def list_equipment(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status: str | None = Query(default=None),
    customerId: str | None = Query(default=None),
):
    """GET /api/v1/equipment — List equipment (RBAC scoped)."""
    result = await service.list_equipment(user.tenantId, user, {
        "page": page,
        "pageSize": pageSize,
        "search": search or "",
        "category": category or "",
        "status": status or "",
        "customerId": customerId or "",
    })
    return result


@router.post("")
async def create_equipment(
    body: EquipmentCreate,
    user: AuthUser = Depends(require_permission("equipment.create")),
):
    """POST /api/v1/equipment — Create equipment."""
    return await service.create_equipment(user.tenantId, user, body.model_dump())


@router.post("/bulk-qr", response_model=BulkQrResponse)
async def bulk_generate_qr(
    body: BulkQrRequest,
    user: AuthUser = Depends(require_permission("equipment.bulk_qr")),
):
    """POST /api/v1/equipment/bulk-qr — Generate QR codes for multiple equipment."""
    return await service.bulk_generate_qr(user.tenantId, user, body.equipmentIds)


@router.get("/qr-analytics", response_model=QrAnalyticsResponse)
async def get_qr_analytics(
    user: AuthUser = Depends(get_current_user),
    equipmentId: str | None = Query(default=None, alias="equipmentId"),
    period: str = Query(default="last_30_days"),
):
    """GET /api/v1/equipment/qr-analytics — QR scan analytics."""
    return await service.get_qr_analytics(user.tenantId, user, equipmentId, period)


# ============================================================================
# QR SUB-RESOURCE ENDPOINTS
# ============================================================================


@router.get("/qr/{equip_id}")
async def get_qr_info(
    equip_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/equipment/qr/{id} — Get QR code info for equipment."""
    return await service.lookup_qr(equip_id, user.tenantId, user)


@router.post("/qr/{equip_id}", response_model=QrRegenerateResponse)
async def regenerate_qr(
    equip_id: str,
    user: AuthUser = Depends(require_permission("equipment.update")),
):
    """POST /api/v1/equipment/qr/{id} — Regenerate QR code."""
    return await service.regenerate_qr(equip_id, user.tenantId, user)


# ============================================================================
# ITEM ENDPOINTS
# ============================================================================


@router.get("/{equip_id}")
async def get_equipment(
    equip_id: str,
    user: AuthUser = Depends(require_permission("equipment.view")),
):
    """GET /api/v1/equipment/{id} — Get equipment detail."""
    return await service.get_equipment(equip_id, user.tenantId, user)


@router.put("/{equip_id}")
async def update_equipment(
    equip_id: str,
    body: EquipmentUpdate,
    user: AuthUser = Depends(require_permission("equipment.update")),
):
    """PUT /api/v1/equipment/{id} — Update equipment."""
    return await service.update_equipment(equip_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/{equip_id}")
async def delete_equipment(
    equip_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/equipment/{id} — Delete equipment (admin only)."""
    return await service.delete_equipment(equip_id, user.tenantId, user)
