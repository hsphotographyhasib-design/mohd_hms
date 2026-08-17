"""
Department service layer.

MOHD.HMS ENTERPRISE

Provides: list_departments (simple + HR full), create_department,
update_department, get_department, get_department_employees.

Two list modes:
  1. Simple (for /api/departments): { data: [{id, name, description}] }
  2. HR full (for /api/hr/departments): { data: [{id, name, description, headId, headName, employeeCount, ...}], users: [...] }
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger
from app.core.database import resolve_includes
from app.integrations.supabase import AsyncSupabaseClient, get_supabase
from app.utils.helpers import sanitize_input

log = get_logger(__name__)


async def _safe_query(fn, fallback=None, label=""):
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


async def list_departments(
    tenant_id: str,
    page_size: int = 50,
) -> dict[str, Any]:
    """List active departments (simple list for dropdowns).

    Matches: GET /api/departments
    Returns: { data: [{id, name, description}] }
    """
    db: AsyncSupabaseClient = get_supabase()

    result = await db.query(
        "Department",
        select="id,name,description",
        where={"tenantId": tenant_id, "isActive": True},
        order="name.asc",
        limit=page_size,
    )

    return {"data": result.get("data", [])}


async def list_departments_hr(
    tenant_id: str,
) -> dict[str, Any]:
    """List all departments with employee counts and head names (HR view).

    Matches: GET /api/hr/departments
    Returns: { data: [{id, name, description, headId, headName, employeeCount, ...}], users: [...] }
    """
    db: AsyncSupabaseClient = get_supabase()

    # Fetch departments
    depts_result = await _safe_query(
        lambda: db.query(
            "Department",
            select="id,name,description,headId,isActive,createdAt,updatedAt",
            where={"tenantId": tenant_id},
            order="name.asc",
        ),
        fallback={"data": []},
        label="hr_departments",
    )
    departments = depts_result.get("data", [])

    # Collect head IDs
    head_ids = list(set(d.get("headId") for d in departments if d.get("headId")))

    # Fetch head names
    head_map: dict[str, str] = {}
    if head_ids:
        heads_result = await _safe_query(
            lambda: db.query(
                "User",
                select="id,name",
                where={"id": {"in": head_ids}},
            ),
            fallback={"data": []},
            label="dept_heads",
        )
        for h in heads_result.get("data", []):
            head_map[h["id"]] = h.get("name")

    # Count employees per department (User + HrEmployee)
    dept_ids = [d["id"] for d in departments]
    user_counts: dict[str, int] = {}
    hr_counts: dict[str, int] = {}

    if dept_ids:
        # Count users per department
        for dept_id in dept_ids:
            uc = await _safe_query(
                lambda did=dept_id: db.count("User", where={"tenantId": tenant_id, "departmentId": did}),
                fallback=0,
                label=f"dept_user_count_{dept_id[:8]}",
            )
            user_counts[dept_id] = uc

            hc = await _safe_query(
                lambda did=dept_id: db.count("HrEmployee", where={"tenantId": tenant_id, "departmentId": did}),
                fallback=0,
                label=f"dept_hr_count_{dept_id[:8]}",
            )
            hr_counts[dept_id] = hc

    data = []
    for d in departments:
        did = d["id"]
        data.append({
            "id": did,
            "name": d.get("name"),
            "description": d.get("description"),
            "headId": d.get("headId"),
            "headName": head_map.get(d.get("headId")) if d.get("headId") else None,
            "employeeCount": user_counts.get(did, 0) + hr_counts.get(did, 0),
            "isActive": d.get("isActive", True),
            "createdAt": _to_iso(d.get("createdAt")),
            "updatedAt": _to_iso(d.get("updatedAt")),
        })

    # Fetch all active users for the head assignment dropdown
    users_result = await _safe_query(
        lambda: db.query(
            "User",
            select="id,name,email",
            where={"tenantId": tenant_id, "isActive": True},
            order="name.asc",
        ),
        fallback={"data": []},
        label="dept_users",
    )

    return {
        "data": data,
        "users": users_result.get("data", []),
    }


async def create_department(
    tenant_id: str,
    name: str,
    description: str = "",
    head_id: str | None = None,
    is_active: bool = True,
) -> dict[str, Any]:
    """Create a department.

    Matches: POST /api/hr/departments
    Returns: { id, name } (201)
    """
    db: AsyncSupabaseClient = get_supabase()

    name = sanitize_input(name)
    if not name:
        raise ValidationException(message="Department name is required")

    data: dict[str, Any] = {
        "tenantId": tenant_id,
        "name": name,
        "description": sanitize_input(description),
        "headId": head_id or None,
        "isActive": is_active,
    }

    created = await db.insert("Department", data)

    return {
        "id": created.get("id"),
        "name": created.get("name"),
    }


async def get_department(
    tenant_id: str,
    department_id: str,
) -> dict[str, Any]:
    """Get a single department by ID.

    Returns: department object
    """
    db: AsyncSupabaseClient = get_supabase()

    result = await db.query(
        "Department",
        select="id,name,description,headId,isActive,createdAt,updatedAt",
        where={"id": department_id, "tenantId": tenant_id},
        single=True,
    )

    dept = result.get("data")
    if isinstance(dept, list):
        dept = dept[0] if dept else None
    if not dept:
        raise NotFoundException(resource="Department")

    # Fetch head name
    head_name = None
    if dept.get("headId"):
        head_result = await _safe_query(
            lambda: db.query("User", select="name", where={"id": dept["headId"]}, single=True),
            fallback=None,
            label="dept_head",
        )
        head_data = head_result.get("data") if isinstance(head_result, dict) else None
        if isinstance(head_data, list):
            head_data = head_data[0] if head_data else None
        head_name = head_data.get("name") if head_data else None

    # Count employees
    emp_count = 0
    uc = await _safe_query(
        lambda: db.count("User", where={"tenantId": tenant_id, "departmentId": department_id}),
        fallback=0,
        label="dept_emp_count",
    )
    hc = await _safe_query(
        lambda: db.count("HrEmployee", where={"tenantId": tenant_id, "departmentId": department_id}),
        fallback=0,
        label="dept_hr_emp_count",
    )
    emp_count = uc + hc

    return {
        "id": dept.get("id"),
        "name": dept.get("name"),
        "description": dept.get("description"),
        "headId": dept.get("headId"),
        "headName": head_name,
        "isActive": dept.get("isActive", True),
        "employeeCount": emp_count,
        "createdAt": _to_iso(dept.get("createdAt")),
        "updatedAt": _to_iso(dept.get("updatedAt")),
    }


async def update_department(
    tenant_id: str,
    department_id: str,
    update_data: dict[str, Any],
) -> dict[str, Any]:
    """Update a department.

    Matches: PUT /api/departments/{id}
    """
    db: AsyncSupabaseClient = get_supabase()

    existing = await _safe_query(
        lambda: db.query("Department", select="id", where={"id": department_id, "tenantId": tenant_id}, single=True),
        label="update_dept_check",
    )
    if not existing or not existing.get("data"):
        raise NotFoundException(resource="Department")

    if "name" in update_data and update_data["name"]:
        update_data["name"] = sanitize_input(update_data["name"])
    if "description" in update_data:
        update_data["description"] = sanitize_input(update_data["description"] or "")
    if "headId" in update_data and not update_data["headId"]:
        update_data["headId"] = None

    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()

    updated = await db.update("Department", department_id, update_data)

    return {
        "id": updated.get("id"),
        "name": updated.get("name"),
    }


async def get_department_employees(
    tenant_id: str,
    department_id: str,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Get employees in a department.

    Returns: { data: [...], total, page, pageSize, totalPages }
    """
    db: AsyncSupabaseClient = get_supabase()
    offset = (page - 1) * page_size

    select = "id,tenantId,email,name,phone,avatar,role,employeeNumber,departmentId,isActive,isOnline,lastLogin,profileCompleted,createdAt,updatedAt,department:Department(id,name)"

    result = await db.query(
        "User",
        select="id,tenantId,email,name,phone,avatar,role,employeeNumber,departmentId,isActive,isOnline,lastLogin,profileCompleted,createdAt,updatedAt",
        where={"tenantId": tenant_id, "departmentId": department_id},
        order="name.asc",
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
        formatted.append({
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
        })

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "data": formatted,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }
