"""
Pydantic schemas for the HR feature module.

MOHD.HMS ENTERPRISE

Keeps it practical — generic BaseModel for simple CRUD,
specific models for complex operations (payroll, leave, attendance).
"""

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ============================================================================
# EMPLOYEES
# ============================================================================


class EmployeeCreate(BaseModel):
    userId: str
    employeeId: str = ""
    departmentId: str | None = None
    designation: str = ""
    employmentType: str = "full_time"
    reportingToId: str | None = None
    basicSalary: float | None = None
    nationality: str = ""
    passportNumber: str = ""
    passportExpiry: str | None = None
    visaNumber: str = ""
    visaExpiry: str | None = None
    drivingLicense: str = ""
    drivingLicenseExpiry: str | None = None
    joiningDate: str | None = None
    probationEnds: str | None = None
    contractEnd: str | None = None
    bankName: str = ""
    bankAccount: str = ""
    bankBranch: str = ""
    emergencyName: str = ""
    emergencyPhone: str = ""
    emergencyRelation: str = ""
    dateOfBirth: str | None = None
    gender: str | None = None
    maritalStatus: str | None = None
    bloodGroup: str = ""
    status: str = "active"
    shiftId: str | None = None
    photo: str | None = None


class EmployeeUpdate(BaseModel):
    departmentId: str | None = None
    designation: str | None = None
    employmentType: str | None = None
    reportingToId: str | None = None
    basicSalary: float | None = None
    nationality: str | None = None
    passportNumber: str | None = None
    passportExpiry: str | None = None
    visaNumber: str | None = None
    visaExpiry: str | None = None
    drivingLicense: str | None = None
    drivingLicenseExpiry: str | None = None
    joiningDate: str | None = None
    probationEnds: str | None = None
    contractEnd: str | None = None
    bankName: str | None = None
    bankAccount: str | None = None
    bankBranch: str | None = None
    emergencyName: str | None = None
    emergencyPhone: str | None = None
    emergencyRelation: str | None = None
    dateOfBirth: str | None = None
    gender: str | None = None
    maritalStatus: str | None = None
    bloodGroup: str | None = None
    status: str | None = None
    shiftId: str | None = None
    photo: str | None = None


# ============================================================================
# DEPARTMENTS
# ============================================================================


class DepartmentCreate(BaseModel):
    name: str
    description: str = ""
    headId: str | None = None
    isActive: bool = True


# ============================================================================
# ATTENDANCE
# ============================================================================


class AttendanceCheckIn(BaseModel):
    userId: str
    action: str = "checkIn"
    notes: str | None = None
    gps: str | None = None


class AttendanceCheckOut(BaseModel):
    userId: str
    action: str = "checkOut"
    notes: str | None = None
    gps: str | None = None


# ============================================================================
# LEAVE
# ============================================================================


class LeaveRequestCreate(BaseModel):
    employeeId: str
    leaveTypeId: str
    startDate: str
    endDate: str
    reason: str | None = None
    attachment: str | None = None


class LeaveRequestUpdate(BaseModel):
    status: str | None = None
    supervisorApprovedAt: str | None = None
    hrApprovedAt: str | None = None
    rejectionReason: str | None = None


# ============================================================================
# OVERTIME
# ============================================================================


class OvertimeCreate(BaseModel):
    employeeId: str
    date: str
    hours: float = Field(gt=0)
    reason: str | None = None
    rate: float | None = None


class OvertimeUpdate(BaseModel):
    status: str | None = None
    supervisorId: str | None = None
    supervisorApprovedAt: str | None = None
    hrOfficerId: str | None = None
    hrApprovedAt: str | None = None


# ============================================================================
# PAYROLL
# ============================================================================


class PayrollCreate(BaseModel):
    employeeId: str
    month: int
    year: int
    basicSalary: float = 0
    allowances: float = 0
    deductions: float = 0
    overtimePay: float = 0
    bonus: float = 0
    loanDeduction: float = 0
    tax: float = 0
    netPay: float = 0
    notes: str | None = None


class PayrollProcess(BaseModel):
    action: str = "process"
    month: int | None = None
    year: int | None = None


# ============================================================================
# TRAINING
# ============================================================================


class TrainingCreate(BaseModel):
    title: str
    startDate: str
    description: str | None = None
    provider: str | None = None
    location: str | None = None
    endDate: str | None = None
    cost: float | None = None
    maxParticipants: int | None = None
    status: str = "planned"


class TrainingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    provider: str | None = None
    location: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    cost: float | None = None
    maxParticipants: int | None = None
    status: str | None = None


# ============================================================================
# TRAVEL
# ============================================================================


class TravelCreate(BaseModel):
    employeeId: str = ""
    employeeName: str | None = None
    destination: str
    purpose: str = ""
    startDate: str
    endDate: str | None = None
    budget: float | None = None
    notes: str | None = None


class TravelUpdate(BaseModel):
    destination: str | None = None
    purpose: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    budget: float | None = None
    actualCost: float | None = None
    status: str | None = None
    notes: str | None = None


# ============================================================================
# MEDICAL
# ============================================================================


class MedicalCreate(BaseModel):
    employeeId: str = ""
    employeeName: str | None = None
    recordType: str = "checkup"
    provider: str | None = None
    date: str
    expiryDate: str | None = None
    details: str | None = None
    fileUrl: str | None = None
    cost: float | None = None


class MedicalUpdate(BaseModel):
    recordType: str | None = None
    provider: str | None = None
    date: str | None = None
    expiryDate: str | None = None
    details: str | None = None
    fileUrl: str | None = None
    cost: float | None = None
    status: str | None = None


# ============================================================================
# EXPENSES
# ============================================================================


class ExpenseCreate(BaseModel):
    employeeId: str = ""
    employeeName: str | None = None
    category: str = "other"
    amount: float
    description: str = ""
    receiptUrl: str | None = None
    expenseDate: str


class ExpenseUpdate(BaseModel):
    category: str | None = None
    amount: float | None = None
    description: str | None = None
    receiptUrl: str | None = None
    expenseDate: str | None = None
    status: str | None = None


# ============================================================================
# DOCUMENTS
# ============================================================================


class DocumentCreate(BaseModel):
    employeeId: str = ""
    employeeName: str | None = None
    documentType: str = "other"
    title: str
    fileUrl: str
    expiryDate: str | None = None
    reminderDays: int = 30


class DocumentUpdate(BaseModel):
    documentType: str | None = None
    title: str | None = None
    fileUrl: str | None = None
    expiryDate: str | None = None
    reminderDays: int | None = None
    status: str | None = None


# ============================================================================
# ANNOUNCEMENTS
# ============================================================================


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    type: str = "info"
    priority: str = "normal"
    status: str = "draft"


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    type: str | None = None
    priority: str | None = None
    status: str | None = None


# ============================================================================
# ASSETS
# ============================================================================


class AssetCreate(BaseModel):
    employeeId: str = ""
    employeeName: str | None = None
    assetType: str = "laptop"
    assetName: str
    serialNumber: str | None = None
    condition: str = "new"
    notes: str | None = None


class AssetUpdate(BaseModel):
    assetType: str | None = None
    assetName: str | None = None
    serialNumber: str | None = None
    condition: str | None = None
    status: str | None = None
    returnDate: str | None = None
    notes: str | None = None


# ============================================================================
# SHIFTS
# ============================================================================


class ShiftCreate(BaseModel):
    name: str
    startTime: str
    endTime: str
    breakMinutes: int = 0
    color: str = "#3b82f6"
    isActive: bool = True


class ShiftScheduleCreate(BaseModel):
    employeeId: str
    shiftId: str
    effectiveFrom: str
    effectiveTo: str | None = None
    weeklyOffDays: str = "[]"


# ============================================================================
# HOLIDAYS
# ============================================================================


class HolidayCreate(BaseModel):
    name: str
    date: str
    type: str = "public"
    recurring: bool = False


# ============================================================================
# VISITORS
# ============================================================================


class VisitorCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    purpose: str | None = None
    hostName: str | None = None
    idNumber: str | None = None


class VisitorUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    purpose: str | None = None
    status: str | None = None
    checkOut: str | None = None


# ============================================================================
# PERFORMANCE
# ============================================================================


class PerformanceCreate(BaseModel):
    employeeId: str = ""
    employeeName: str | None = None
    period: str
    type: str = "quarterly"
    kpiScore: float | None = None
    goalsScore: float | None = None
    overallScore: float | None = None
    rating: str | None = None
    employeeComments: str | None = None
    managerComments: str | None = None
    status: str = "draft"
    reviewerId: str | None = None


class PerformanceUpdate(BaseModel):
    period: str | None = None
    type: str | None = None
    kpiScore: float | None = None
    goalsScore: float | None = None
    overallScore: float | None = None
    rating: str | None = None
    employeeComments: str | None = None
    managerComments: str | None = None
    status: str | None = None
    completedAt: str | None = None


# ============================================================================
# DISCIPLINARY
# ============================================================================


class DisciplinaryCreate(BaseModel):
    employeeId: str = ""
    employeeName: str | None = None
    type: str = "warning"
    severity: str = "minor"
    description: str
    incidentDate: str
    actionTaken: str | None = None


class DisciplinaryUpdate(BaseModel):
    type: str | None = None
    severity: str | None = None
    description: str | None = None
    incidentDate: str | None = None
    actionTaken: str | None = None
    status: str | None = None


# ============================================================================
# SETTINGS
# ============================================================================


class LeaveTypeCreate(BaseModel):
    section: str = "leave_types"
    name: str
    code: str
    daysAllowed: float = 0
    isPaid: bool = True
    carryForward: bool = False
    maxCarryDays: float | None = None
    requiresDoc: bool = False


class SettingsShiftCreate(BaseModel):
    section: str = "shifts"
    name: str
    startTime: str = "08:00"
    endTime: str = "17:00"
    breakMinutes: int = 60


class SettingsHolidayCreate(BaseModel):
    section: str = "holidays"
    name: str
    date: str
    type: str = "public"
    recurring: bool = False


class SettingsUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    daysAllowed: float | None = None
    isPaid: bool | None = None
    carryForward: bool | None = None
    maxCarryDays: float | None = None
    requiresDoc: bool | None = None
    startTime: str | None = None
    endTime: str | None = None
    breakMinutes: int | None = None
    color: str | None = None
    isActive: bool | None = None


# ============================================================================
# REPORTS
# ============================================================================


class ReportGenerate(BaseModel):
    reportId: str | None = None
    id: str | None = None


# ============================================================================
# RECRUITMENT — JOBS
# ============================================================================


class JobCreate(BaseModel):
    title: str
    departmentId: str | None = None
    type: str = "full_time"
    vacancies: int = 1
    location: str | None = None
    salaryMin: float | None = None
    salaryMax: float | None = None
    description: str | None = None
    requirements: str | None = None
    closingDate: str | None = None


class JobUpdate(BaseModel):
    title: str | None = None
    departmentId: str | None = None
    type: str | None = None
    vacancies: int | None = None
    location: str | None = None
    salaryMin: float | None = None
    salaryMax: float | None = None
    description: str | None = None
    requirements: str | None = None
    status: str | None = None
    closingDate: str | None = None


# ============================================================================
# RECRUITMENT — CANDIDATES
# ============================================================================


class CandidateCreate(BaseModel):
    jobId: str
    name: str
    email: str
    phone: str | None = None
    source: str | None = None
    resumeUrl: str | None = None
    coverLetterUrl: str | None = None
    notes: str | None = None


class CandidateUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    status: str | None = None
    interviewDate: str | None = None
    interviewerId: str | None = None
    offerSalary: float | None = None
    offerDate: str | None = None
    notes: str | None = None
    resumeUrl: str | None = None
    coverLetterUrl: str | None = None
