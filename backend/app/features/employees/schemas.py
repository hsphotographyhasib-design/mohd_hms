"""
Employee schemas.

MOHD.HMS ENTERPRISE

Matches the frontend API contract from:
  - /api/employees/route.ts (list, create)
  - /api/employees/[id]/route.ts (get, update, delete)
  - /api/hr/employees/route.ts (HR employee list, create, update, delete)

Employees = users with non-customer roles.
Response format: { data: [...], total, page, pageSize, totalPages }
Detail format: flat object with all user + department fields.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Roles that qualify as "employees" (non-customer, non-vendor, non-guest) ──

EMPLOYEE_ROLES = ["super_admin", "admin", "manager", "supervisor", "technician", "finance", "hr", "user"]
NON_EMPLOYEE_ROLES = ["customer", "vendor", "guest"]


# ── Employee (User-level) schemas ─────────────────────────────────────────────


class EmployeeCreateRequest(BaseModel):
    """Request body for creating an employee user.

    Matches: POST /api/employees
    """

    email: str
    name: str
    role: str = Field(..., description="Employee role")
    phone: str | None = None
    employeeNumber: str | None = None
    departmentId: str | None = None
    password: str | None = None


class EmployeeUpdateRequest(BaseModel):
    """Request body for updating an employee.

    Matches: PUT /api/employees/{id}
    """

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    avatar: str | None = None
    role: str | None = None
    employeeNumber: str | None = None
    departmentId: str | None = None
    isActive: bool | None = None
    gpsLocation: str | None = None
    password: str | None = None


# ── HR Employee (HrEmployee-level) schemas ───────────────────────────────────


class HrEmployeeCreateRequest(BaseModel):
    """Request body for creating an HR employee record.

    Matches: POST /api/hr/employees
    """

    userId: str = Field(..., description="User ID to link")
    employeeId: str | None = Field(default=None, description="Employee ID (e.g. EMP-001)")
    departmentId: str | None = None
    designation: str | None = None
    employmentType: str = Field(default="full_time")
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
    status: str = Field(default="active")
    shiftId: str | None = None


class HrEmployeeUpdateRequest(BaseModel):
    """Request body for updating an HR employee record.

    Matches: PUT /api/hr/employees/{id}
    """

    departmentId: str | None = None
    designation: str | None = None
    employmentType: str | None = None
    status: str | None = None
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
    reportingToId: str | None = None
    shiftId: str | None = None
