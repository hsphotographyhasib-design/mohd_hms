r"""
Pydantic schemas for the Preventive Maintenance feature module.

MOHD.HMS ENTERPRISE

All request/response schemas matching the frontend API contract.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PmScheduleCreate(BaseModel):
    """Schema for creating a PM schedule."""
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(default=None)
    equipmentId: str = Field(..., min_length=1)
    frequency: str = Field(default="monthly")
    customDays: int | None = Field(default=None)
    nextDueDate: str = Field(..., min_length=1)
    assignedToId: str | None = Field(default=None)
    checklistTemplateId: str | None = Field(default=None)


class PmScheduleUpdate(BaseModel):
    """Schema for updating a PM schedule."""
    title: str | None = Field(default=None)
    description: str | None = Field(default=None)
    frequency: str | None = Field(default=None)
    customDays: int | None = Field(default=None)
    lastExecuted: str | None = Field(default=None)
    nextDueDate: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    checklistTemplateId: str | None = Field(default=None)
    status: str | None = Field(default=None)


class PmScheduleResponse(BaseModel):
    """Full PM schedule response matching frontend contract."""
    id: str
    tenantId: str
    equipmentId: str
    equipmentName: str | None = None
    title: str
    description: str | None = None
    frequency: str
    customDays: int | None = None
    lastExecuted: str | None = None
    nextDueDate: str
    assignedToId: str | None = None
    assignedToName: str | None = None
    status: str
    checklistTemplateId: str | None = None
    createdAt: str
    updatedAt: str

    model_config = {"from_attributes": True}


class PmScheduleListResponse(BaseModel):
    """Paginated PM schedule list response."""
    data: list[dict[str, Any]]
    total: int
    page: int
    pageSize: int
    totalPages: int


class PmScheduleListParams(BaseModel):
    """Query parameters for listing PM schedules."""
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None)
    status: str | None = Field(default=None)
    frequency: str | None = Field(default=None)
