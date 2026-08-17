"""
Work Orders business logic.

MOHD.HMS ENTERPRISE

Implements:
  - RBAC-scoped listing (customer/technician/supervisor/admin)
  - WO number generation (WO/HMS/YYYY/NNNNNN format)
  - Create with optional complaint linkage
  - Get with RBAC check
  - Update with role-based field restrictions
  - Delete (admin only)
  - Customer feedback
  - Checklist templates listing
  - Next WO number generation (cached 120s)
  - Cache invalidation
  - Fire-and-forget notifications
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.integrations.redis import get_redis
from app.rbac.data_scope import NEVER_MATCH, build_data_scope
from app.utils.helpers import build_cache_key, utcnow

log = get_logger(__name__)

# ── Table name constants ─────────────────────────────────────────────────────

WO_TABLE = MODEL_TO_TABLE.get("workOrder", "WorkOrder")
WO_MATERIAL_TABLE = MODEL_TO_TABLE.get("workOrderMaterial", "WorkOrderMaterial")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")
EQUIPMENT_TABLE = MODEL_TO_TABLE.get("equipment", "Equipment")
COMPLAINT_TABLE = MODEL_TO_TABLE.get("complaint", "Complaint")
AUDIT_TABLE = MODEL_TO_TABLE.get("auditLog", "AuditLog")
NOTIFICATION_TABLE = MODEL_TO_TABLE.get("notification", "Notification")
CHECKLIST_TABLE = MODEL_TO_TABLE.get("checklistTemplate", "ChecklistTemplate")

# ── Priority/Type/Source mapping (frontend form → DB) ───────────────────────

PRIORITY_MAP: dict[str, str] = {
    "Emergency": "emergency",
    "High": "high",
    "Medium": "medium",
    "Low": "low",
}

TYPE_MAP: dict[str, str] = {
    "Corrective": "corrective",
    "Preventive": "preventive",
    "Emergency": "emergency",
    "Inspection": "inspection",
    "Installation": "installation",
    "Breakdown": "breakdown",
}

SOURCE_MAP: dict[str, str] = {
    "Complaint": "complaint",
    "Preventive Maintenance": "preventive",
    "Manual": "manual",
    "Quotation": "quotation",
    "Service Request": "service_request",
    "Inspection Report": "inspection_report",
}


# ── Helper: map value using lookup dict ─────────────────────────────────────


def _map(value: str | None, mapping: dict[str, str], default: str = "") -> str:
    if not value:
        return default
    return mapping.get(value, mapping.get(value.title(), value.lower())) or default


# ── Helper: resolve customer ID for customer role ───────────────────────────


async def _resolve_customer_id(user: AuthUser) -> str | None:
    """Look up the customer record linked to this user."""
    try:
        result = await query_table(
            CUSTOMER_TABLE,
            select="id",
            where={"userId": user.userId},
            tenant_id=user.tenantId,
            limit=1,
        )
        rows = result.get("data", [])
        return rows[0]["id"] if rows else None
    except Exception:
        return None


# ── Helper: resolve department technician IDs ───────────────────────────────


async def _resolve_dept_technician_ids(tenant_id: str, department_id: str | None) -> list[str]:
    """Get all technician user IDs in a department."""
    if not department_id:
        return []
    try:
        result = await query_table(
            USER_TABLE,
            select="id",
            where={
                "departmentId": department_id,
                "userRole": {"in": ["technician", "supervisor"]},
            },
            tenant_id=tenant_id,
            limit=200,
        )
        return [r["id"] for r in result.get("data", [])]
    except Exception:
        return []


# ── Helper: resolve user department ─────────────────────────────────────────


async def _get_user_department(user: AuthUser) -> str | None:
    try:
        result = await query_table(
            USER_TABLE,
            select="departmentId",
            where={"id": user.userId},
            tenant_id=user.tenantId,
            limit=1,
        )
        rows = result.get("data", [])
        return rows[0].get("departmentId") if rows else None
    except Exception:
        return None


# ── WO Number generation ────────────────────────────────────────────────────


def _wo_prefix() -> str:
    """Return current WO number prefix: WO/HMS/YYYY/"""
    year = datetime.now(timezone.utc).year
    return f"WO/HMS/{year}/"


async def _generate_wo_number(tenant_id: str) -> str:
    """Generate the next sequential work order number.

    Format: WO/HMS/YYYY/NNNNNN
    Queries the latest WO number for this tenant+year and increments.
    """
    prefix = _wo_prefix()

    # Try cache first
    redis = get_redis()
    cache_key = build_cache_key(tenant_id, "wo", "next_number", str(datetime.now(timezone.utc).year))
    cached = await redis.get(cache_key)
    if cached:
        try:
            return cached
        except Exception:
            pass

    try:
        result = await query_table(
            WO_TABLE,
            select="workOrderNumber",
            where={"workOrderNumber": {"startsWith": prefix}},
            order="workOrderNumber.desc",
            tenant_id=tenant_id,
            limit=1,
        )
        rows = result.get("data", [])
        next_num = 1
        if rows and rows[0].get("workOrderNumber"):
            parts = rows[0]["workOrderNumber"].split("/")
            num_str = parts[-1]
            parsed = int(num_str)
            if parsed:
                next_num = parsed + 1

        next_number = f"{prefix}{str(next_num).zfill(6)}"

        # Cache for 120 seconds
        await redis.set(cache_key, next_number, ex=120)

        return next_number
    except Exception:
        return f"{prefix}000001"


# ── Fire-and-forget notification helper ─────────────────────────────────────


async def _notify(user_id: str | None, tenant_id: str, wo_id: str, title: str, actor_id: str, wo_number: str, priority: str) -> None:
    """Send work order notification (fire-and-forget)."""
    if not user_id:
        return
    try:
        prio = "urgent" if priority == "emergency" else "high" if priority == "high" else "normal"
        await insert_record(NOTIFICATION_TABLE, {
            "tenantId": tenant_id,
            "userId": user_id,
            "type": "work_order_created",
            "title": "Work Order Created",
            "message": f'Work order \"{title}\" ({wo_number}) has been created.',
            "priority": prio,
            "category": "work_order",
            "relatedEntityType": "work_order",
            "relatedEntityId": wo_id,
            "actionLabel": "View Work Order",
            "createdBy": actor_id,
        })
    except Exception:
        pass


# ── List Work Orders ─────────────────────────────────────────────────────────


async def list_work_orders(
    tenant_id: str,
    user: AuthUser,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List work orders with RBAC scoping and pagination."""
    page = params.get("page", 1)
    page_size = min(params.get("pageSize", 20), 100)
    search = params.get("search", "")
    status = params.get("status", "")
    wo_type = params.get("type", "")
    offset = (page - 1) * page_size

    # HR/finance/vendor/guest get empty response
    if user.role in ("hr", "finance", "vendor", "guest"):
        return {"data": [], "total": 0, "page": page, "pageSize": page_size, "totalPages": 0}

    # Build base where from RBAC data scope
    customer_id = None
    if user.role == "customer":
        customer_id = await _resolve_customer_id(user)

    department_id = None
    dept_tech_ids = None
    if user.role in ("manager", "supervisor"):
        department_id = await _get_user_department(user)
        dept_tech_ids = await _resolve_dept_technician_ids(tenant_id, department_id)

    base_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="work_order",
        customer_id=customer_id,
        department_id=department_id,
        department_technician_ids=dept_tech_ids,
    )

    if base_scope is NEVER_MATCH:
        return {"data": [], "total": 0, "page": page, "pageSize": page_size, "totalPages": 0}

    where: dict[str, Any] = dict(base_scope)

    # Apply filters
    if search:
        search_or = [
            {"title": {"contains": search}},
            {"description": {"contains": search}},
            {"workOrderNumber": {"contains": search}},
        ]
        # If we already have an OR (from supervisor RBAC), nest under AND
        if "OR" in where and not isinstance(where.get("AND"), list):
            where["AND"] = [{"OR": where.pop("OR")}, {"OR": search_or}]
        else:
            where["OR"] = search_or

    if status:
        where["status"] = status
    if wo_type:
        where["type"] = wo_type

    select = "*"

    result = await query_table(
        WO_TABLE,
        select=select,
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=None,  # Already in where via data scope
    )

    rows = result.get("data", [])
    total_str = result.get("count", "0")
    try:
        total = int(total_str) if total_str not in ("*", None) else len(rows)
    except (ValueError, TypeError):
        total = len(rows)

    # For list, we include relations via a separate approach using PostgREST
    # Since we can't do Prisma-style includes in a single query, we do a second
    # pass for the user names. For efficiency, we batch-fetch unique user IDs.
    user_ids: set[str] = set()
    for r in rows:
        for field in ("assignedToId", "supervisorId", "createdBy"):
            if r.get(field):
                user_ids.add(r[field])

    user_map: dict[str, dict[str, str]] = {}
    if user_ids:
        try:
            u_result = await query_table(
                USER_TABLE,
                select="id,name,avatar",
                where={"id": {"in": list(user_ids)}},
                tenant_id=tenant_id,
                limit=len(user_ids),
            )
            for u in u_result.get("data", []):
                user_map[u["id"]] = {"name": u.get("name"), "avatar": u.get("avatar")}
        except Exception:
            pass

    # Collect unique equipment IDs
    equip_ids: set[str] = set()
    for r in rows:
        if r.get("equipmentId"):
            equip_ids.add(r["equipmentId"])

    equip_map: dict[str, dict[str, str]] = {}
    if equip_ids:
        try:
            e_result = await query_table(
                EQUIPMENT_TABLE,
                select="id,name,assetNumber,category",
                where={"id": {"in": list(equip_ids)}},
                tenant_id=tenant_id,
                limit=len(equip_ids),
            )
            for e in e_result.get("data", []):
                equip_map[e["id"]] = {"name": e.get("name"), "assetNumber": e.get("assetNumber"), "category": e.get("category")}
        except Exception:
            pass

    # Collect unique customer IDs
    cust_ids: set[str] = set()
    for r in rows:
        if r.get("customerId"):
            cust_ids.add(r["customerId"])

    cust_map: dict[str, dict[str, str]] = {}
    if cust_ids:
        try:
            c_result = await query_table(
                CUSTOMER_TABLE,
                select="id,name,companyName",
                where={"id": {"in": list(cust_ids)}},
                tenant_id=tenant_id,
                limit=len(cust_ids),
            )
            for c in c_result.get("data", []):
                cust_map[c["id"]] = {"name": c.get("companyName") or c.get("name")}
        except Exception:
            pass

    # Fetch materials for each work order
    wo_ids = [r["id"] for r in rows]
    materials_map: dict[str, list[dict[str, Any]]] = {}
    if wo_ids:
        try:
            m_result = await query_table(
                WO_MATERIAL_TABLE,
                select="id,workOrderId,inventoryItemId,quantity,unitCost,totalCost",
                where={"workOrderId": {"in": wo_ids}},
                tenant_id=tenant_id,
                limit=500,
            )
            for m in m_result.get("data", []):
                wo_id = m.get("workOrderId")
                if wo_id:
                    materials_map.setdefault(wo_id, []).append(m)
        except Exception:
            pass

    # Map rows to response shape
    data = []
    for r in rows:
        assigned = user_map.get(r.get("assignedToId"), {})
        supervisor = user_map.get(r.get("supervisorId"), {})
        creator = user_map.get(r.get("createdBy"), {})
        equip = equip_map.get(r.get("equipmentId"), {})
        cust = cust_map.get(r.get("customerId"), {})

        photos = r.get("photos")
        if isinstance(photos, str):
            try:
                photos = json.loads(photos)
            except Exception:
                photos = None

        checklist = r.get("checklistData")
        if isinstance(checklist, str):
            try:
                checklist = json.loads(checklist)
            except Exception:
                checklist = None

        attachments = r.get("attachments")
        if isinstance(attachments, str):
            try:
                attachments = json.loads(attachments)
            except Exception:
                attachments = None

        item: dict[str, Any] = {
            "id": r["id"],
            "tenantId": r["tenantId"],
            "workOrderNumber": r.get("workOrderNumber"),
            "complaintId": r.get("complaintId"),
            "customerId": r.get("customerId"),
            "customerName": cust.get("name"),
            "equipmentId": r.get("equipmentId"),
            "equipmentName": equip.get("name"),
            "equipmentAsset": equip.get("assetNumber"),
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "source": r.get("source"),
            "reference": r.get("reference"),
            "status": r.get("status", "PENDING"),
            "priority": r.get("priority", "medium"),
            "type": r.get("type"),
            "category": r.get("category"),
            "subCategory": r.get("subCategory"),
            "assignedToId": r.get("assignedToId"),
            "assignedToName": assigned.get("name"),
            "supervisorId": r.get("supervisorId"),
            "supervisorName": supervisor.get("name"),
            "createdBy": r.get("createdBy"),
            "creatorName": creator.get("name"),
            "scheduledDate": r.get("scheduledDate"),
            "startTime": r.get("startTime"),
            "dueDate": r.get("dueDate"),
            "dueTime": r.get("dueTime"),
            "building": r.get("building"),
            "floor": r.get("floor"),
            "siteId": r.get("siteId"),
            "estimatedHours": r.get("estimatedHours"),
            "startedAt": r.get("startedAt"),
            "completedAt": r.get("completedAt"),
            "laborHours": r.get("laborHours"),
            "laborCost": r.get("laborCost"),
            "materialCost": r.get("materialCost"),
            "totalCost": r.get("totalCost"),
            "notes": r.get("notes"),
            "internalNotes": r.get("internalNotes"),
            "photos": photos,
            "checklistData": checklist,
            "checklistId": r.get("checklistId"),
            "technicianSignature": r.get("technicianSignature"),
            "customerSignature": r.get("customerSignature"),
            "isDraft": r.get("isDraft", False),
            "permitRequired": r.get("permitRequired", False),
            "lockoutTagoutRequired": r.get("lockoutTagoutRequired", False),
            "highRiskWork": r.get("highRiskWork", False),
            "safetyEquipmentReq": r.get("safetyEquipmentReq", False),
            "safetyNotes": r.get("safetyNotes"),
            "attachments": attachments,
            "createdAt": r.get("createdAt"),
            "updatedAt": r.get("updatedAt"),
            "materials": materials_map.get(r["id"], []),
        }
        data.append(item)

    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size) if total > 0 else 0,
    }


# ── Create Work Order ───────────────────────────────────────────────────────


async def create_work_order(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new work order."""
    title = (data.get("title") or "").strip()
    if not title:
        raise ValidationException(message="Title is required")

    is_draft = data.get("isDraft", False)
    description = (data.get("description") or "").strip()
    if not is_draft and not description:
        raise ValidationException(message="Description is required for non-draft work orders")

    # Generate WO number
    wo_number = await _generate_wo_number(tenant_id)

    # Map priority/type/source to DB format
    mapped_priority = _map(data.get("priority"), PRIORITY_MAP, "medium")
    mapped_type = _map(data.get("workType") or data.get("type"), TYPE_MAP, "corrective")
    mapped_source = _map(data.get("source"), SOURCE_MAP, "manual")

    # Build attachments JSON
    attachments = data.get("attachments")
    attachments_json = json.dumps(attachments) if attachments and isinstance(attachments, list) and len(attachments) > 0 else None

    record: dict[str, Any] = {
        "tenantId": tenant_id,
        "workOrderNumber": wo_number,
        "complaintId": data.get("complaintId") or None,
        "customerId": data.get("customerId") or None,
        "equipmentId": data.get("equipmentId") or None,
        "title": title,
        "description": description,
        "source": mapped_source,
        "reference": data.get("reference") or None,
        "status": "DRAFT" if is_draft else "PENDING",
        "priority": mapped_priority,
        "type": mapped_type,
        "category": data.get("category") or None,
        "subCategory": data.get("subCategory") or None,
        "estimatedHours": data.get("estimatedHours") if data.get("estimatedHours") is not None else None,
        "assignedToId": data.get("assignedToId") or None,
        "supervisorId": data.get("supervisorId") or None,
        "createdBy": user.userId,
        "scheduledDate": data.get("scheduledDate") or None,
        "startTime": data.get("startTime") or None,
        "dueDate": data.get("dueDate") or None,
        "dueTime": data.get("dueTime") or None,
        "siteId": data.get("siteId") or None,
        "building": data.get("building") or None,
        "floor": data.get("floor") or None,
        "internalNotes": data.get("internalNotes") or None,
        "checklistId": data.get("checklistId") or None,
        "notes": data.get("notes") or None,
        "isDraft": is_draft,
        "permitRequired": data.get("permitRequired", False),
        "lockoutTagoutRequired": data.get("lockoutTagout") or data.get("lockoutTagoutRequired", False),
        "highRiskWork": data.get("highRiskWork", False),
        "safetyEquipmentReq": data.get("safetyEquipment") or data.get("safetyEquipmentReq", False),
        "safetyNotes": data.get("safetyNotes") or None,
        "attachments": attachments_json,
    }

    wo = await insert_record(WO_TABLE, record)

    # Fire-and-forget notifications
    if not is_draft:
        assigned_to = data.get("assignedToId")
        supervisor_id = data.get("supervisorId")
        _notify(assigned_to, tenant_id, wo["id"], title, user.userId, wo_number, mapped_priority)
        if supervisor_id and supervisor_id != assigned_to and supervisor_id != user.userId:
            _notify(supervisor_id, tenant_id, wo["id"], title, user.userId, wo_number, mapped_priority)

        # Audit log (fire-and-forget)
        try:
            await insert_record(AUDIT_TABLE, {
                "tenantId": tenant_id,
                "userId": user.userId,
                "action": "work_order_created",
                "entity": "WorkOrder",
                "entityId": wo["id"],
                "newValue": json.dumps({"workOrderNumber": wo_number, "title": title}),
            })
        except Exception:
            pass

    # Invalidate cache
    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "wo", "*"))
    await redis.invalidate_pattern(build_cache_key(tenant_id, "dashboard", "*"))

    return _map_wo_response(wo)


# ── Get Work Order ───────────────────────────────────────────────────────────


async def get_work_order(
    wo_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get a single work order by ID with RBAC check."""
    # Customers cannot access work orders
    if user.role == "customer":
        raise ForbiddenException(message="Customers cannot access work orders")

    # Technicians only see their own
    where: dict[str, Any] = {"id": wo_id}
    if user.role == "technician":
        where["assignedToId"] = user.userId
    elif user.role == "supervisor":
        where["supervisorId"] = user.userId

    result = await query_table(
        WO_TABLE,
        select="*",
        where=where,
        tenant_id=tenant_id,
        limit=1,
    )

    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="WorkOrder", message="Work order not found")

    wo = rows[0]
    return _map_wo_detail_response(wo, tenant_id)


# ── Update Work Order ───────────────────────────────────────────────────────


async def update_work_order(
    wo_id: str,
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update a work order with role-based field restrictions."""
    # Customers and HR cannot modify work orders
    if user.role in ("customer", "hr", "guest", "vendor"):
        raise ForbiddenException(message="Insufficient permissions to update work orders")

    # Verify existence
    result = await query_table(
        WO_TABLE,
        select="id,status",
        where={"id": wo_id},
        tenant_id=tenant_id,
        limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="WorkOrder", message="Work order not found")

    update_data: dict[str, Any] = {}

    # Technicians can update specific fields
    if user.role == "technician":
        allowed_fields = (
            "status", "notes", "photos", "checklistData", "technicianSignature",
            "laborHours", "laborCost", "materialCost", "totalCost",
            "checkInGps", "checkOutGps", "scheduledDate", "startTime",
            "dueDate", "dueTime", "building", "floor",
        )
        for field in allowed_fields:
            if field in data and data[field] is not None:
                val = data[field]
                if field in ("photos", "checklistData", "checkInGps", "checkOutGps"):
                    val = json.dumps(val) if val else None
                update_data[field] = val

        # Auto-set timestamps on status change
        if data.get("status") == "IN_PROGRESS":
            update_data["startedAt"] = utcnow().isoformat()
        if data.get("status") == "COMPLETED":
            update_data["completedAt"] = utcnow().isoformat()
    else:
        # Admin/manager/supervisor can update all fields
        for field in (
            "title", "description", "priority", "type", "assignedToId",
            "equipmentId", "supervisorId", "scheduledDate", "startTime",
            "dueDate", "dueTime", "building", "floor", "siteId",
            "estimatedHours", "notes", "internalNotes", "category",
            "subCategory", "checklistId", "technicianSignature",
            "customerSignature", "laborHours", "laborCost", "materialCost",
            "totalCost", "status",
        ):
            if field in data and data[field] is not None:
                update_data[field] = data[field]

        # Handle JSON fields
        for json_field in ("photos", "checklistData", "checkInGps", "checkOutGps"):
            if json_field in data:
                val = data[json_field]
                update_data[json_field] = json.dumps(val) if val else None

        # Auto-set timestamps
        if data.get("status") == "IN_PROGRESS":
            update_data["startedAt"] = utcnow().isoformat()
        if data.get("status") == "COMPLETED":
            update_data["completedAt"] = utcnow().isoformat()

    if not update_data:
        raise ValidationException(message="No fields to update")

    updated = await update_record(WO_TABLE, wo_id, update_data)

    # Invalidate cache
    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "wo", "*"))
    await redis.invalidate_pattern(build_cache_key(tenant_id, "dashboard", "*"))

    return _map_wo_detail_response(updated, tenant_id)


# ── Delete Work Order ───────────────────────────────────────────────────────


async def delete_work_order(
    wo_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, str]:
    """Delete a work order (admin/super_admin only)."""
    if user.role not in ("super_admin", "admin"):
        raise ForbiddenException(message="Insufficient permissions to delete work orders")

    # Verify existence
    result = await query_table(
        WO_TABLE,
        select="id",
        where={"id": wo_id},
        tenant_id=tenant_id,
        limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="WorkOrder", message="Work order not found")

    await delete_record(WO_TABLE, wo_id)

    # Invalidate cache
    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "wo", "*"))
    await redis.invalidate_pattern(build_cache_key(tenant_id, "dashboard", "*"))

    return {"message": "Work order deleted successfully"}


# ── Submit Feedback ──────────────────────────────────────────────────────────


async def submit_feedback(
    wo_id: str,
    tenant_id: str,
    user: AuthUser,
    rating: int,
    comment: str | None,
) -> dict[str, Any]:
    """Submit customer feedback on a work order."""
    if rating < 1 or rating > 5:
        raise ValidationException(message="Rating must be between 1 and 5")

    # Find the work order
    result = await query_table(
        WO_TABLE,
        select="id,complaintId",
        where={"id": wo_id},
        tenant_id=tenant_id,
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="WorkOrder", message="Work order not found")

    wo = rows[0]

    # If linked to a complaint, update the complaint's feedback
    if wo.get("complaintId"):
        try:
            await update_record(COMPLAINT_TABLE, wo["complaintId"], {
                "customerRating": rating,
                "customerFeedback": comment or None,
            })
        except Exception:
            pass  # Don't block if complaint update fails

    return {
        "success": True,
        "message": "Feedback submitted successfully",
        "workOrderId": wo_id,
        "rating": rating,
    }


# ── Get Checklists ───────────────────────────────────────────────────────────


async def get_checklists(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """List checklist templates for the tenant."""
    result = await query_table(
        CHECKLIST_TABLE,
        select="id,name,category,description",
        where={},
        order="name.asc",
        tenant_id=tenant_id,
        limit=100,
    )
    return {"data": result.get("data", [])}


# ── Get Next Number ─────────────────────────────────────────────────────────


async def get_next_number(tenant_id: str, user: AuthUser) -> dict[str, str]:
    """Get the next work order number (cached 120s)."""
    next_number = await _generate_wo_number(tenant_id)
    return {"nextNumber": next_number}


# ── Response mapping helpers ────────────────────────────────────────────────


def _map_wo_response(wo: dict[str, Any]) -> dict[str, Any]:
    """Map a work order record to list response shape."""
    return {
        "id": wo["id"],
        "tenantId": wo["tenantId"],
        "workOrderNumber": wo.get("workOrderNumber"),
        "complaintId": wo.get("complaintId"),
        "customerId": wo.get("customerId"),
        "equipmentId": wo.get("equipmentId"),
        "title": wo.get("title", ""),
        "description": wo.get("description", ""),
        "source": wo.get("source"),
        "reference": wo.get("reference"),
        "status": wo.get("status", "PENDING"),
        "priority": wo.get("priority", "medium"),
        "type": wo.get("type"),
        "category": wo.get("category"),
        "subCategory": wo.get("subCategory"),
        "assignedToId": wo.get("assignedToId"),
        "supervisorId": wo.get("supervisorId"),
        "createdBy": wo.get("createdBy"),
        "scheduledDate": wo.get("scheduledDate"),
        "startTime": wo.get("startTime"),
        "dueDate": wo.get("dueDate"),
        "dueTime": wo.get("dueTime"),
        "building": wo.get("building"),
        "floor": wo.get("floor"),
        "siteId": wo.get("siteId"),
        "estimatedHours": wo.get("estimatedHours"),
        "isDraft": wo.get("isDraft", False),
        "createdAt": wo.get("createdAt"),
        "updatedAt": wo.get("updatedAt"),
    }


def _map_wo_detail_response(wo: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    """Map a work order record to detail response shape."""
    photos = wo.get("photos")
    if isinstance(photos, str):
        try:
            photos = json.loads(photos)
        except Exception:
            photos = None

    checklist = wo.get("checklistData")
    if isinstance(checklist, str):
        try:
            checklist = json.loads(checklist)
        except Exception:
            checklist = None

    check_in = wo.get("checkInGps")
    if isinstance(check_in, str):
        try:
            check_in = json.loads(check_in)
        except Exception:
            check_in = None

    check_out = wo.get("checkOutGps")
    if isinstance(check_out, str):
        try:
            check_out = json.loads(check_out)
        except Exception:
            check_out = None

    return {
        "id": wo["id"],
        "tenantId": wo["tenantId"],
        "complaintId": wo.get("complaintId"),
        "equipmentId": wo.get("equipmentId"),
        "title": wo.get("title", ""),
        "description": wo.get("description", ""),
        "status": wo.get("status", "PENDING"),
        "priority": wo.get("priority", "medium"),
        "type": wo.get("type"),
        "assignedToId": wo.get("assignedToId"),
        "createdBy": wo.get("createdBy"),
        "scheduledDate": wo.get("scheduledDate"),
        "startedAt": wo.get("startedAt"),
        "completedAt": wo.get("completedAt"),
        "laborHours": wo.get("laborHours"),
        "laborCost": wo.get("laborCost"),
        "materialCost": wo.get("materialCost"),
        "totalCost": wo.get("totalCost"),
        "notes": wo.get("notes"),
        "photos": photos,
        "checklistData": checklist,
        "technicianSignature": wo.get("technicianSignature"),
        "customerSignature": wo.get("customerSignature"),
        "checkInGps": check_in,
        "checkOutGps": check_out,
        "createdAt": wo.get("createdAt"),
        "updatedAt": wo.get("updatedAt"),
    }
