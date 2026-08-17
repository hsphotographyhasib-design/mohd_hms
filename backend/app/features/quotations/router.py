
"""
Quotation feature router — matches Next.js API routes.

MOHD.HMS ENTERPRISE

16 endpoints:
  GET  /api/v1/quotations                        — List quotations (RBAC scoped)
  POST /api/v1/quotations                        — Create quotation
  POST /api/v1/quotations/create                  — Create quotation (alternate)
  GET  /api/v1/quotations/next-number             — Get next quotation number
  GET  /api/v1/quotations/smart-search-customer   — Search customers
  GET  /api/v1/quotations/smart-search-inventory  — Search inventory items
  GET  /api/v1/quotations/item-suggestions        — Historical item suggestions
  GET  /api/v1/quotations/{id}                     — Get quotation detail
  PUT  /api/v1/quotations/{id}                     — Update quotation
  DELETE /api/v1/quotations/{id}                   — Delete quotation (admin, draft only)
  POST /api/v1/quotations/{id}/status              — Update quotation status
  GET  /api/v1/quotations/{id}/generate-pdf       — Get PDF data
  POST /api/v1/quotations/{id}/send-email          — Send via email
  POST /api/v1/quotations/{id}/send-whatsapp       — Generate WhatsApp link
  POST /api/v1/quotations/{id}/convert-wo          — Convert to Work Order
  POST /api/v1/quotations/{id}/convert-invoice     — Convert to Invoice
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role
from app.features.quotations import service
from app.features.quotations.schemas import (
    QuotationCreate,
    QuotationSendEmail,
    QuotationSendWhatsApp,
    QuotationStatusUpdate,
    QuotationUpdate,
)

router = APIRouter(tags=["quotations"])


# ============================================================================
# COLLECTION ENDPOINTS
# ============================================================================


@router.get("")
async def list_quotations(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
    customerId: str = Query(default=""),
    stats: bool = Query(default=False),
):
    """GET /api/v1/quotations"""
    return await service.list_quotations(
        tenant_id=user.tenantId,
        user=user,
        page=page,
        page_size=pageSize,
        search=search,
        status=status,
        customer_id=customerId,
        stats=stats,
    )


@router.post("")
async def create_quotation(
    body: dict[str, Any],
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/quotations"""
    result = await service.create_quotation(
        tenant_id=user.tenantId,
        user=user,
        data=body,
    )
    return result


@router.post("/create")
async def create_quotation_alt(
    body: dict[str, Any],
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/quotations/create — alternate create endpoint matching frontend"""
    result = await service.create_quotation(
        tenant_id=user.tenantId,
        user=user,
        data=body,
    )
    return result


@router.get("/next-number")
async def get_next_number(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/quotations/next-number"""
    return await service.get_next_number(user.tenantId)


@router.get("/smart-search-customer")
async def smart_search_customer(
    q: str = Query(default="", min_length=1),
    limit: int = Query(default=8, ge=1, le=50),
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/quotations/smart-search-customer"""
    return await service.smart_search_customer(
        tenant_id=user.tenantId,
        q=q,
        limit=limit,
    )


@router.get("/smart-search-inventory")
async def smart_search_inventory(
    q: str = Query(default="", min_length=2),
    limit: int = Query(default=10, ge=1, le=50),
    type: str = Query(default=""),
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/quotations/smart-search-inventory"""
    return await service.smart_search_inventory(
        tenant_id=user.tenantId,
        q=q,
        limit=limit,
        item_type=type,
    )


@router.get("/item-suggestions")
async def get_item_suggestions(
    q: str = Query(default="", min_length=2),
    limit: int = Query(default=10, ge=1, le=50),
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/quotations/item-suggestions"""
    return await service.get_item_suggestions(
        tenant_id=user.tenantId,
        q=q,
        limit=limit,
    )


# ============================================================================
# DETAIL ENDPOINTS
# ============================================================================


@router.get("/{quotation_id}")
async def get_quotation(
    quotation_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/quotations/{id}"""
    return await service.get_quotation(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
    )


@router.put("/{quotation_id}")
async def update_quotation(
    quotation_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/quotations/{id}"""
    return await service.update_quotation(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
        data=body,
    )


@router.delete("/{quotation_id}")
async def delete_quotation(
    quotation_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/quotations/{id} — admin only"""
    await service.delete_quotation(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
    )
    return {"message": "Quotation deleted successfully"}


@router.post("/{quotation_id}/status")
async def update_quotation_status(
    quotation_id: str,
    body: QuotationStatusUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/quotations/{id}/status"""
    return await service.update_status(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
        status=body.status,
        notes=body.notes,
    )


@router.get("/{quotation_id}/generate-pdf")
async def generate_pdf_data(
    quotation_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/quotations/{id}/generate-pdf — returns PDF data (frontend renders)"""
    return await service.generate_pdf_data(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
    )


@router.post("/{quotation_id}/send-email")
async def send_email_quotation(
    quotation_id: str,
    body: QuotationSendEmail | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/quotations/{id}/send-email"""
    return await service.send_email_quotation(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
        to=body.to if body else None,
        subject=body.subject if body else None,
        cc=body.cc if body else None,
    )


@router.post("/{quotation_id}/send-whatsapp")
async def send_whatsapp_quotation(
    quotation_id: str,
    body: QuotationSendWhatsApp | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/quotations/{id}/send-whatsapp"""
    return await service.send_whatsapp_quotation(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
        generate_pdf=body.generatePdf if body else False,
    )


@router.post("/{quotation_id}/convert-wo")
async def convert_to_wo(
    quotation_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/quotations/{id}/convert-wo"""
    return await service.convert_to_work_order(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
    )


@router.post("/{quotation_id}/convert-invoice")
async def convert_to_invoice(
    quotation_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/quotations/{id}/convert-invoice"""
    return await service.convert_to_invoice(
        quotation_id=quotation_id,
        tenant_id=user.tenantId,
        user=user,
    )
