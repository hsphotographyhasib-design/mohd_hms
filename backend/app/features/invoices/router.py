"""
Invoice feature router — matches Next.js API routes.

MOHD.HMS ENTERPRISE

13 endpoints:
  GET  /api/v1/invoices                        - List invoices (RBAC scoped)
  POST /api/v1/invoices                        - Create invoice
  POST /api/v1/invoices/create                  - Create invoice (alternate)
  GET  /api/v1/invoices/next-number             - Get next invoice number
  GET  /api/v1/invoices/smart-search-customer   - Search customers
  GET  /api/v1/invoices/smart-search-inventory  - Search inventory items
  GET  /api/v1/invoices/{id}                     - Get invoice detail
  PUT  /api/v1/invoices/{id}                     - Update invoice
  DELETE /api/v1/invoices/{id}                   - Delete invoice (admin)
  POST /api/v1/invoices/{id}/status              - Update invoice status
  GET  /api/v1/invoices/{id}/generate-pdf       - Get PDF data
  POST /api/v1/invoices/{id}/send-email          - Send via email
  POST /api/v1/invoices/{id}/send-whatsapp       - Generate WhatsApp link
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role
from app.features.invoices import service
from app.features.invoices.schemas import (
    InvoiceSendEmail,
    InvoiceSendWhatsApp,
    InvoiceStatusUpdate,
)

router = APIRouter(tags=["invoices"])


# ============================================================================
# COLLECTION ENDPOINTS
# ============================================================================


@router.get("")
async def list_invoices(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
    customerId: str = Query(default=""),
    stats: bool = Query(default=False),
):
    """GET /api/v1/invoices"""
    return await service.list_invoices(
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
async def create_invoice(
    body: dict[str, Any],
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/invoices"""
    return await service.create_invoice(
        tenant_id=user.tenantId,
        user=user,
        data=body,
    )


@router.post("/create")
async def create_invoice_alt(
    body: dict[str, Any],
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/invoices/create - alternate endpoint matching frontend"""
    return await service.create_invoice(
        tenant_id=user.tenantId,
        user=user,
        data=body,
    )


@router.get("/next-number")
async def get_next_number(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/invoices/next-number"""
    return await service.get_next_number(user.tenantId)


@router.get("/smart-search-customer")
async def smart_search_customer(
    q: str = Query(default="", min_length=1),
    limit: int = Query(default=8, ge=1, le=50),
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/invoices/smart-search-customer"""
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
    """GET /api/v1/invoices/smart-search-inventory"""
    return await service.smart_search_inventory(
        tenant_id=user.tenantId,
        q=q,
        limit=limit,
        item_type=type,
    )


# ============================================================================
# DETAIL ENDPOINTS
# ============================================================================


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/invoices/{id}"""
    return await service.get_invoice(
        invoice_id=invoice_id,
        tenant_id=user.tenantId,
        user=user,
    )


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/invoices/{id}"""
    return await service.update_invoice(
        invoice_id=invoice_id,
        tenant_id=user.tenantId,
        user=user,
        data=body,
    )


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/invoices/{id} - admin only"""
    await service.delete_invoice(
        invoice_id=invoice_id,
        tenant_id=user.tenantId,
        user=user,
    )
    return {"message": "Invoice deleted successfully"}


@router.post("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    body: InvoiceStatusUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/invoices/{id}/status"""
    return await service.update_status(
        invoice_id=invoice_id,
        tenant_id=user.tenantId,
        user=user,
        status=body.status,
        reason=body.reason,
    )


@router.get("/{invoice_id}/generate-pdf")
async def generate_pdf_data(
    invoice_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/invoices/{id}/generate-pdf - returns PDF data (frontend renders)"""
    return await service.generate_pdf_data(
        invoice_id=invoice_id,
        tenant_id=user.tenantId,
        user=user,
    )


@router.post("/{invoice_id}/send-email")
async def send_email_invoice(
    invoice_id: str,
    body: InvoiceSendEmail | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/invoices/{id}/send-email"""
    return await service.send_email_invoice(
        invoice_id=invoice_id,
        tenant_id=user.tenantId,
        user=user,
        to=body.to if body else None,
        subject=body.subject if body else None,
        cc=body.cc if body else None,
    )


@router.post("/{invoice_id}/send-whatsapp")
async def send_whatsapp_invoice(
    invoice_id: str,
    body: InvoiceSendWhatsApp | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/invoices/{id}/send-whatsapp"""
    return await service.send_whatsapp_invoice(
        invoice_id=invoice_id,
        tenant_id=user.tenantId,
        user=user,
        generate_pdf=body.generatePdf if body else False,
    )
