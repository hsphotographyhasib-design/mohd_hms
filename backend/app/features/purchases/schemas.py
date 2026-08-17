"""
Pydantic schemas for the Purchases feature module.

MOHD.HMS ENTERPRISE
"""

from typing import Any

from pydantic import BaseModel, Field


class PurchaseOrderCreate(BaseModel):
    """Schema for creating a purchase order."""
    supplier: str = Field(..., min_length=1, max_length=500)
    supplierContact: str | None = Field(default=None)
    items: list[dict[str, Any]] | None = Field(default=None)
    subtotal: float = Field(default=0)
    tax: float = Field(default=0)
    total: float = Field(default=0)
    status: str = Field(default="DRAFT")
    expectedDate: str | None = Field(default=None)
    notes: str | None = Field(default=None)


class PurchaseOrderUpdate(BaseModel):
    """Schema for updating a purchase order."""
    supplier: str | None = Field(default=None)
    supplierContact: str | None = Field(default=None)
    items: list[dict[str, Any]] | None = Field(default=None)
    subtotal: float | None = Field(default=None)
    tax: float | None = Field(default=None)
    total: float | None = Field(default=None)
    status: str | None = Field(default=None)
    expectedDate: str | None = Field(default=None)
    receivedAt: str | None = Field(default=None)
    notes: str | None = Field(default=None)


class PurchaseListResponse(BaseModel):
    """Paginated purchase order list response."""
    data: list[dict[str, Any]]
    total: int
    page: int
    pageSize: int
    totalPages: int
