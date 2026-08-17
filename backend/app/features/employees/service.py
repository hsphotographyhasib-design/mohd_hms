"""
Employee service layer.

MOHD.HMS ENTERPRISE

Provides: list_employees, create_employee, get_employee, update_employee, delete_employee.
Also provides HR-level employee operations via HrEmployee table.

Employees = users with non-customer roles (technician, supervisor, manager, admin, finance, hr, user).
All queries enforce tenant isolation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.exceptions import (
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.core.security import hash_password, normalize_role
from app.core.database import resolve_includes
from app.integrations.supabase import AsyncSupabaseClient, get_supabase
from app.utils.helpers import generate_employee_id

from .schemas import EMPLOYEE_ROLES, NON_EMPLOYEE_ROLES

log = get_logger(__name__)


async def _safe_query(fn, fallback=None, label=""):
    """Run a query, returning fallback on error (resilient pattern)."""
    try:
        return await fn()
    except Exception as exc:
        log.warning(f"[{label}] query failed: {exc}")
        return fallback


def _to_iso(val: Any) -> str | None:
    if val is None:
        return None
    try:
        return str(val)
    except Exception:
        return None


def _format_employee(u: dict[str, Any], dept: dict | None = None) -> dict[str, Any]:
    """Format a user row into the frontend employee response shape."""
    return {
        "id": u.get("id"),
        "tenantId": u.get("tenantId"),
        "email": u.get("email"),
        "name": u.get("name"),
        "phone": u.get("phone"),
        "avatar": u.get("avatar"),
        "role": u.get("role"),
        "employeeNumber": u.get("employeeNumber"),
        "departmentId": u.get("departmentId"),
        "departmentName": (dept or {}).get("name") if dept else None,
        "isActive": u.get("isActive", True),
        "isOnline": u.get("isOnline", False),
        "lastLogin": _to_iso(u.get("lastLogin")),
        "profileCompleted": u.get("profileCompleted", False),
        "createdAt": _to_iso(u.get("createdAt")),
        "updatedAt": _to_iso(u.get("updatedAt")),
    }


# ── Employee (User-level) operations ─────────────────────────────────────────


async def list_employees(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    role: str = "",
    department_id: str = "",
) -> dict[str, Any]:
    """List employees (users with non-customer roles).

    Matches: GET /api/employees
    Returns: { data: [...], total, page, pageSize, totalPages }
    """
    db: AsyncSupabaseClient = get_supabase()
    offset = (page - 1) * page_size

    where: dict[str, Any] = {
        "tenantId": tenant_id,
        "role": {"notIn": NON_EMPLOYEE_ROLES},
    }

    if search:
        where["OR"] = [
            {"name": {"contains": search}},
            {"email": {"contains": search}},
            {"employeeNumber": {"contains": search}},
        ]

    if role:
        where["role"] = role

    if department_id:
        where["departmentId"] = department_id

    select = "id,tenantId,email,name,phone,avatar,role,employeeNumber,departmentId,isActive,isOnline,lastLogin,profileCompleted,createdAt,updatedAt,department:Department(id,name)"

    result = await db.query(
        "User",
        select="id,tenantId,email,name,phone,avatar,role,employeeNumber,departmentId,isActive,isOnline,lastLogin,profileCompleted,createdAt,updatedAt",
        where=where,
        order="createdAt.desc",
        offset=offset,
        limit=page_size,
        count="exact",
    )

    users = await resolve_includes(result.get("data", []), select)
    count_str = result.get("count", "0")
    try:
        total = int(count_str) if count_str != "*" else len(users)
    except (ValueError, TypeError):
        total = len(users)

    formatted = []
    for u in users:
        dept = u.pop("department", None)
        formatted.append(_format_employee(u, dept))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "data": formatted,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }


async def create_employee(
    tenant_id: str,
    email: str,
    name: str,
    employee_role: str,
    phone: str | None = None,
    employee_number: str | None = None,
    department_id: str | None = None,
    password: str | None = None,
) -> dict[str, Any]:
    """Create a new employee user.

    Matches: POST /api/employees
    Returns: employee object (status 201)
    """
    db: AsyncSupabaseClient = get_supabase()

    if employee_role not in EMPLOYEE_ROLES:
        raise ValidationException(
            message=f"Invalid employee role. Allowed: {', '.join(EMPLOYEE_ROLES)}"
        )

    password_hash = hash_password(password) if password else None

    data: dict[str, Any] = {
        "tenantId": tenant_id,
        "email": email,
        "name": name,
        "role": employee_role,
        "profileCompleted": True,
        "isActive": True,
    }
    if password_hash:
        data["passwordHash"] = password_hash
    if phone:
        data["phone"] = phone
    if employee_number:
        data["employeeNumber"] = employee_number
    if department_id:
        data["departmentId"] = department_id

    created = await db.insert("User", data)

    # Fetch with department
    if department_id:
        full = await _safe_query(
            lambda: db.query(
                "User",
                select="id,tenantId,email,name,phone,avatar,role,employeeNumber,departmentId,isActive,isOnline,profileCompleted,createdAt,updatedAt",
                where={"id": created.get("id")},
                single=True,
            ),
            label="create_employee-fetch",
        )
        full_user = full.get("data") if isinstance(full.get("data"), dict) else None
        if full_user:
            await resolve_includes([full_user], "department:Department(id,name)")
            dept = full_user.pop("department", None)
            return _format_employee(full_user, dept)

    return _format_employee(created)


async def get_employee(tenant_id: str, employee_id: str) -> dict[str, Any]:
    """Get a single employee by ID.

    Matches: GET /api/employees/{id}
    Returns: flat employee object
    """
    db: AsyncSupabaseClient = get_supabase()

    select = "id,tenantId,email,name,phone,avatar,role,employeeNumber,departmentId,isActive,isOnline,lastLogin,gpsLocation,profileCompleted,createdAt,updatedAt"

    result = await db.query(
        "User",
        select=select,
        where={"id": employee_id, "tenantId": tenant_id},
        single=True,
    )

    user = result.get("data")
    if isinstance(user, list):
        user = user[0] if user else None

    if not user:
        raise NotFoundException(resource="Employee")

    # Check not a non-employee role
    if user.get("role") in NON_EMPLOYEE_ROLES:
        raise NotFoundException(resource="Employee")

    await resolve_includes([user], "department:Department(id,name)")

    dept = user.pop("department", None)
    return _format_employee(user, dept)


async def update_employee(
    tenant_id: str,
    employee_id: str,
    update_data: dict[str, Any],
) -> dict[str, Any]:
    """Update an employee.

    Matches: PUT /api/employees/{id}
    Returns: updated employee object
    """
    db: AsyncSupabaseClient = get_supabase()

    # Check exists and is an employee
    existing = await _safe_query(
        lambda: db.query(
            "User",
            select="id,role",
            where={"id": employee_id, "tenantId": tenant_id},
            single=True,
        ),
        label="update_employee-check",
    )
    existing_user = existing.get("data") if isinstance(existing.get("data"), dict) else None
    if not existing_user or existing_user.get("role") in NON_EMPLOYEE_ROLES:
        raise NotFoundException(resource="Employee")

    # Process password if provided
    if "password" in update_data and update_data["password"]:
        update_data["passwordHash"] = hash_password(update_data.pop("password"))
    else:
        update_data.pop("password", None)

    if "phone" in update_data and not update_data["phone"]:
        update_data["phone"] = None
    if "avatar" in update_data and not update_data["avatar"]:
        update_data["avatar"] = None
    if "gpsLocation" in update_data and not update_data["gpsLocation"]:
        update_data["gpsLocation"] = None
    if "employeeNumber" in update_data and not update_data["employeeNumber"]:
        update_data["employeeNumber"] = None
    if "departmentId" in update_data and not update_data["departmentId"]:
        update_data["departmentId"] = None

    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()

    updated = await db.update("User", employee_id, update_data)

    # Fetch with department
    full = await _safe_query(
        lambda: db.query(
            "User",
            select="id,tenantId,email,name,phone,avatar,role,employeeNumber,departmentId,isActive,isOnline,lastLogin,profileCompleted,createdAt,updatedAt",
            where={"id": employee_id},
            single=True,
        ),
        label="update_employee-fetch",
    )
    full_user = full.get("data") if isinstance(full.get("data"), dict) else None
    if full_user:
        await resolve_includes([full_user], "department:Department(id,name)")
        dept = full_user.pop("department", None)
        return _format_employee(full_user, dept)

    return _format_employee(updated)


async def delete_employee(tenant_id: str, employee_id: str) -> None:
    """Delete an employee.

    Matches: DELETE /api/employees/{id}
    Returns: { message: 'Employee deleted successfully' }
    """
    db: AsyncSupabaseClient = get_supabase()

    # Check exists and is an employee
    existing = await _safe_query(
        lambda: db.query(
            "User",
            select="id,role",
            where={"id": employee_id, "tenantId": tenant_id},
            single=True,
        ),
        label="delete_employee-check",
    )
    existing_user = existing.get("data") if isinstance(existing.get("data"), dict) else None
    if not existing_user or existing_user.get("role") in NON_EMPLOYEE_ROLES:
        raise NotFoundException(resource="Employee")

    await db.delete("User", employee_id)


# ── HR Employee (HrEmployee-level) operations ─────────────────────────────────


def _format_hr_employee(e: dict[str, Any], user: dict | None = None, dept: dict | None = None) -> dict[str, Any]:
    """Format an HR employee record."""
    return {
        "id": e.get("id"),
        "tenantId": e.get("tenantId"),
        "userId": e.get("userId"),
        "employeeId": e.get("employeeId"),
        "departmentId": e.get("departmentId"),
        "departmentName": (dept or {}).get("name") if dept else None,
        "designation": e.get("designation"),
        "employmentType": e.get("employmentType"),
        "status": e.get("status"),
        "joiningDate": _to_iso(e.get("joiningDate")),
        "basicSalary": e.get("basicSalary"),
        "nationality": e.get("nationality"),
        "passportNumber": e.get("passportNumber"),
        "passportExpiry": _to_iso(e.get("passportExpiry")),
        "visaNumber": e.get("visaNumber"),
        "visaExpiry": _to_iso(e.get("visaExpiry")),
        "drivingLicense": e.get("drivingLicense"),
        "drivingLicenseExpiry": _to_iso(e.get("drivingLicenseExpiry")),
        "probationEnds": _to_iso(e.get("probationEnds")),
        "contractEnd": _to_iso(e.get("contractEnd")),
        "bankName": e.get("bankName"),
        "bankAccount": e.get("bankAccount"),
        "bankBranch": e.get("bankBranch"),
        "emergencyName": e.get("emergencyName"),
        "emergencyPhone": e.get("emergencyPhone"),
        "emergencyRelation": e.get("emergencyRelation"),
        "dateOfBirth": _to_iso(e.get("dateOfBirth")),
        "gender": e.get("gender"),
        "maritalStatus": e.get("maritalStatus"),
        "bloodGroup": e.get("bloodGroup"),
        "photo": e.get("photo"),
        "reportingToId": e.get("reportingToId"),
        "shiftId": e.get("shiftId"),
        "userName": (user or {}).get("name", "") if user else "",
        "userEmail": (user or {}).get("email", "") if user else "",
        "userPhone": (user or {}).get("phone", "") if user else "",
        "userAvatar": (user or {}).get("avatar", "") if user else "",
        "createdAt": _to_iso(e.get("createdAt")),
        "updatedAt": _to_iso(e.get("updatedAt")),
    }


async def list_hr_employees(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    department: str = "",
    status: str = "",
    employment_type: str = "",
) -> dict[str, Any]:
    """List HR employees (HrEmployee table joined with User and Department).

    Matches: GET /api/hr/employees
    Returns: { data: [...], total, page, pageSize, totalPages }
    """
    db: AsyncSupabaseClient = get_supabase()
    offset = (page - 1) * page_size

    where: dict[str, Any] = {"tenantId": tenant_id}

    if search:
        where["OR"] = [
            {"employeeId": {"contains": search}},
            {"designation": {"contains": search}},
        ]

    if department:
        where["departmentId"] = department
    if status:
        where["status"] = status
    if employment_type:
        where["employmentType"] = employment_type

    select = "*,user:User(name,email,phone,avatar),department:Department(name)"

    result = await db.query(
        "HrEmployee",
        select="*",
        where=where,
        order="createdAt.desc",
        offset=offset,
        limit=page_size,
        count="exact",
    )

    employees = await resolve_includes(result.get("data", []), select)
    count_str = result.get("count", "0")
    try:
        total = int(count_str) if count_str != "*" else len(employees)
    except (ValueError, TypeError):
        total = len(employees)

    formatted = []
    for e in employees:
        user = e.pop("user", None)
        dept = e.pop("department", None)
        formatted.append(_format_hr_employee(e, user, dept))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "data": formatted,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }


async def create_hr_employee(
    tenant_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create an HR employee record.

    Matches: POST /api/hr/employees
    Returns: { id, employeeId, departmentName, userName, status } (201)
    """
    db: AsyncSupabaseClient = get_supabase()

    if not data.get("userId"):
        raise ValidationException(message="User ID is required")

    emp_id = data.get("employeeId") or generate_employee_id(tenant_id)

    record: dict[str, Any] = {
        "tenantId": tenant_id,
        "userId": data["userId"],
        "employeeId": emp_id,
        "departmentId": data.get("departmentId") or None,
        "designation": data.get("designation") or "",
        "employmentType": data.get("employmentType") or "full_time",
        "reportingToId": data.get("reportingToId") or None,
        "basicSalary": data.get("basicSalary"),
        "nationality": data.get("nationality") or "",
        "passportNumber": data.get("passportNumber") or "",
        "passportExpiry": data.get("passportExpiry"),
        "visaNumber": data.get("visaNumber") or "",
        "visaExpiry": data.get("visaExpiry"),
        "drivingLicense": data.get("drivingLicense") or "",
        "drivingLicenseExpiry": data.get("drivingLicenseExpiry"),
        "joiningDate": data.get("joiningDate") or datetime.now(timezone.utc).isoformat(),
        "probationEnds": data.get("probationEnds"),
        "contractEnd": data.get("contractEnd"),
        "bankName": data.get("bankName") or "",
        "bankAccount": data.get("bankAccount") or "",
        "bankBranch": data.get("bankBranch") or "",
        "emergencyName": data.get("emergencyName") or "",
        "emergencyPhone": data.get("emergencyPhone") or "",
        "emergencyRelation": data.get("emergencyRelation") or "",
        "dateOfBirth": data.get("dateOfBirth"),
        "gender": data.get("gender"),
        "maritalStatus": data.get("maritalStatus"),
        "bloodGroup": data.get("bloodGroup") or "",
        "status": data.get("status") or "active",
        "shiftId": data.get("shiftId") or None,
    }

    created = await db.insert("HrEmployee", record)

    return {
        "id": created.get("id"),
        "employeeId": created.get("employeeId"),
        "departmentName": None,
        "userName": "",
        "status": created.get("status", "active"),
    }


async def get_hr_employee(tenant_id: str, employee_id: str) -> dict[str, Any]:
    """Get a single HR employee by ID.

    Matches: GET /api/hr/employees/{id}
    """
    db: AsyncSupabaseClient = get_supabase()

    select = "*,user:User(id,name,email,phone,avatar),department:Department(id,name)"

    result = await db.query(
        "HrEmployee",
        select="*",
        where={"id": employee_id, "tenantId": tenant_id},
        single=True,
    )

    emp = result.get("data")
    if isinstance(emp, list):
        emp = emp[0] if emp else None

    if not emp:
        raise NotFoundException(resource="Employee")

    await resolve_includes([emp], select)

    user = emp.pop("user", None)
    dept = emp.pop("department", None)
    return _format_hr_employee(emp, user, dept)


async def update_hr_employee(
    tenant_id: str,
    employee_id: str,
    update_data: dict[str, Any],
) -> dict[str, Any]:
    """Update an HR employee record.

    Matches: PUT /api/hr/employees/{id}
    """
    db: AsyncSupabaseClient = get_supabase()

    existing = await _safe_query(
        lambda: db.query(
            "HrEmployee",
            select="id",
            where={"id": employee_id, "tenantId": tenant_id},
            single=True,
        ),
        label="update_hr_employee-check",
    )
    if not existing or not existing.get("data"):
        raise NotFoundException(resource="Employee")

    # Clean up null-like values
    for key in ("departmentId", "reportingToId", "shiftId"):
        if key in update_data and not update_data[key]:
            update_data[key] = None
    for key in ("basicSalary", "passportExpiry", "visaExpiry", "drivingLicenseExpiry",
                 "joiningDate", "probationEnds", "contractEnd", "dateOfBirth"):
        if key in update_data and not update_data[key]:
            update_data[key] = None

    updated = await db.update("HrEmployee", employee_id, update_data)

    return {
        "id": updated.get("id"),
        "employeeId": updated.get("employeeId"),
        "departmentName": None,
        "userName": "",
        "status": updated.get("status"),
    }


async def delete_hr_employee(tenant_id: str, employee_id: str) -> None:
    """Delete an HR employee record.

    Matches: DELETE /api/hr/employees/{id}
    """
    db: AsyncSupabaseClient = get_supabase()

    existing = await _safe_query(
        lambda: db.query(
            "HrEmployee",
            select="id",
            where={"id": employee_id, "tenantId": tenant_id},
            single=True,
        ),
        label="delete_hr_employee-check",
    )
    if not existing or not existing.get("data"):
        raise NotFoundException(resource="Employee")

    await db.delete("HrEmployee", employee_id)
