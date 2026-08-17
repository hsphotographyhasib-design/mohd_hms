"""
Pydantic schemas for the Equipment feature module.

MOHD.HMS ENTERPRISE

All request/response schemas matching the frontend API contract.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EquipmentCreate(BaseModel):
    """Schema for creating new equipment."""
    name: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., min_length=1)
    customerId: str | None = Field(default=None)
    assetNumber: str | None = Field(default=None)
    brand: str | None = Field(default=None)
    model: str | None = Field(default=None)
    serialNumber: str | None = Field(default=None)
    location: str | None = Field(default=None)
    building: str | None = Field(default=None)
    room: str | None = Field(default=None)
    installDate: str | None = Field(default=None)
    warrantyExpiry: str | None = Field(default=None)
    warrantyInfo: str | None = Field(default=None)
    status: str = Field(default="active")
    condition: str = Field(default="good")
    photos: list[Any] | None = Field(default=None)
    documents: list[Any] | None = Field(default=None)
    specifications: dict[str, Any] | None = Field(default=None)
    notes: str | None = Field(default=None)


class EquipmentUpdate(BaseModel):
    """Schema for updating equipment."""
    name: str | None = Field(default=None)
    category: str | None = Field(default=None)
    customerId: str | None = Field(default=None)
    brand: str | None = Field(default=None)
    model: str | None = Field(default=None)
    serialNumber: str | None = Field(default=None)
    location: str | None = Field(default=None)
    building: str | None = Field(default=None)
    room: str | None = Field(default=None)
    installDate: str | None = Field(default=None)
    warrantyExpiry: str | None = Field(default=None)
    warrantyInfo: str | None = Field(default=None)
    status: str | None = Field(default=None)
    condition: str | None = Field(default=None)
    photos: list[Any] | None = Field(default=None)
    documents: list[Any] | None = Field(default=None)
    specifications: dict[str, Any] | None = Field(default=None)
    notes: str | None = Field(default=None)


class EquipmentResponse(BaseModel):
    """Full equipment response matching frontend contract."""
    id: str
    tenantId: str
    customerId: str | None = None
    customerName: str | None = None
    name: str
    category: str
    assetNumber: str | None = None
    qrCode: str | None = None
    qrId: str | None = None
    brand: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    location: str | None = None
    building: str | None = None
    room: str | None = None
    installDate: str | None = None
    warrantyExpiry: str | None = None
    warrantyInfo: str | None = None
    status: str
    condition: str | None = None
    scanCount: int | None = None
    lastScannedAt: str | None = None
    photos: Any = None
    documents: Any = None
    specifications: Any = None
    notes: str | None = None
    createdAt: str
    updatedAt: str
    _count: dict[str, int] | None = None

    model_config = {"from_attributes": True}


class EquipmentListResponse(BaseModel):
    """Paginated equipment list response."""
    data: list[dict[str, Any]]
    total: int
    page: int
    pageSize: int
    totalPages: int


class BulkQrRequest(BaseModel):
    """Schema for bulk QR code generation."""
    equipmentIds: list[str] = Field(..., min_length=1, max_length=100)


class BulkQrResponse(BaseModel):
    """Response for bulk QR generation."""
    success: bool
    count: int
    data: list[dict[str, Any]]


class QrLookupResult(BaseModel):
    """QR code lookup result."""
    id: str
    name: str
    assetNumber: str | None = None
    qrId: str | None = None
    qrCode: str | None = None
    scanCount: int | None = None
    lastScannedAt: str | None = None
    qrCodeRecord: dict[str, Any] | None = None
    recentScans: list[dict[str, Any]] | None = None


class QrRegenerateResponse(BaseModel):
    """Response for QR regeneration."""
    success: bool
    message: str
    data: dict[str, Any]


class QrAnalyticsResponse(BaseModel):
    """Response for QR analytics."""
    totalScans: int
    uniqueScanners: int
    topEquipment: list[dict[str, Any]]
    recentScans: list[dict[str, Any]]
    dailyTrend: list[dict[str, Any]]
    deviceBreakdown: dict[str, int]


class EquipmentListParams(BaseModel):
    """Query parameters for listing equipment."""
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None)
    category: str | None = Field(default=None)
    status: str | None = Field(default=None)
    customerId: str | None = Field(default=None)
