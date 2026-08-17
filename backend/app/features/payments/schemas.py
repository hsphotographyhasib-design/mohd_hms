"""
Payment schemas — Pydantic models for payment recording and verification.

MOHD.HMS ENTERPRISE
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class PaymentRecordCreate(BaseModel):
    """Schema for recording a payment on an invoice."""
    invoiceId: str
    amount: float
    method: str
    referenceNo: str | None = None
    transactionId: str | None = None
    receiptUrl: str | None = None
    notes: str | None = None


class PaymentVerificationUpdate(BaseModel):
    """Schema for updating a payment verification (approve/reject)."""
    id: str
    status: str  # 'approved' | 'rejected'
    notes: str | None = None
