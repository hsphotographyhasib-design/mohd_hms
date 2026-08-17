"""
Employees router — employee management endpoints.

MOHD.HMS ENTERPRISE

Mounted at /api/v1/employees and /api/v1/hr/employees.

Response formats match the frontend:
  - List: { data: [...], total, page, pageSize, totalPages }
  - Detail: flat object
  - Create: flat object (201)
  - Delete: { message: '...' } or { success: true }
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, require_permission, require_role
from app.core.logging import get_logger

from . import service as emp_svc
from .schemas import (
    EmployeeCreateRequest,
    EmployeeUpdateRequest,
    HrEmployeeCreateRequest,
    HrEmployeeUpdateRequest,
)

log = get_logger(__name__)

router = APIRouter()


# ── Employee (User-level) endpoints ─────────────────────────────────────────


@router.get("")
async def list_employees(
    user: AuthUser = Depends(require_permission("employees")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    role: str = Query(default=""),
    departmentId: str = Query(default=""),
):
    """GET /api/v1/employees — List employees (admin/hr).

    Returns: { data: [...], total, page, pageSize, totalPages }
    """
    return await emp_svc.list_employees(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search,
        role=role,
        department_id=departmentId,
    )


@router.post("", status_code=201)
async def create_employee(
    body: EmployeeCreateRequest,
    user: AuthUser = Depends(require_permission("employee.create")),
):
    """POST /api/v1/employees — Create employee (admin/hr).

    Returns: employee object (201)
    """
    return await emp_svc.create_employee(
        tenant_id=user.tenantId,
        email=body.email,
        name=body.name,
        employee_role=body.role,
        phone=body.phone,
        employee_number=body.employeeNumber,
        department_id=body.departmentId,
        password=body.password,
    )


@router.get("/{employee_id}")
async def get_employee(
    employee_id: str,
    user: AuthUser = Depends(require_permission("employees")),
):
    """GET /api/v1/employees/{id} — Get employee detail."""
    return await emp_svc.get_employee(user.tenantId, employee_id)


@router.put("/{employee_id}")
async def update_employee(
    employee_id: str,
    body: EmployeeUpdateRequest,
    user: AuthUser = Depends(require_permission("employee.update")),
):
    """PUT /api/v1/employees/{id} — Update employee."""
    update_data = body.model_dump(exclude_unset=True)
    return await emp_svc.update_employee(user.tenantId, employee_id, update_data)


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    user: AuthUser = Depends(require_permission("employee.delete")),
):
    """DELETE /api/v1/employees/{id} — Delete employee."""
    await emp_svc.delete_employee(user.tenantId, employee_id)
    return {"message": "Employee deleted successfully"}


# ── HR Employee (HrEmployee-level) endpoints ────────────────────────────────
# These are mounted separately at /api/v1/hr/employees via the main router.

hr_router = APIRouter()


@hr_router.get("")
async def list_hr_employees(
    user: AuthUser = Depends(require_permission("hr")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    department: str = Query(default=""),
    status: str = Query(default=""),
    employmentType: str = Query(default=""),
):
    """GET /api/v1/hr/employees — List HR employees.

    Returns: { data: [...], total, page, pageSize, totalPages }
    """
    return await emp_svc.list_hr_employees(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search,
        department=department,
        status=status,
        employment_type=employmentType,
    )


@hr_router.post("", status_code=201)
async def create_hr_employee(
    body: HrEmployeeCreateRequest,
    user: AuthUser = Depends(require_permission("hr")),
):
    """POST /api/v1/hr/employees — Create HR employee record."""
    return await emp_svc.create_hr_employee(
        tenant_id=user.tenantId,
        data=body.model_dump(exclude_unset=True),
    )


@hr_router.get("/{employee_id}")
async def get_hr_employee(
    employee_id: str,
    user: AuthUser = Depends(require_permission("hr")),
):
    """GET /api/v1/hr/employees/{id} — Get HR employee detail."""
    return await emp_svc.get_hr_employee(user.tenantId, employee_id)


@hr_router.put("/{employee_id}")
async def update_hr_employee(
    employee_id: str,
    body: HrEmployeeUpdateRequest,
    user: AuthUser = Depends(require_permission("hr")),
):
    """PUT /api/v1/hr/employees/{id} — Update HR employee record."""
    update_data = body.model_dump(exclude_unset=True)
    return await emp_svc.update_hr_employee(user.tenantId, employee_id, update_data)


@hr_router.delete("/{employee_id}")
async def delete_hr_employee(
    employee_id: str,
    user: AuthUser = Depends(require_permission("hr")),
):
    """DELETE /api/v1/hr/employees/{id} — Delete HR employee record."""
    await emp_svc.delete_hr_employee(user.tenantId, employee_id)
    return {"success": True}
