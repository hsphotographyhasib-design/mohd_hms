"""
Pydantic schemas for the Work Orders feature module.

MOHD.HMS ENTERPRISE

All request/response schemas matching the frontend API contract.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class WorkOrderCreate(BaseModel):
    """Schema for creating a new work order."""
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(default=None)
    complaintId: str | None = Field(default=None)
    customerId: str | None = Field(default=None)
    equipmentId: str | None = Field(default=None)
    priority: str = Field(default="medium")
    type: str | None = Field(default=None)
    workType: str | None = Field(default=None)
    category: str | None = Field(default=None)
    subCategory: str | None = Field(default=None)
    source: str | None = Field(default=None)
    reference: str | None = Field(default=None)
    scheduledDate: str | None = Field(default=None)
    startTime: str | None = Field(default=None)
    dueDate: str | None = Field(default=None)
    dueTime: str | None = Field(default=None)
    siteId: str | None = Field(default=None)
    building: str | None = Field(default=None)
    floor: str | None = Field(default=None)
    checklistId: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    supervisorId: str | None = Field(default=None)
    isDraft: bool = Field(default=False)
    estimatedHours: float | None = Field(default=None)
    internalNotes: str | None = Field(default=None)
    notes: str | None = Field(default=None)
    permitRequired: bool = Field(default=False)
    lockoutTagout: bool | None = Field(default=None)
    lockoutTagoutRequired: bool = Field(default=False)
    highRiskWork: bool = Field(default=False)
    safetyEquipment: bool | None = Field(default=None)
    safetyEquipmentReq: bool = Field(default=False)
    safetyNotes: str | None = Field(default=None)
    attachments: list[Any] | None = Field(default=None)


class WorkOrderUpdate(BaseModel):
    """Schema for updating a work order.
    
    Technicians can update: status, notes, photos, checklistData,
    technicianSignature, laborHours, laborCost, materialCost, totalCost,
    checkInGps, checkOutGps.
    Admins can update all fields.
    """
    title: str | None = Field(default=None)
    description: str | None = Field(default=None)
    priority: str | None = Field(default=None)
    type: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    supervisorId: str | None = Field(default=None)
    equipmentId: str | None = Field(default=None)
    scheduledDate: str | None = Field(default=None)
    startTime: str | None = Field(default=None)
    dueDate: str | None = Field(default=None)
    dueTime: str | None = Field(default=None)
    building: str | None = Field(default=None)
    floor: str | None = Field(default=None)
    siteId: str | None = Field(default=None)
    estimatedHours: float | None = Field(default=None)
    notes: str | None = Field(default=None)
    internalNotes: str | None = Field(default=None)
    photos: list[Any] | None = Field(default=None)
    checklistData: Any = Field(default=None)
    checklistId: str | None = Field(default=None)
    technicianSignature: str | None = Field(default=None)
    customerSignature: str | None = Field(default=None)
    checkInGps: dict[str, Any] | None = Field(default=None)
    checkOutGps: dict[str, Any] | None = Field(default=None)
    laborHours: float | None = Field(default=None)
    laborCost: float | None = Field(default=None)
    materialCost: float | None = Field(default=None)
    totalCost: float | None = Field(default=None)
    status: str | None = Field(default=None)


class WorkOrderFeedback(BaseModel):
    """Schema for customer feedback on a work order."""
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class WorkOrderListParams(BaseModel):
    """Query parameters for listing work orders."""
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None)
    status: str | None = Field(default=None)
    type: str | None = Field(default=None)
    priority: str | None = Field(default=None)


class WorkOrderResponse(BaseModel):
    """Full work order response matching frontend contract."""
    id: str
    tenantId: str
    workOrderNumber: str | None = None
    complaintId: str | None = None
    customerId: str | None = None
    customerName: str | None = None
    equipmentId: str | None = None
    equipmentName: str | None = None
    equipmentAsset: str | None = None
    title: str
    description: str | None = None
    source: str | None = None
    reference: str | None = None
    status: str
    priority: str
    type: str | None = None
    category: str | None = None
    subCategory: str | None = None
    assignedToId: str | None = None
    assignedToName: str | None = None
    supervisorId: str | None = None
    supervisorName: str | None = None
    createdBy: str | None = None
    creatorName: str | None = None
    scheduledDate: str | None = None
    startTime: str | None = None
    dueDate: str | None = None
    dueTime: str | None = None
    building: str | None = None
    floor: str | None = None
    siteId: str | None = None
    estimatedHours: float | None = None
    startedAt: str | None = None
    completedAt: str | None = None
    laborHours: float | None = None
    laborCost: float | None = None
    materialCost: float | None = None
    totalCost: float | None = None
    notes: str | None = None
    internalNotes: str | None = None
    photos: Any = None
    checklistData: Any = None
    checklistId: str | None = None
    technicianSignature: str | None = None
    customerSignature: str | None = None
    checkInGps: Any = None
    checkOutGps: Any = None
    isDraft: bool | None = None
    permitRequired: bool | None = None
    lockoutTagoutRequired: bool | None = None
    highRiskWork: bool | None = None
    safetyEquipmentReq: bool | None = None
    safetyNotes: str | None = None
    attachments: Any = None
    createdAt: str
    updatedAt: str
    materials: list[dict[str, Any]] | None = None

    model_config = {"from_attributes": True}


class WorkOrderListResponse(BaseModel):
    """Paginated work order list response."""
    data: list[dict[str, Any]]
    total: int
    page: int
    pageSize: int
    totalPages: int


class NextNumberResponse(BaseModel):
    """Response for the next WO number endpoint."""
    nextNumber: str


class ChecklistTemplateResponse(BaseModel):
    """Response for a checklist template."""
    id: str
    name: str
    category: str | None = None
    description: str | None = None


class ChecklistListResponse(BaseModel):
    """Response for listing checklist templates."""
    data: list[dict[str, Any]]


class FeedbackResponse(BaseModel):
    """Response for feedback submission."""
    success: bool
    message: str
    workOrderId: str
    rating: int
