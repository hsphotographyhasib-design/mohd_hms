"""
Departments router - department management endpoints.

MOHD.HMS ENTERPRISE

Mounted at /api/v1/departments and /api/v1/hr/departments.

Response formats:
  - Simple list: { data: [{id, name, description}] }
  - HR list: { data: [{id, name, description, headId, headName, employeeCount, ...}], users: [...] }
  - Create: { id, name } (201)
  - Detail: { id, name, description, headId, headName, employeeCount, ... }
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, require_permission, require_role
from app.core.logging import get_logger

from . import service as dept_svc
from .schemas import DepartmentCreateRequest, DepartmentUpdateRequest

log = get_logger(__name__)

router = APIRouter()


# ── Simple departments list (for dropdowns) ──────────────────────────────


@router.get("")
async def list_departments(
    user: AuthUser = Depends(require_permission("employees")),
    pageSize: int = Query(default=50, ge=1, le=100, alias="pageSize"),
):
    """GET /api/v1/departments — List active departments (dropdown).

    Matches: GET /api/departments
    Returns: { data: [{id, name, description}] }
    """
    return await dept_svc.list_departments(user.tenantId, page_size=pageSize)


@router.post("")
async def create_department(
    body: DepartmentCreateRequest,
    user: AuthUser = Depends(require_permission("hr")),
):
    """POST /api/v1/departments — Create department (admin/hr).

    Returns: { id, name } (201)
    """
    return await dept_svc.create_department(
        tenant_id=user.tenantId,
        name=body.name,
        description=body.description or "",
        head_id=body.headId,
        is_active=body.isActive,
    )


@router.get("/{dept_id}")
async def get_department(
    dept_id: str,
    user: AuthUser = Depends(require_permission("employees")),
):
    """GET /api/v1/departments/{id} — Get department detail."""
    return await dept_svc.get_department(user.tenantId, dept_id)


@router.put("/{dept_id}")
async def update_department(
    dept_id: str,
    body: DepartmentUpdateRequest,
    user: AuthUser = Depends(require_permission("hr")),
):
    """PUT /api/v1/departments/{id} — Update department."""
    update_data = body.model_dump(exclude_unset=True)
    return await dept_svc.update_department(user.tenantId, dept_id, update_data)


# ── HR departments (with employee counts) ────────────────────────────────
# Mounted separately at /api/v1/hr/departments via main router.

hr_router = APIRouter()


@hr_router.get("")
async def list_departments_hr(
    user: AuthUser = Depends(require_permission("hr")),
):
    """GET /api/v1/hr/departments — List departments with employee counts.

    Matches: GET /api/hr/departments
    Returns: { data: [{id, name, ..., headName, employeeCount}], users: [...] }
    """
    return await dept_svc.list_departments_hr(user.tenantId)


@hr_router.post("")
async def create_department_hr(
    body: DepartmentCreateRequest,
    user: AuthUser = Depends(require_permission("hr")),
):
    """POST /api/v1/hr/departments — Create department (HR).

    Matches: POST /api/hr/departments
    Returns: { id, name } (201)
    """
    return await dept_svc.create_department(
        tenant_id=user.tenantId,
        name=body.name,
        description=body.description or "",
        head_id=body.headId,
        is_active=body.isActive,
    )


@hr_router.get("/{dept_id}")
async def get_department_hr(
    dept_id: str,
    user: AuthUser = Depends(require_permission("hr")),
):
    """GET /api/v1/hr/departments/{id} — Get department detail (HR)."""
    return await dept_svc.get_department(user.tenantId, dept_id)
