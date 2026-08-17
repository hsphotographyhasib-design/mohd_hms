"""
Preventive Maintenance business logic.

MOHD.HMS ENTERPRISE

Implements:
  - CRUD for PM schedules
  - RBAC feature access
  - Auto-generate work orders when due (conceptual)
  - Cache invalidation
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.integrations.redis import get_redis
from app.rbac.permissions import require_permission
from app.utils.helpers import build_cache_key, generate_work_order_number, utcnow

log = get_logger(__name__)

# ── Table name constants ─────────────────────────────────────────────────────

PM_TABLE = MODEL_TO_TABLE.get("pmSchedule", "PmSchedule")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")
EQUIP_TABLE = MODEL_TO_TABLE.get("equipment", "Equipment")
WO_TABLE = MODEL_TO_TABLE.get("workOrder", "WorkOrder")

# ── Frequency to days mapping ───────────────────────────────────────────────

FREQUENCY_DAYS: dict[str, int] = {
    "daily": 1,
    "weekly": 7,
    "biweekly": 14,
    "monthly": 30,
    "quarterly": 90,
    "semiannually": 180,
    "annually": 365,
    "custom": 30,  # fallback for custom
}


# ── List PM Schedules ────────────────────────────────────────────────────────


async def list_pm_schedules(
    tenant_id: str,
    user: AuthUser,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List PM schedules with pagination and filtering."""
    require_permission("pm", user.role)

    page = params.get("page", 1)
    page_size = min(params.get("pageSize", 20), 100)
    search = params.get("search", "")
    status_filter = params.get("status", "")
    frequency = params.get("frequency", "")
    offset = (page - 1) * page_size

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"title": {"contains": search}},
            {"description": {"contains": search}},
        ]
    if status_filter:
        where["status"] = status_filter
    if frequency:
        where["frequency"] = frequency

    result = await query_table(
        PM_TABLE,
        select="*",
        where=where,
        order="nextDueDate.asc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    rows = result.get("data", [])
    total_str = result.get("count", "0")
    try:
        total = int(total_str) if total_str not in ("*", None) else len(rows)
    except (ValueError, TypeError):
        total = len(rows)

    # Batch-fetch equipment and user names
    equip_ids = {r.get("equipmentId") for r in rows if r.get("equipmentId")}
    user_ids = {r.get("assignedToId") for r in rows if r.get("assignedToId")}

    equip_map: dict[str, str] = {}
    if equip_ids:
        try:
            e_result = await query_table(
                EQUIP_TABLE,
                select="id,name",
                where={"id": {"in": list(equip_ids)}},
                tenant_id=tenant_id,
                limit=len(equip_ids),
            )
            equip_map = {e["id"]: e.get("name", "") for e in e_result.get("data", [])}
        except Exception:
            pass

    user_map: dict[str, str] = {}
    if user_ids:
        try:
            u_result = await query_table(
                USER_TABLE,
                select="id,name",
                where={"id": {"in": list(user_ids)}},
                tenant_id=tenant_id,
                limit=len(user_ids),
            )
            user_map = {u["id"]: u.get("name", "") for u in u_result.get("data", [])}
        except Exception:
            pass

    data = [
        {
            "id": r["id"],
            "tenantId": r["tenantId"],
            "equipmentId": r.get("equipmentId"),
            "equipmentName": equip_map.get(r.get("equipmentId")),
            "title": r.get("title", ""),
            "description": r.get("description"),
            "frequency": r.get("frequency", "monthly"),
            "customDays": r.get("customDays"),
            "lastExecuted": r.get("lastExecuted"),
            "nextDueDate": r.get("nextDueDate"),
            "assignedToId": r.get("assignedToId"),
            "assignedToName": user_map.get(r.get("assignedToId")),
            "status": r.get("status", "active"),
            "checklistTemplateId": r.get("checklistTemplateId"),
            "createdAt": r.get("createdAt"),
            "updatedAt": r.get("updatedAt"),
        }
        for r in rows
    ]

    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size) if total > 0 else 0,
    }


# ── Create PM Schedule ──────────────────────────────────────────────────────


async def create_pm_schedule(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new PM schedule."""
    require_permission("pm_module.create", user.role)

    equipment_id = data.get("equipmentId")
    title = data.get("title", "").strip()
    next_due = data.get("nextDueDate")

    if not equipment_id or not title or not next_due:
        raise ValidationException(message="Equipment, title, and nextDueDate are required")

    # Verify equipment exists
    try:
        e_result = await query_table(
            EQUIP_TABLE,
            select="id,name",
            where={"id": equipment_id},
            tenant_id=tenant_id,
            limit=1,
        )
        if not e_result.get("data"):
            raise ValidationException(message="Equipment not found")
        equip_name = e_result["data"][0].get("name", "")
    except ValidationException:
        raise
    except Exception:
        equip_name = ""

    record: dict[str, Any] = {
        "tenantId": tenant_id,
        "equipmentId": equipment_id,
        "title": title,
        "description": data.get("description") or None,
        "frequency": data.get("frequency") or "monthly",
        "customDays": data.get("customDays") or None,
        "lastExecuted": data.get("lastExecuted") or None,
        "nextDueDate": next_due,
        "assignedToId": data.get("assignedToId") or None,
        "checklistTemplateId": data.get("checklistTemplateId") or None,
        "status": "active",
    }

    pm = await insert_record(PM_TABLE, record)

    # Invalidate cache
    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "pm", "*"))

    return {
        "id": pm["id"],
        "tenantId": pm["tenantId"],
        "equipmentId": pm.get("equipmentId"),
        "equipmentName": equip_name,
        "title": pm.get("title", ""),
        "description": pm.get("description"),
        "frequency": pm.get("frequency", "monthly"),
        "customDays": pm.get("customDays"),
        "lastExecuted": pm.get("lastExecuted"),
        "nextDueDate": pm.get("nextDueDate"),
        "assignedToId": pm.get("assignedToId"),
        "assignedToName": None,  # Will resolve if needed
        "status": pm.get("status", "active"),
        "checklistTemplateId": pm.get("checklistTemplateId"),
        "createdAt": pm.get("createdAt"),
        "updatedAt": pm.get("updatedAt"),
    }


# ── Get PM Schedule ──────────────────────────────────────────────────────────


async def get_pm_schedule(
    pm_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get a single PM schedule by ID."""
    require_permission("pm", user.role)

    result = await query_table(
        PM_TABLE,
        select="*",
        where={"id": pm_id},
        tenant_id=tenant_id,
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="PmSchedule", message="PM schedule not found")

    pm = rows[0]

    # Resolve equipment and user names
    equip_name = None
    assigned_name = None

    if pm.get("equipmentId"):
        try:
            e_result = await query_table(
                EQUIP_TABLE,
                select="id,name,category",
                where={"id": pm["equipmentId"]},
                tenant_id=tenant_id,
                limit=1,
            )
            e_rows = e_result.get("data", [])
            if e_rows:
                equip_name = e_rows[0].get("name", "")
        except Exception:
            pass

    if pm.get("assignedToId"):
        try:
            u_result = await query_table(
                USER_TABLE,
                select="id,name",
                where={"id": pm["assignedToId"]},
                tenant_id=tenant_id,
                limit=1,
            )
            u_rows = u_result.get("data", [])
            if u_rows:
                assigned_name = u_rows[0].get("name", "")
        except Exception:
            pass

    return {
        "id": pm["id"],
        "tenantId": pm["tenantId"],
        "equipmentId": pm.get("equipmentId"),
        "equipmentName": equip_name,
        "title": pm.get("title", ""),
        "description": pm.get("description"),
        "frequency": pm.get("frequency", "monthly"),
        "customDays": pm.get("customDays"),
        "lastExecuted": pm.get("lastExecuted"),
        "nextDueDate": pm.get("nextDueDate"),
        "assignedToId": pm.get("assignedToId"),
        "assignedToName": assigned_name,
        "status": pm.get("status", "active"),
        "checklistTemplateId": pm.get("checklistTemplateId"),
        "createdAt": pm.get("createdAt"),
        "updatedAt": pm.get("updatedAt"),
    }


# ── Update PM Schedule ──────────────────────────────────────────────────────


async def update_pm_schedule(
    pm_id: str,
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update a PM schedule."""
    require_permission("pm_module.update", user.role)

    # Verify existence
    result = await query_table(
        PM_TABLE,
        select="id",
        where={"id": pm_id},
        tenant_id=tenant_id,
        limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="PmSchedule", message="PM schedule not found")

    update_data: dict[str, Any] = {}
    for field in (
        "title", "description", "frequency", "customDays",
        "lastExecuted", "nextDueDate", "assignedToId",
        "checklistTemplateId", "status",
    ):
        if field in data:
            update_data[field] = data[field] if data[field] is not None else None

    if not update_data:
        raise ValidationException(message="No fields to update")

    updated = await update_record(PM_TABLE, pm_id, update_data)

    # Resolve names
    equip_name = None
    assigned_name = None
    if updated.get("equipmentId"):
        try:
            e_result = await query_table(
                EQUIP_TABLE,
                select="id,name",
                where={"id": updated["equipmentId"]},
                tenant_id=tenant_id,
                limit=1,
            )
            e_rows = e_result.get("data", [])
            if e_rows:
                equip_name = e_rows[0].get("name", "")
        except Exception:
            pass
    if updated.get("assignedToId"):
        try:
            u_result = await query_table(
                USER_TABLE,
                select="id,name",
                where={"id": updated["assignedToId"]},
                tenant_id=tenant_id,
                limit=1,
            )
            u_rows = u_result.get("data", [])
            if u_rows:
                assigned_name = u_rows[0].get("name", "")
        except Exception:
            pass

    # Invalidate cache
    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "pm", "*"))

    return {
        "id": updated["id"],
        "tenantId": updated["tenantId"],
        "equipmentId": updated.get("equipmentId"),
        "equipmentName": equip_name,
        "title": updated.get("title", ""),
        "description": updated.get("description"),
        "frequency": updated.get("frequency", "monthly"),
        "customDays": updated.get("customDays"),
        "lastExecuted": updated.get("lastExecuted"),
        "nextDueDate": updated.get("nextDueDate"),
        "assignedToId": updated.get("assignedToId"),
        "assignedToName": assigned_name,
        "status": updated.get("status", "active"),
        "createdAt": updated.get("createdAt"),
        "updatedAt": updated.get("updatedAt"),
    }


# ── Delete PM Schedule ──────────────────────────────────────────────────────


async def delete_pm_schedule(
    pm_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, str]:
    """Delete a PM schedule (admin only)."""
    require_permission("pm_module.delete", user.role)

    result = await query_table(
        PM_TABLE,
        select="id",
        where={"id": pm_id},
        tenant_id=tenant_id,
        limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="PmSchedule", message="PM schedule not found")

    await delete_record(PM_TABLE, pm_id)

    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "pm", "*"))

    return {"message": "PM schedule deleted successfully"}


# ── Check & Auto-generate Work Orders for Due PMs ─────────────────────────


async def check_and_generate_due_pm_work_orders(tenant_id: str) -> int:
    """Check for overdue PM schedules and auto-generate work orders.

    This is designed to be called by a cron/scheduler.
    Returns the number of work orders generated.
    """
    now = utcnow().isoformat()

    result = await query_table(
        PM_TABLE,
        select="*",
        where={
            "status": "active",
            "nextDueDate": {"lte": now},
        },
        tenant_id=tenant_id,
        limit=100,
    )

    schedules = result.get("data", [])
    generated = 0

    for sched in schedules:
        try:
            wo_number = generate_work_order_number(tenant_id)
            await insert_record(WO_TABLE, {
                "tenantId": tenant_id,
                "workOrderNumber": wo_number,
                "title": f"PM: {sched.get('title', '')}",
                "description": sched.get("description") or "",
                "equipmentId": sched.get("equipmentId"),
                "source": "preventive",
                "type": "preventive",
                "status": "PENDING",
                "priority": "medium",
                "assignedToId": sched.get("assignedToId"),
                "checklistId": sched.get("checklistTemplateId"),
            })

            # Advance next due date
            freq = sched.get("frequency", "monthly")
            custom = sched.get("customDays")
            days = custom if custom and freq == "custom" else FREQUENCY_DAYS.get(freq, 30)
            next_due = utcnow() + timedelta(days=days)

            await update_record(PM_TABLE, sched["id"], {
                "lastExecuted": now,
                "nextDueDate": next_due.isoformat(),
            })

            generated += 1
        except Exception as exc:
            log.warning(f"Failed to auto-generate WO for PM {sched.get('id')}: {exc}")
            continue

    if generated > 0:
        redis = get_redis()
        await redis.invalidate_pattern(build_cache_key(tenant_id, "pm", "*"))
        await redis.invalidate_pattern(build_cache_key(tenant_id, "wo", "*"))

    return generated


# ── List Overdue/Upcoming Schedules ─────────────────────────────────────────


async def get_overdue_schedules(tenant_id: str, user: AuthUser) -> list[dict[str, Any]]:
    """Get PM schedules that are past due."""
    require_permission("pm", user.role)
    now = utcnow().isoformat()

    result = await query_table(
        PM_TABLE,
        select="*",
        where={
            "status": "active",
            "nextDueDate": {"lte": now},
        },
        order="nextDueDate.asc",
        tenant_id=tenant_id,
        limit=50,
    )
    return result.get("data", [])


async def get_upcoming_schedules(
    tenant_id: str, user: AuthUser, days: int = 30) -> list[dict[str, Any]]:
    """Get PM schedules due within the next N days."""
    require_permission("pm", user.role)
    now = utcnow()
    future = now + timedelta(days=days)

    result = await query_table(
        PM_TABLE,
        select="*",
        where={
            "status": "active",
            "nextDueDate": {"gte": now.isoformat()},
            "nextDueDate": {"lte": future.isoformat()},
        },
        order="nextDueDate.asc",
        tenant_id=tenant_id,
        limit=50,
    )
    return result.get("data", [])
