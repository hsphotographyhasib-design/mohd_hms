"""
Invoice schemas — Pydantic models for request/response validation.

MOHD.HMS ENTERPRISE

Financial calculations are SERVER-AUTHORITATIVE. The backend
NEVER trusts frontend-submitted totals. All totals are
recalculated from line items on every create/update.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class InvoiceStatus(StrEnum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    SENT = "SENT"
    VIEWED = "VIEWED"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"
    CLOSED = "CLOSED"


#: Valid invoice status transitions
INVOICE_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "DRAFT": {"REVIEW", "SENT", "CANCELLED"},
    "REVIEW": {"APPROVED", "REJECTED", "DRAFT"},
    "APPROVED": {"SENT", "DRAFT"},
    "SENT": {"VIEWED", "PARTIALLY_PAID", "PAID", "CANCELLED"},
    "VIEWED": {"PARTIALLY_PAID", "PAID", "CANCELLED"},
    "PARTIALLY_PAID": {"PAID", "CANCELLED"},
    "PAID": {"CLOSED"},
    "OVERDUE": {"PAID", "CANCELLED"},
    "CANCELLED": set(),
    "CLOSED": set(),
}


class InvoiceCreate(BaseModel):
    customerId: str
    title: str
    workOrderId: str | None = None
    quotationId: str | None = None
    description: str | None = None
    items: list[dict[str, Any]] = []
    terms: list[dict[str, Any]] | None = None
    currency: str = "BND"
    subtotal: float | None = None  # IGNORED — recalculated server-side
    taxRate: float = 0
    discount: float = 0
    shipping: float = 0
    paymentTerms: str | None = None
    dueDate: str | None = None
    referenceNo: str | None = None
    poReference: str | None = None
    notes: str | None = None
    shipToName: str | None = None
    shipToAddress: str | None = None
    shipToPhone: str | None = None
    shipToContact: str | None = None
    preparedBy: str | None = None


class InvoiceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    items: list[dict[str, Any]] | None = None
    currency: str | None = None
    referenceNo: str | None = None
    poReference: str | None = None
    paymentTerms: str | None = None
    dueDate: str | None = None
    pdfUrl: str | None = None
    notes: str | None = None
    terms: list[dict[str, Any]] | None = None
    shipToName: str | None = None
    shipToAddress: str | None = None
    shipToPhone: str | None = None
    shipToContact: str | None = None
    preparedBy: str | None = None
    bankName: str | None = None
    bankAccountName: str | None = None
    bankAccountNo: str | None = None
    transactionId: str | None = None
    # These trigger recalculation
    taxRate: float | None = None
    discount: float | None = None
    shipping: float | None = None


class InvoiceStatusUpdate(BaseModel):
    status: str
    reason: str | None = None


class InvoiceSendEmail(BaseModel):
    to: str | None = None
    subject: str | None = None
    body: str | None = None
    cc: str | None = None


class InvoiceSendWhatsApp(BaseModel):
    generatePdf: bool = False


class InvoiceResponse(BaseModel):
    id: str
    tenantId: str
    customerId: str
    customerName: str | None = None
    customer: dict[str, Any] | None = None
    workOrderId: str | None = None
    workOrderTitle: str | None = None
    quotationId: str | None = None
    quotationNo: str | None = None
    invoiceNumber: str | None = None
    title: str | None = None
    description: str | None = None
    items: Any = None
    terms: Any = None
    currency: str = "BND"
    subtotal: float = 0
    taxRate: float = 0
    tax: float = 0
    discount: float = 0
    shipping: float = 0
    total: float = 0
    status: str = "DRAFT"
    referenceNo: str | None = None
    poReference: str | None = None
    paymentTerms: str | None = None
    dueDate: str | None = None
    paidAt: str | None = None
    paymentMethod: str | None = None
    paymentRef: str | None = None
    transactionId: str | None = None
    sentVia: str | None = None
    pdfUrl: str | None = None
    notes: str | None = None
    shipToName: str | None = None
    shipToAddress: str | None = None
    shipToPhone: str | None = None
    shipToContact: str | None = None
    preparedBy: str | None = None
    preparedByName: str | None = None
    createdBy: str | None = None
    creatorName: str | None = None
    approvedBy: str | None = None
    approvedAt: str | None = None
    sentAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    amountPaid: float = 0
    balanceDue: float = 0
    model_config = ConfigDict(extra="allow")
