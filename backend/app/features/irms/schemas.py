"""
Pydantic schemas for the IRMS feature module.

MOHD.HMS ENTERPRISE

All request/response schemas matching the Next.js IRMS API contract.
Covers projects, reports, photos, revisions, templates, users, and inspections.
"""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


# ── Status Enums ─────────────────────────────────────────────────────────────


class ProjectStatus(StrEnum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ReportStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    SUPERVISOR_REVIEW = "supervisor_review"
    MANAGER_APPROVAL = "manager_approval"
    APPROVED = "approved"
    REJECTED = "rejected"


class ReportPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PhotoType(StrEnum):
    BEFORE = "before"
    AFTER = "after"
    PROGRESS = "progress"
    DEFECT = "defect"
    INSPECTION = "inspection"
    COMPLETION = "completion"
    FINAL = "final"
    EVIDENCE = "evidence"


class InspectionStatus(StrEnum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class InspectionPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InspectionType(StrEnum):
    ROUTINE = "routine"
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    EMERGENCY = "emergency"
    SPECIAL = "special"


class ChecklistItemType(StrEnum):
    PASS_FAIL = "pass_fail"
    YES_NO = "yes_no"
    SCALE = "scale"
    TEXT = "text"
    MULTI_CHOICE = "multi_choice"


class IrmUserRole(StrEnum):
    INSPECTOR = "Inspector"
    SUPERVISOR = "Supervisor"
    MANAGER = "Manager"
    ADMIN = "Admin"


# ── Report status flow ────────────────────────────────────────────────────────

STATUS_FLOW = [
    ReportStatus.DRAFT,
    ReportStatus.SUBMITTED,
    ReportStatus.SUPERVISOR_REVIEW,
    ReportStatus.MANAGER_APPROVAL,
    ReportStatus.APPROVED,
]


# ── Project Schemas ───────────────────────────────────────────────────────────


class IrmProjectCreate(BaseModel):
    """Schema for creating an IRM project."""
    name: str = Field(..., min_length=1, max_length=500)
    number: str | None = Field(default=None, max_length=100)
    contractNumber: str | None = Field(default=None, max_length=100)
    tenderNumber: str | None = Field(default=None, max_length=100)
    customer: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=500)
    gpsLat: float | None = Field(default=None)
    gpsLng: float | None = Field(default=None)
    value: float | None = Field(default=None, ge=0)
    startDate: str | None = Field(default=None)
    completionDate: str | None = Field(default=None)
    status: str = Field(default="active")
    logo: str | None = Field(default=None)
    description: str | None = Field(default=None)


class IrmProjectUpdate(BaseModel):
    """Schema for updating an IRM project."""
    name: str | None = Field(default=None, min_length=1, max_length=500)
    number: str | None = Field(default=None, max_length=100)
    contractNumber: str | None = Field(default=None, max_length=100)
    tenderNumber: str | None = Field(default=None, max_length=100)
    customer: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=500)
    gpsLat: float | None = Field(default=None)
    gpsLng: float | None = Field(default=None)
    value: float | None = Field(default=None, ge=0)
    startDate: str | None = Field(default=None)
    completionDate: str | None = Field(default=None)
    status: str | None = Field(default=None)
    logo: str | None = Field(default=None)
    description: str | None = Field(default=None)


# ── Report Schemas ───────────────────────────────────────────────────────────


class IrmReportCreate(BaseModel):
    """Schema for creating an IRM report."""
    projectId: str = Field(..., min_length=1)
    inspectionDate: str | None = Field(default=None)
    inspectorId: str | None = Field(default=None)
    department: str | None = Field(default=None)
    site: str | None = Field(default=None)
    building: str | None = Field(default=None)
    floor: str | None = Field(default=None)
    room: str | None = Field(default=None)
    equipment: str | None = Field(default=None)
    workCategory: str | None = Field(default=None)
    inspectionType: str | None = Field(default=None)
    priority: str = Field(default="medium")
    status: str = Field(default="draft")
    jobOrderNumber: str | None = Field(default=None)
    workOrderNumber: str | None = Field(default=None)
    taskDescription: str | None = Field(default=None)
    workScope: str | None = Field(default=None)
    inspectionNotes: str | None = Field(default=None)
    correctiveActions: str | None = Field(default=None)
    recommendation: str | None = Field(default=None)
    observation: str | None = Field(default=None)
    safetyNotes: str | None = Field(default=None)
    rootCause: str | None = Field(default=None)
    materialsUsed: Any = Field(default=None)
    labourHours: float | None = Field(default=None, ge=0)
    completionPct: int = Field(default=0, ge=0, le=100)
    assessedById: str | None = Field(default=None)
    assessedDate: str | None = Field(default=None)


class IrmReportUpdate(BaseModel):
    """Schema for updating an IRM report."""
    projectId: str | None = Field(default=None)
    inspectionDate: str | None = Field(default=None)
    inspectorId: str | None = Field(default=None)
    department: str | None = Field(default=None)
    site: str | None = Field(default=None)
    building: str | None = Field(default=None)
    floor: str | None = Field(default=None)
    room: str | None = Field(default=None)
    equipment: str | None = Field(default=None)
    workCategory: str | None = Field(default=None)
    inspectionType: str | None = Field(default=None)
    priority: str | None = Field(default=None)
    status: str | None = Field(default=None)
    jobOrderNumber: str | None = Field(default=None)
    workOrderNumber: str | None = Field(default=None)
    taskDescription: str | None = Field(default=None)
    workScope: str | None = Field(default=None)
    inspectionNotes: str | None = Field(default=None)
    correctiveActions: str | None = Field(default=None)
    recommendation: str | None = Field(default=None)
    observation: str | None = Field(default=None)
    safetyNotes: str | None = Field(default=None)
    rootCause: str | None = Field(default=None)
    materialsUsed: Any = Field(default=None)
    labourHours: float | None = Field(default=None, ge=0)
    completionPct: int | None = Field(default=None, ge=0, le=100)
    assessedById: str | None = Field(default=None)
    assessedDate: str | None = Field(default=None)
    inspectorSign: str | None = Field(default=None)
    supervisorSign: str | None = Field(default=None)
    clientSign: str | None = Field(default=None)
    managerSign: str | None = Field(default=None)
    statusComment: str | None = Field(default=None)


# ── Photo Schemas ────────────────────────────────────────────────────────────


class IrmPhotoCreate(BaseModel):
    """Schema for creating a single IRM photo."""
    reportId: str = Field(..., min_length=1)
    type: str = Field(default="before")
    data: str | None = Field(default=None)
    thumbnail: str | None = Field(default=None)
    originalImage: str | None = Field(default=None)
    caption: str | None = Field(default=None)
    swRef: str | None = Field(default=None)
    photoNumber: str | None = Field(default=None)
    room: str | None = Field(default=None)
    building: str | None = Field(default=None)
    gpsLat: float | None = Field(default=None)
    gpsLng: float | None = Field(default=None)
    sortOrder: int = Field(default=0, ge=0)
    width: int | None = Field(default=None)
    height: int | None = Field(default=None)


class IrmPhotoUpdate(BaseModel):
    """Schema for updating a single IRM photo."""
    type: str | None = Field(default=None)
    data: str | None = Field(default=None)
    thumbnail: str | None = Field(default=None)
    originalImage: str | None = Field(default=None)
    caption: str | None = Field(default=None)
    swRef: str | None = Field(default=None)
    photoNumber: str | None = Field(default=None)
    room: str | None = Field(default=None)
    building: str | None = Field(default=None)
    gpsLat: float | None = Field(default=None)
    gpsLng: float | None = Field(default=None)
    sortOrder: int | None = Field(default=None, ge=0)
    width: int | None = Field(default=None)
    height: int | None = Field(default=None)


class IrmPhotoBulkAction(BaseModel):
    """Schema for bulk photo operations."""
    action: str = Field(..., pattern="^(delete|move|rotate|duplicate)$")
    photoIds: list[str] = Field(..., min_length=1)
    category: str | None = Field(default=None)
    room: str | None = Field(default=None)
    swRef: str | None = Field(default=None)


class IrmPhotoReorder(BaseModel):
    """Schema for reordering photos."""
    photoIds: list[str] = Field(..., min_length=1)


# ── Revision Schemas ─────────────────────────────────────────────────────────


class IrmRevisionRollback(BaseModel):
    """Schema for rolling back to a specific revision."""
    version: int = Field(..., ge=1)


# ── Status Action Schema ────────────────────────────────────────────────────


class IrmReportStatusAction(BaseModel):
    """Schema for advancing/rejecting report status."""
    action: str = Field(..., pattern="^(advance|reject)$")
    comment: str | None = Field(default=None)
    userId: str | None = Field(default=None)


# ── Signature Schema ─────────────────────────────────────────────────────────


class IrmReportSignatures(BaseModel):
    """Schema for updating report signatures."""
    inspectorSign: str | None = Field(default=None)
    supervisorSign: str | None = Field(default=None)
    managerSign: str | None = Field(default=None)
    clientSign: str | None = Field(default=None)


# ── Template Schemas ─────────────────────────────────────────────────────────


class InspectionChecklistItemCreate(BaseModel):
    """Schema for a single checklist item within a template."""
    question: str = Field(..., min_length=1)
    category: str | None = Field(default=None)
    type: str = Field(default="pass_fail")
    required: bool = Field(default=True)
    sortOrder: int | None = Field(default=None, ge=0)
    helpText: str | None = Field(default=None)
    options: list[str] | dict[str, Any] | None = Field(default=None)
    minScore: float | None = Field(default=None)
    maxScore: float | None = Field(default=None)


class IrmTemplateCreate(BaseModel):
    """Schema for creating an inspection template."""
    name: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    category: str | None = Field(default=None)
    inspectionType: str = Field(default="routine")
    checklistItems: list[InspectionChecklistItemCreate] = Field(..., min_length=1)


class IrmTemplateUpdate(BaseModel):
    """Schema for updating an inspection template."""
    name: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None)
    category: str | None = Field(default=None)
    inspectionType: str | None = Field(default=None)
    isActive: bool | None = Field(default=None)
    checklistItems: list[InspectionChecklistItemCreate] | None = Field(default=None)


# ── User Schemas ─────────────────────────────────────────────────────────────


class IrmUserCreate(BaseModel):
    """Schema for creating an IRM user."""
    email: str | None = Field(default=None, max_length=255)
    name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(default="Inspector")
    phone: str | None = Field(default=None, max_length=50)
    avatar: str | None = Field(default=None)
    active: bool = Field(default=True)


class IrmUserUpdate(BaseModel):
    """Schema for updating an IRM user."""
    email: str | None = Field(default=None)
    name: str | None = Field(default=None)
    role: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    avatar: str | None = Field(default=None)
    active: bool | None = Field(default=None)


# ── Inspection Schemas ────────────────────────────────────────────────────────


class InspectionCreate(BaseModel):
    """Schema for creating an inspection."""
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=10000)
    inspectionType: str = Field(default="routine")
    priority: str = Field(default="medium")
    equipmentId: str | None = Field(default=None)
    equipmentName: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    assignedToName: str | None = Field(default=None)
    templateId: str | None = Field(default=None)
    scheduledDate: str | None = Field(default=None)
    location: str | None = Field(default=None)
    building: str | None = Field(default=None)
    floor: str | None = Field(default=None)
    room: str | None = Field(default=None)
    complaintId: str | None = Field(default=None)
    workOrderId: str | None = Field(default=None)
    pmScheduleId: str | None = Field(default=None)


class InspectionUpdate(BaseModel):
    """Schema for updating an inspection."""
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None)
    inspectionType: str | None = Field(default=None)
    priority: str | None = Field(default=None)
    status: str | None = Field(default=None)
    equipmentId: str | None = Field(default=None)
    equipmentName: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    assignedToName: str | None = Field(default=None)
    templateId: str | None = Field(default=None)
    scheduledDate: str | None = Field(default=None)
    location: str | None = Field(default=None)
    building: str | None = Field(default=None)
    floor: str | None = Field(default=None)
    room: str | None = Field(default=None)
    complaintId: str | None = Field(default=None)
    workOrderId: str | None = Field(default=None)
    pmScheduleId: str | None = Field(default=None)
