"""
Service Items feature schemas.

MOHD.HMS ENTERPRISE
"""

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


# -- Service Item --


class ServiceItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None
    categoryId: str | None = None
    defaultLabourRateId: str | None = None
    estimatedHours: float | None = None
    unit: str | None = Field(default="unit")
    isActive: bool = Field(default=True)


class ServiceItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    categoryId: str | None = None
    defaultLabourRateId: str | None = None
    estimatedHours: float | None = None
    unit: str | None = None
    isActive: bool | None = None


# -- Service Category --


class ServiceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None
    isActive: bool = Field(default=True)


class ServiceCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    isActive: bool | None = None


# -- Service Package --


class ServicePackageCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None
    basePrice: Decimal | None = None
    discountPercent: float | None = Field(default=0)
    isActive: bool = Field(default=True)
    items: list[dict[str, Any]] | None = Field(default=None, description="List of {serviceItemId, quantity}")


class ServicePackageUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    basePrice: Decimal | None = None
    discountPercent: float | None = None
    isActive: bool | None = None
    items: list[dict[str, Any]] | None = None


# -- Labour Rate --


class LabourRateCreate(BaseModel):
    name: str = Field(..., min_length=1)
    ratePerHour: Decimal = Field(..., gt=0)
    description: str | None = None
    isActive: bool = Field(default=True)


class LabourRateUpdate(BaseModel):
    name: str | None = None
    ratePerHour: Decimal | None = None
    description: str | None = None
    isActive: bool | None = None


# -- Price Book --


class PriceBookCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None
    isActive: bool = Field(default=True)


class PriceBookUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    isActive: bool | None = None


# -- Checklist Item --


class ChecklistItemCreate(BaseModel):
    description: str = Field(..., min_length=1)
    isRequired: bool = Field(default=True)
    sortOrder: int | None = Field(default=0)


# -- Service Item Material --


class ServiceItemMaterialCreate(BaseModel):
    materialName: str = Field(..., min_length=1)
    quantity: float = Field(default=1, gt=0)
    unit: str | None = Field(default="unit")
    notes: str | None = None
