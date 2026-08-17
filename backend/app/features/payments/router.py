"""
Payment feature router.

MOHD.HMS ENTERPRISE

Endpoints:
  POST /api/v1/invoice-payments    - Record a payment on an invoice
  GET  /api/v1/payments/verification - List payment verifications
  PATCH /api/v1/payments/verification - Approve/reject a verification
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user
from app.features.payments import service
from app.features.payments.schemas import PaymentRecordCreate, PaymentVerificationUpdate

router = APIRouter(tags=["payments"])


# Invoice payment recording
invoice_payments_router = APIRouter(prefix="/invoice-payments", tags=["invoice-payments"])


@invoice_payments_router.post("")
async def record_payment(
    body: PaymentRecordCreate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/invoice-payments"""
    return await service.record_payment(
        tenant_id=user.tenantId,
        user=user,
        data=body.model_dump(),
    )


# Payment verification
verification_router = APIRouter(prefix="/payments/verification", tags=["payment-verification"])


@verification_router.get("")
async def list_verifications(
    user: AuthUser = Depends(get_current_user),
    status: str = Query(default="pending"),
):
    """GET /api/v1/payments/verification"""
    return await service.list_verifications(
        tenant_id=user.tenantId,
        user=user,
        status=status,
    )


@verification_router.patch("")
async def update_verification(
    body: PaymentVerificationUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """PATCH /api/v1/payments/verification"""
    return await service.update_verification(
        tenant_id=user.tenantId,
        user=user,
        verification_id=body.id,
        status=body.status,
        notes=body.notes,
    )
