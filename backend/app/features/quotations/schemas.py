"""
Quotation schemas — Pydantic models for request/response validation.

MOHD.HMS ENTERPRISE

Financial calculations are SERVER-AUTHORITATIVE. The backend
NEVER trusts frontend-submitted totals. All totals are
recalculated from line items on every create/update.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class LineItemType(StrEnum):
    inventory = "inventory"
    labour = "labour"
    service = "service"
    custom = "custom"


class LineItem(BaseModel):
    itemType: str = Field(default="custom", description="inventory|labour|service|custom")
    itemId: str | None = None
    description: str = ""
    quantity: float = 0
    unit: str = "Nos"
    unitPrice: float = 0
    discount: float = 0
    taxRate: float = 0
    # Computed fields (populated by service, ignored from input)
    lineSubtotal: float | None = None
    lineDiscountAmount: float | None = None
    lineTaxAmount: float | None = None
    lineTotal: float | None = None
    # Legacy fields for frontend compat
    title: str | None = None
    rate: float | None = None
    amount: float | None = None
    category: str | None = None
    warranty: str | None = None


class QuotationStatus(StrEnum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CONVERTED_WO = "CONVERTED_WO"
    CONVERTED_INVOICE = "CONVERTED_INVOICE"
    PAID = "PAID"
    CLOSED = "CLOSED"


ALL_QUOTATION_STATUSES = set(QuotationStatus)


#: Valid status transitions (from -> set of allowed target statuses)
QUOTATION_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "DRAFT": {"REVIEW", "REJECTED"},
    "REVIEW": {"APPROVED", "REJECTED", "DRAFT"},
    "APPROVED": {"SENT", "DRAFT"},
    "SENT": {"ACCEPTED", "EXPIRED"},
    "ACCEPTED": {"CONVERTED_WO", "CONVERTED_INVOICE", "CLOSED"},
    "REJECTED": {"DRAFT"},
    "EXPIRED": {"DRAFT"},
    "CONVERTED_WO": {"CLOSED", "PAID"},
    "CONVERTED_INVOICE": {"PAID", "CLOSED"},
    "PAID": {"CLOSED"},
    "CLOSED": set(),
}


class QuotationCreate(BaseModel):
    customerId: str
    title: str
    description: str | None = None
    referenceNo: str | None = None
    projectName: str | None = None
    site: str | None = None
    complaintId: str | None = None
    items: list[LineItem] = []
    terms: list[dict[str, Any]] | None = None
    currency: str = "BND"
    subtotal: float | None = None  # IGNORED — recalculated server-side
    taxRate: float = 0
    discount: float = 0
    shipping: float = 0
    validUntil: str | None = None
    notes: str | None = None


class QuotationUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    referenceNo: str | None = None
    projectName: str | None = None
    site: str | None = None
    preparedBy: str | None = None
    complaintId: str | None = None
    items: list[LineItem] | None = None
    terms: list[dict[str, Any]] | None = None
    currency: str | None = None
    validUntil: str | None = None
    pdfUrl: str | None = None
    notes: str | None = None
    # These trigger recalculation if provided
    taxRate: float | None = None
    discount: float | None = None
    shipping: float | None = None


class QuotationStatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class QuotationSendEmail(BaseModel):
    to: str | None = None
    subject: str | None = None
    body: str | None = None
    cc: str | None = None


class QuotationSendWhatsApp(BaseModel):
    generatePdf: bool = False


class QuotationConvertWO(BaseModel):
    pass


class QuotationConvertInvoice(BaseModel):
    pass


class QuotationResponse(BaseModel):
    id: str
    tenantId: str
    customerId: str
    customerName: str | None = None
    customer: dict[str, Any] | None = None
    complaintId: str | None = None
    quotationNo: str | None = None
    title: str | None = None
    description: str | None = None
    referenceNo: str | None = None
    projectName: str | None = None
    site: str | None = None
    preparedBy: str | None = None
    preparedByName: str | None = None
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
    validUntil: str | None = None
    approvedBy: str | None = None
    approvedAt: str | None = None
    sentAt: str | None = None
    acceptedAt: str | None = None
    pdfUrl: str | None = None
    notes: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    class Config:
        extra = "allow"


class QuotationListParams(BaseModel):
    page: int = 1
    pageSize: int = 20
    search: str = ""
    status: str = ""
    customerId: str = ""
    stats: bool = False
