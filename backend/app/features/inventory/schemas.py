"""
Pydantic schemas for the Inventory feature module.

MOHD.HMS ENTERPRISE

All request/response schemas matching the frontend API contract.
"""

from typing import Any

from pydantic import BaseModel, Field


# ── Inventory Item Schemas ─────────────────────────────────────────────────────


class InventoryItemCreate(BaseModel):
    """Schema for creating an inventory item."""
    name: str = Field(..., min_length=1, max_length=500)
    sku: str | None = Field(default=None)
    barcode: str | None = Field(default=None)
    shortName: str | None = Field(default=None)
    itemType: str = Field(default="inventory")
    categoryId: str | None = Field(default=None)
    subcategoryId: str | None = Field(default=None)
    description: str | None = Field(default=None)
    shortDescription: str | None = Field(default=None)
    brand: str | None = Field(default=None)
    manufacturer: str | None = Field(default=None)
    model: str | None = Field(default=None)
    partNumber: str | None = Field(default=None)
    serialNumber: str | None = Field(default=None)
    unit: str = Field(default="pcs")
    unitWeight: float | None = Field(default=None)
    dimensions: dict[str, Any] | None = Field(default=None)
    purchaseCost: float = Field(default=0)
    averageCost: float = Field(default=0)
    standardCost: float = Field(default=0)
    lastPurchaseCost: float = Field(default=0)
    sellingPrice: float = Field(default=0)
    dealerPrice: float = Field(default=0)
    contractorPrice: float = Field(default=0)
    customerPrice: float = Field(default=0)
    vipPrice: float = Field(default=0)
    internalCost: float = Field(default=0)
    labourCost: float = Field(default=0)
    installationCost: float = Field(default=0)
    serviceCost: float = Field(default=0)
    transportationCost: float = Field(default=0)
    mobilizationCost: float = Field(default=0)
    equipmentRental: float = Field(default=0)
    emergencyCallOut: float = Field(default=0)
    afterHoursCharge: float = Field(default=0)
    weekendCharge: float = Field(default=0)
    publicHolidayCharge: float = Field(default=0)
    currency: str = Field(default="BND")
    quantity: float = Field(default=0)
    minStock: float = Field(default=0)
    maxStock: float | None = Field(default=None)
    reorderLevel: float = Field(default=0)
    safetyStock: float = Field(default=0)
    photos: list[Any] | None = Field(default=None)
    attachments: list[Any] | None = Field(default=None)
    technicalDatasheet: str | None = Field(default=None)
    msds: str | None = Field(default=None)
    warranty: str | None = Field(default=None)
    warrantyExpiry: str | None = Field(default=None)
    countryOfOrigin: str | None = Field(default=None)
    hsCode: str | None = Field(default=None)
    tags: list[str] | None = Field(default=None)
    status: str = Field(default="draft")
    remarks: str | None = Field(default=None)
    hourlyRate: float | None = Field(default=None)
    dailyRate: float | None = Field(default=None)
    overtimeRate: float | None = Field(default=None)
    weekendRate: float | None = Field(default=None)
    publicHolidayRate: float | None = Field(default=None)
    dailyRentalRate: float | None = Field(default=None)
    monthlyRentalRate: float | None = Field(default=None)
    estimatedHours: float | None = Field(default=None)
    requiredSkills: list[str] | None = Field(default=None)
    sop: str | None = Field(default=None)
    suppliers: list[dict[str, Any]] | None = Field(default=None)


class InventoryItemUpdate(BaseModel):
    """Schema for updating an inventory item (all optional)."""
    name: str | None = Field(default=None)
    sku: str | None = Field(default=None)
    barcode: str | None = Field(default=None)
    shortName: str | None = Field(default=None)
    itemType: str | None = Field(default=None)
    categoryId: str | None = Field(default=None)
    subcategoryId: str | None = Field(default=None)
    description: str | None = Field(default=None)
    shortDescription: str | None = Field(default=None)
    brand: str | None = Field(default=None)
    manufacturer: str | None = Field(default=None)
    model: str | None = Field(default=None)
    partNumber: str | None = Field(default=None)
    serialNumber: str | None = Field(default=None)
    unit: str | None = Field(default=None)
    unitWeight: float | None = Field(default=None)
    dimensions: dict[str, Any] | None = Field(default=None)
    purchaseCost: float | None = Field(default=None)
    averageCost: float | None = Field(default=None)
    standardCost: float | None = Field(default=None)
    lastPurchaseCost: float | None = Field(default=None)
    sellingPrice: float | None = Field(default=None)
    dealerPrice: float | None = Field(default=None)
    contractorPrice: float | None = Field(default=None)
    customerPrice: float | None = Field(default=None)
    vipPrice: float | None = Field(default=None)
    internalCost: float | None = Field(default=None)
    labourCost: float | None = Field(default=None)
    installationCost: float | None = Field(default=None)
    serviceCost: float | None = Field(default=None)
    transportationCost: float | None = Field(default=None)
    mobilizationCost: float | None = Field(default=None)
    equipmentRental: float | None = Field(default=None)
    emergencyCallOut: float | None = Field(default=None)
    afterHoursCharge: float | None = Field(default=None)
    weekendCharge: float | None = Field(default=None)
    publicHolidayCharge: float | None = Field(default=None)
    currency: str | None = Field(default=None)
    quantity: float | None = Field(default=None)
    minStock: float | None = Field(default=None)
    maxStock: float | None = Field(default=None)
    reorderLevel: float | None = Field(default=None)
    safetyStock: float | None = Field(default=None)
    photos: list[Any] | None = Field(default=None)
    attachments: list[Any] | None = Field(default=None)
    technicalDatasheet: str | None = Field(default=None)
    msds: str | None = Field(default=None)
    warranty: str | None = Field(default=None)
    warrantyExpiry: str | None = Field(default=None)
    countryOfOrigin: str | None = Field(default=None)
    hsCode: str | None = Field(default=None)
    tags: list[str] | None = Field(default=None)
    status: str | None = Field(default=None)
    remarks: str | None = Field(default=None)
    approvalStatus: str | None = Field(default=None)
    approvedBy: str | None = Field(default=None)
    hourlyRate: float | None = Field(default=None)
    dailyRate: float | None = Field(default=None)
    overtimeRate: float | None = Field(default=None)
    weekendRate: float | None = Field(default=None)
    publicHolidayRate: float | None = Field(default=None)
    dailyRentalRate: float | None = Field(default=None)
    monthlyRentalRate: float | None = Field(default=None)
    estimatedHours: float | None = Field(default=None)
    requiredSkills: list[str] | None = Field(default=None)
    sop: str | None = Field(default=None)


class InventoryListResponse(BaseModel):
    """Paginated inventory list response."""
    data: list[dict[str, Any]]
    total: int
    page: int
    pageSize: int
    totalPages: int


class InventoryCategoryCreate(BaseModel):
    """Schema for creating an inventory category."""
    name: str = Field(..., min_length=1, max_length=200)
    code: str | None = Field(default=None)
    description: str | None = Field(default=None)
    icon: str | None = Field(default=None)
    color: str | None = Field(default=None)
    displayOrder: int | None = Field(default=None)


class InventorySubcategoryCreate(BaseModel):
    """Schema for creating a subcategory."""
    name: str = Field(..., min_length=1, max_length=200)
    code: str | None = Field(default=None)
    description: str | None = Field(default=None)
    categoryId: str = Field(...)


class WarehouseCreate(BaseModel):
    """Schema for creating a warehouse."""
    name: str = Field(..., min_length=1, max_length=200)
    code: str | None = Field(default=None)
    type: str = Field(default="main")
    address: str | None = Field(default=None)
    manager: str | None = Field(default=None)
    phone: str | None = Field(default=None)


class WarehouseUpdate(BaseModel):
    """Schema for updating a warehouse."""
    name: str | None = Field(default=None)
    code: str | None = Field(default=None)
    type: str | None = Field(default=None)
    address: str | None = Field(default=None)
    manager: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    isActive: bool | None = Field(default=None)


class StockMovementCreate(BaseModel):
    """Schema for recording a stock movement."""
    itemId: str = Field(...)
    warehouseId: str | None = Field(default=None)
    type: str = Field(...)
    quantity: float = Field(..., gt=0)
    reason: str | None = Field(default=None)
    referenceNo: str | None = Field(default=None)
    referenceType: str | None = Field(default=None)
    fromWarehouseId: str | None = Field(default=None)
    batchNo: str | None = Field(default=None)
    lotNumber: str | None = Field(default=None)
    expiryDate: str | None = Field(default=None)
    unitCost: float = Field(default=0)
    notes: str | None = Field(default=None)


class StockAdjustCreate(BaseModel):
    """Schema for stock adjustment (simplified)."""
    itemId: str = Field(...)
    warehouseId: str | None = Field(default=None)
    quantity: float = Field(...)
    reason: str | None = Field(default=None)
    unitCost: float = Field(default=0)
    notes: str | None = Field(default=None)


class SupplierCreate(BaseModel):
    """Schema for creating an item supplier."""
    itemId: str = Field(...)
    supplierName: str = Field(..., min_length=1, max_length=200)
    supplierCode: str | None = Field(default=None)
    contactPerson: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    email: str | None = Field(default=None)
    address: str | None = Field(default=None)
    leadTimeDays: int = Field(default=0)
    purchasePrice: float = Field(default=0)
    moq: int = Field(default=1)
    warranty: str | None = Field(default=None)
    paymentTerms: str | None = Field(default=None)
    rating: float | None = Field(default=None)
    isPrimary: bool = Field(default=False)


class PriceBookCreate(BaseModel):
    """Schema for creating a price book."""
    name: str = Field(..., min_length=1, max_length=200)
    code: str | None = Field(default=None)
    description: str | None = Field(default=None)
    isDefault: bool = Field(default=False)


class PriceBookUpdate(BaseModel):
    """Schema for updating a price book."""
    name: str | None = Field(default=None)
    code: str | None = Field(default=None)
    description: str | None = Field(default=None)
    isDefault: bool | None = Field(default=None)
    isActive: bool | None = Field(default=None)


class PriceBookEntryCreate(BaseModel):
    """Schema for creating a price book entry."""
    itemId: str = Field(...)
    price: float = Field(..., ge=0)
    discountPercent: float = Field(default=0)
    minQuantity: int = Field(default=1)
    effectiveFrom: str | None = Field(default=None)
    effectiveTo: str | None = Field(default=None)


class PriceBookEntryUpdate(BaseModel):
    """Schema for updating a price book entry."""
    itemId: str | None = Field(default=None)
    price: float | None = Field(default=None)
    discountPercent: float | None = Field(default=None)
    minQuantity: int | None = Field(default=None)
    effectiveFrom: str | None = Field(default=None)
    effectiveTo: str | None = Field(default=None)
    isActive: bool | None = Field(default=None)
