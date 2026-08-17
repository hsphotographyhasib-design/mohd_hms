"""
Pydantic schemas for the Complaints feature module.

MOHD.HMS ENTERPRISE

All request/response schemas matching the frontend API contract.
Status values match the frontend state-machine.ts exactly.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


# ── Status Enum (matches frontend state-machine.ts) ─────────────────────────


class ComplaintStatus(StrEnum):
    """All valid complaint lifecycle statuses."""
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    WORK_ORDER_CREATED = "WORK_ORDER_CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_CLIENT_CONFIRMATION = "WAITING_CLIENT_CONFIRMATION"
    CLIENT_CONFIRMED = "CLIENT_CONFIRMED"
    DRAFT_INVOICE = "DRAFT_INVOICE"
    INVOICE_APPROVED = "INVOICE_APPROVED"
    INVOICE_SENT = "INVOICE_SENT"
    PAID = "PAID"
    CLOSED = "CLOSED"
    REWORK_REQUIRED = "REWORK_REQUIRED"
    PAUSED = "PAUSED"


class AssignmentStatus(StrEnum):
    PENDING_ACCEPTANCE = "PENDING_ACCEPTANCE"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class Priority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplaintSource(StrEnum):
    ADMIN = "admin"
    PORTAL = "portal"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    MOBILE = "mobile"


# ── Request schemas ──────────────────────────────────────────────────────────


class ComplaintCreate(BaseModel):
    """Schema for creating a new complaint."""
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=10000)
    priority: str = Field(default="medium")
    category: str | None = Field(default=None)
    source: str | None = Field(default="admin")
    customerId: str | None = Field(default=None)
    equipmentId: str | None = Field(default=None)
    photos: list[Any] | None = Field(default=None)
    gpsLocation: dict[str, Any] | None = Field(default=None)
    locationInfo: dict[str, Any] | None = Field(default=None)


class ComplaintUpdate(BaseModel):
    """Schema for updating complaint fields (not status transitions)."""
    title: str | None = Field(default=None)
    description: str | None = Field(default=None)
    priority: str | None = Field(default=None)
    status: str | None = Field(default=None)  # Rejected — must use /workflow
    category: str | None = Field(default=None)
    photos: list[Any] | None = Field(default=None)
    gpsLocation: dict[str, Any] | None = Field(default=None)
    locationInfo: dict[str, Any] | None = Field(default=None)
    resolutionNotes: str | None = Field(default=None)
    customerRating: int | None = Field(default=None, ge=1, le=5)
    customerFeedback: str | None = Field(default=None, max_length=1000)
    eta: str | None = Field(default=None)
    rejectionReason: str | None = Field(default=None)
    reworkReason: str | None = Field(default=None)


class ComplaintAssign(BaseModel):
    """Schema for assigning/reassigning a technician."""
    technicianId: str = Field(..., min_length=1)
    supervisorId: str | None = Field(default=None)
    reason: str | None = Field(default=None)


class ComplaintAcceptReject(BaseModel):
    """Schema for technician accept/reject of assignment."""
    action: str = Field(..., pattern="^(accept|reject)$")
    eta: str | None = Field(default=None)
    rejectionReason: str | None = Field(default=None)


class ComplaintWorkflow(BaseModel):
    """Schema for generic workflow actions."""
    action: str = Field(..., min_length=1)
    targetStatus: str | None = Field(default=None)
    reason: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    supervisorId: str | None = Field(default=None)
    eta: str | None = Field(default=None)
    rejectionReason: str | None = Field(default=None)
    reworkReason: str | None = Field(default=None)
    notes: str | None = Field(default=None)
    # Work order completion fields
    workOrderId: str | None = Field(default=None)
    laborCost: float | None = Field(default=None)
    materialCost: float | None = Field(default=None)
    laborHours: float | None = Field(default=None)
    checklistData: Any = None
    beforePhotos: Any = None
    afterPhotos: Any = None
    materialsUsed: Any = None
    videoUrl: str | None = Field(default=None)
    remarks: str | None = Field(default=None)
    technicianSignature: str | None = Field(default=None)
    # Invoice fields
    sentVia: str | None = Field(default=None)
    paymentMethod: str | None = Field(default=None)
    paymentRef: str | None = Field(default=None)
    paidAt: str | None = Field(default=None)
    # For escalation check
    tenantId: str | None = Field(default=None)


class ComplaintListParams(BaseModel):
    """Query parameters for listing complaints."""
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=20, ge=1, le=100)
    status: str | None = Field(default=None)
    priority: str | None = Field(default=None)
    category: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    customerId: str | None = Field(default=None)
    search: str | None = Field(default=None)
    dateFrom: str | None = Field(default=None)
    dateTo: str | None = Field(default=None)
    sortBy: str | None = Field(default=None)
    sortOrder: str | None = Field(default="desc")


# ── Response schemas ─────────────────────────────────────────────────────────


class ComplaintResponse(BaseModel):
    """Full complaint response with resolved relation names."""
    id: str
    tenantId: str
    customerId: str | None = None
    customerName: str | None = None
    equipmentId: str | None = None
    equipmentName: str | None = None
    title: str
    description: str
    priority: str
    status: str
    category: str | None = None
    complaintNumber: str | None = None
    source: str | None = None
    photos: Any = None
    gpsLocation: Any = None
    assignedToId: str | None = None
    assignedToName: str | None = None
    supervisorId: str | None = None
    supervisorName: str | None = None
    resolutionNotes: str | None = None
    customerRating: int | None = None
    customerFeedback: str | None = None
    assignmentStatus: str | None = None
    assignedBy: str | None = None
    assignedByRole: str | None = None
    assignedAt: str | None = None
    lastReassignedAt: str | None = None
    assignmentReason: str | None = None
    reassignmentCount: int | None = None
    slaResponseDeadline: str | None = None
    workOrderId: str | None = None
    invoiceId: str | None = None
    eta: str | None = None
    rejectionReason: str | None = None
    reworkReason: str | None = None
    customerSnapshot: Any = None
    locationInfo: Any = None
    acceptedAt: str | None = None
    startedAt: str | None = None
    completedAt: str | None = None
    clientConfirmedAt: str | None = None
    resolvedAt: str | None = None
    closedAt: str | None = None
    createdAt: str
    updatedAt: str
    workOrders: list[dict[str, Any]] | None = None

    model_config = {"from_attributes": True}


class ComplaintListResponse(BaseModel):
    """Paginated complaint list response."""
    data: list[dict[str, Any]]
    total: int
    page: int
    pageSize: int
    totalPages: int
    accessLevel: str | None = None


class ComplaintCountResponse(BaseModel):
    """Response with complaint counts per status."""
    counts: dict[str, int]


class TimelineEntry(BaseModel):
    """A single complaint timeline entry."""
    id: str
    complaintId: str
    action: str
    fromStatus: str | None = None
    toStatus: str | None = None
    description: str | None = None
    performedBy: str | None = None
    performedByRole: str | None = None
    metadata: dict[str, Any] | None = None
    createdAt: str


class AssignmentHistoryEntry(BaseModel):
    """A single assignment history entry."""
    id: str
    action: str
    fromStatus: str | None = None
    toStatus: str | None = None
    description: str | None = None
    createdAt: str
    performedBy: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class EscalationRule(BaseModel):
    """An escalation rule configuration."""
    status: str
    threshold: str
    thresholdMs: int
    severity: str
    label: str
    description: str | None = None
    notifyRoles: list[str]
    notifyCustomer: bool
    notifySupervisor: bool


class EscalationRulesResponse(BaseModel):
    """Response containing all escalation rules."""
    rules: list[EscalationRule]


class EscalationCheckResponse(BaseModel):
    """Response from escalation check."""
    success: bool
    triggered: list[dict[str, Any]]
    details: list[dict[str, Any]] | None = None


class MyProfileResponse(BaseModel):
    """Response for customer profile endpoint."""
    customer: dict[str, Any] | None = None
    buildings: list[dict[str, Any]]
    equipment: list[dict[str, Any]]
