"""
Pydantic schemas for the Customers feature module.

MOHD.HMS ENTERPRISE
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerCreate(BaseModel):
    """Schema for creating a new customer."""
    name: str = Field(..., min_length=1, max_length=500)
    email: EmailStr | None = Field(default=None)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=1000)
    companyName: str | None = Field(default=None, max_length=500)
    paymentTerms: str | None = Field(default=None, max_length=100)
    pic: str | None = Field(default=None, max_length=500)
    country: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=200)
    taxRate: float | None = Field(default=None, ge=0, le=100)


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer (all fields optional)."""
    name: str | None = Field(default=None, min_length=1, max_length=500)
    email: EmailStr | None = Field(default=None)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=1000)
    companyName: str | None = Field(default=None, max_length=500)
    paymentTerms: str | None = Field(default=None, max_length=100)
    pic: str | None = Field(default=None, max_length=500)
    country: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=200)
    taxRate: float | None = Field(default=None, ge=0, le=100)
    isActive: bool | None = Field(default=None)


class CustomerResponse(BaseModel):
    """Full customer response schema."""
    id: str
    tenantId: str
    name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    companyName: str | None = None
    customerNumber: str | None = None
    paymentTerms: str | None = None
    pic: str | None = None
    country: str | None = None
    district: str | None = None
    taxRate: float | None = None
    isActive: bool | None = None
    createdAt: Any | None = None
    updatedAt: Any | None = None

    class Config:
        from_attributes = True


class CustomerListParams(BaseModel):
    """Query parameters for listing customers."""
    search: str | None = Field(default=None)
    status: str | None = Field(default=None)
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=25, ge=1, le=100)
