"""
Complaint business logic — the most complex feature module.

MOHD.HMS ENTERPRISE

Implements:
  - Full complaint lifecycle state machine (13 statuses)
  - RBAC data-scope filtering
  - Assignment with SLA tracking
  - Accept/reject with automatic work order creation
  - Workflow transitions with timeline logging
  - Escalation rules and checks
  - Customer profile auto-creation
  - Cache invalidation
  - Firebase push notifications (fire-and-forget)
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
    MODEL_TO_TABLE,
)
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.rbac.data_scope import NEVER_MATCH, build_data_scope
from app.rbac.permissions import has_action_permission, require_permission
from app.utils.helpers import generate_complaint_number, generate_work_order_number, utcnow

log = get_logger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

#: The Complaint table name in Supabase
COMPLAINT_TABLE = MODEL_TO_TABLE.get("complaint", "Complaint")
TIMELINE_TABLE = MODEL_TO_TABLE.get("complaintTimeline", "ComplaintTimeline")
WORK_ORDER_TABLE = MODEL_TO_TABLE.get("workOrder", "WorkOrder")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")
EQUIPMENT_TABLE = MODEL_TO_TABLE.get("equipment", "Equipment")
INVOICE_TABLE = MODEL_TO_TABLE.get("invoice", "Invoice")
AUDIT_TABLE = MODEL_TO_TABLE.get("auditLog", "AuditLog")
NOTIFICATION_TABLE = MODEL_TO_TABLE.get("notification", "Notification")

MAX_ACTIVE_JOBS = 5
SLA_RESPONSE_MINUTES = 15

TECH_ROLES = {"technician", "supervisor"}
ASSIGNMENT_ROLES = {"super_admin", "admin", "supervisor", "manager"}

# ── Action → Status mapping (mirrors frontend workflow/route.ts) ─────────────

ACTION_STATUS_MAP: dict[str, str] = {
    "assign": "ASSIGNED",
    "accept": "ACCEPTED",
    "reject": "NEW",
    "start": "IN_PROGRESS",
    "complete": "WAITING_CLIENT_CONFIRMATION",
    "pause": "PAUSED",
    "resume": "IN_PROGRESS",
    "client_confirm": "CLIENT_CONFIRMED",
    "client_reject": "REWORK_REQUIRED",
    "rework": "IN_PROGRESS",
    "approve_invoice": "INVOICE_APPROVED",
    "send_invoice": "INVOICE_SENT",
    "record_payment": "PAID",
    "close": "CLOSED",
}

# ── All valid complaint statuses (matches frontend state-machine.ts) ──────────

ALL_STATUSES: set[str] = {
    "NEW",
    "ASSIGNED",
    "ACCEPTED",
    "WORK_ORDER_CREATED",
    "IN_PROGRESS",
    "WAITING_CLIENT_CONFIRMATION",
    "CLIENT_CONFIRMED",
    "DRAFT_INVOICE",
    "INVOICE_APPROVED",
    "INVOICE_SENT",
    "PAID",
    "CLOSED",
    "REWORK_REQUIRED",
    "PAUSED",
}

# ── Workflow transition rules (mirrors frontend state-machine.ts) ──────────────
# Each entry: (from_status, to_status, allowed_roles, is_automatic, action_name)

WORKFLOW_TRANSITIONS: list[dict[str, Any]] = [
    {"from": "NEW", "to": "ASSIGNED", "roles": {"super_admin", "admin", "manager", "supervisor"}, "auto": False, "action": "assigned"},
    {"from": "ASSIGNED", "to": "ASSIGNED", "roles": {"super_admin", "admin", "supervisor"}, "auto": False, "action": "reassigned"},
    {"from": "ASSIGNED", "to": "ACCEPTED", "roles": {"technician"}, "auto": False, "action": "accepted"},
    {"from": "ASSIGNED", "to": "NEW", "roles": {"technician"}, "auto": False, "action": "assignment_rejected"},
    {"from": "ACCEPTED", "to": "WORK_ORDER_CREATED", "roles": set(), "auto": True, "action": "work_order_created"},
    {"from": "WORK_ORDER_CREATED", "to": "IN_PROGRESS", "roles": {"technician"}, "auto": False, "action": "work_started"},
    {"from": "IN_PROGRESS", "to": "PAUSED", "roles": {"technician"}, "auto": False, "action": "work_paused"},
    {"from": "PAUSED", "to": "IN_PROGRESS", "roles": {"technician"}, "auto": False, "action": "work_resumed"},
    {"from": "IN_PROGRESS", "to": "WAITING_CLIENT_CONFIRMATION", "roles": {"technician"}, "auto": False, "action": "work_completed"},
    {"from": "WAITING_CLIENT_CONFIRMATION", "to": "CLIENT_CONFIRMED", "roles": {"customer"}, "auto": False, "action": "client_confirmed"},
    {"from": "WAITING_CLIENT_CONFIRMATION", "to": "REWORK_REQUIRED", "roles": {"customer"}, "auto": False, "action": "rework_requested"},
    {"from": "REWORK_REQUIRED", "to": "IN_PROGRESS", "roles": {"technician"}, "auto": False, "action": "rework_started"},
    {"from": "CLIENT_CONFIRMED", "to": "DRAFT_INVOICE", "roles": set(), "auto": True, "action": "draft_invoice_created"},
    {"from": "DRAFT_INVOICE", "to": "INVOICE_APPROVED", "roles": {"finance", "admin", "super_admin"}, "auto": False, "action": "invoice_approved"},
    {"from": "INVOICE_APPROVED", "to": "INVOICE_SENT", "roles": {"finance", "admin", "super_admin"}, "auto": False, "action": "invoice_sent"},
    {"from": "INVOICE_SENT", "to": "PAID", "roles": {"finance", "admin", "super_admin"}, "auto": False, "action": "invoice_paid"},
    {"from": "PAID", "to": "CLOSED", "roles": {"admin", "super_admin"}, "auto": True, "action": "complaint_closed"},
]

# ── Escalation rules (mirrors frontend escalation-rules.ts) ───────────────────

ESCALATION_RULES: list[dict[str, Any]] = [
    {"status": "NEW", "thresholdMs": 4 * 3600 * 1000, "severity": "medium", "label": "New Complaint Not Assigned", "description": "New complaint not assigned within 4 hours", "notifyRoles": ["super_admin", "admin", "manager"], "notifyCustomer": False, "notifySupervisor": True},
    {"status": "ASSIGNED", "thresholdMs": 15 * 60 * 1000, "severity": "high", "label": "Assignment Not Accepted", "description": "Technician has not accepted within 15 minutes", "notifyRoles": ["super_admin", "admin", "supervisor"], "notifyCustomer": False, "notifySupervisor": True},
    {"status": "ACCEPTED", "thresholdMs": 2 * 3600 * 1000, "severity": "medium", "label": "Work Not Started", "description": "Accepted complaint not started within 2 hours", "notifyRoles": ["super_admin", "admin", "supervisor"], "notifyCustomer": False, "notifySupervisor": True},
    {"status": "IN_PROGRESS", "thresholdMs": 8 * 3600 * 1000, "severity": "high", "label": "Work Taking Too Long", "description": "In-progress complaint exceeding 8 hours", "notifyRoles": ["super_admin", "admin", "manager", "supervisor"], "notifyCustomer": True, "notifySupervisor": True},
    {"status": "WAITING_CLIENT_CONFIRMATION", "thresholdMs": 72 * 3600 * 1000, "severity": "low", "label": "Awaiting Client Confirmation", "description": "Client has not confirmed within 72 hours", "notifyRoles": ["super_admin", "admin", "manager"], "notifyCustomer": True, "notifySupervisor": False},
    {"status": "REWORK_REQUIRED", "thresholdMs": 4 * 3600 * 1000, "severity": "medium", "label": "Rework Not Started", "description": "Rework not started within 4 hours", "notifyRoles": ["super_admin", "admin", "supervisor"], "notifyCustomer": False, "notifySupervisor": True},
]


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════


async def _safe_query(fn, fallback, label: str):
    """Resilient query wrapper for non-critical enrichment queries."""
    try:
        return await fn()
    except Exception as exc:
        log.warning(f"[Complaints] {label}: {exc}")
        return fallback


def _format_threshold(ms: int) -> str:
    total_minutes = ms // 60000
    days = total_minutes // 1440
    hours = (total_minutes % 1440) // 60
    minutes = total_minutes % 60
    if days > 0:
        return f"{days} day{'s' if days > 1 else ''}"
    if hours > 0:
        return f"{hours} hour{'s' if hours > 1 else ''}"
    return f"{minutes} minute{'s' if minutes != 1 else ''}"


def _iso(dt_str: str | None) -> str | None:
    """Return an ISO string or None."""
    if not dt_str:
        return None
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00")) if isinstance(dt_str, str) else dt_str
        return dt.isoformat()
    except (ValueError, TypeError):
        return dt_str


def _now_iso() -> str:
    return utcnow().isoformat()


def _build_select_for_list() -> str:
    return "id,tenantId,customerId,equipmentId,title,description,priority,status,category,photos,assignedToId,supervisorId,resolutionNotes,customerRating,customerFeedback,assignedAt,assignmentStatus,complaintNumber,createdAt,updatedAt"


def _resolve_customer_name(complaint: dict, customer_map: dict) -> str | None:
    """Resolve customer name from complaint data."""
    if complaint.get("customerName"):
        return complaint["customerName"]
    if complaint.get("customerId") and customer_map:
        return customer_map.get(complaint["customerId"])
    if complaint.get("customerSnapshot"):
        try:
            snap = json.loads(complaint["customerSnapshot"]) if isinstance(complaint["customerSnapshot"], str) else complaint["customerSnapshot"]
            return snap.get("name")
        except (json.JSONDecodeError, TypeError):
            pass
    return None


# ══════════════════════════════════════════════════════════════════════════════
# WORKFLOW VALIDATION
# ══════════════════════════════════════════════════════════════════════════════


def validate_transition(
    current_status: str,
    target_status: str,
    user_role: str,
    is_admin_override: bool = False,
) -> dict[str, Any]:
    """Validate a complaint status transition.

    Returns {"success": bool, "error": str|None, "action": str, "isAutomatic": bool}
    """
    if current_status not in ALL_STATUSES:
        return {"success": False, "error": f"Unknown current status: {current_status}", "action": "", "isAutomatic": False}
    if target_status not in ALL_STATUSES:
        return {"success": False, "error": f"Unknown target status: {target_status}", "action": "", "isAutomatic": False}

    # Same-status guard (allow reassignment: ASSIGNED → ASSIGNED)
    if current_status == target_status and not (current_status == "ASSIGNED" and target_status == "ASSIGNED"):
        return {"success": False, "error": f"Already in status {current_status}", "action": "", "isAutomatic": False}

    # Terminal status guard
    if current_status == "CLOSED":
        return {"success": False, "error": "Cannot transition from CLOSED. Use admin override.", "action": "", "isAutomatic": False}

    # Admin override
    if is_admin_override:
        if user_role not in ("super_admin", "admin"):
            return {"success": False, "error": "Only super_admin/admin can override status", "action": "status_override", "isAutomatic": False}
        return {"success": True, "error": None, "action": "status_override", "isAutomatic": False}

    # Find matching rule
    for rule in WORKFLOW_TRANSITIONS:
        if rule["from"] == current_status and rule["to"] == target_status:
            if rule["auto"]:
                return {"success": False, "error": f"Transition {current_status}→{target_status} is automatic", "action": rule["action"], "isAutomatic": True}
            if user_role not in rule["roles"]:
                return {"success": False, "error": f"Role {user_role} not authorized for {rule['action']}", "action": rule["action"], "isAutomatic": False}
            return {"success": True, "error": None, "action": rule["action"], "isAutomatic": False}

    # No matching rule
    valid = [r["to"] for r in WORKFLOW_TRANSITIONS if r["from"] == current_status]
    hint = f" Valid from {current_status}: {valid}" if valid else f" No transitions from {current_status}"
    return {"success": False, "error": f"Transition {current_status}→{target_status} not defined.{hint}", "action": "", "isAutomatic": False}


def get_available_actions(current_status: str, user_role: str) -> list[dict[str, Any]]:
    """Get all actions available to a user role for a given status."""
    actions = []
    for rule in WORKFLOW_TRANSITIONS:
        if rule["from"] != current_status:
            continue
        if rule["auto"]:
            actions.append({"action": rule["action"], "targetStatus": rule["to"], "isAutomatic": True})
            continue
        if user_role in rule["roles"]:
            actions.append({"action": rule["action"], "targetStatus": rule["to"], "isAutomatic": False})
    # Admin override
    if user_role in ("super_admin", "admin"):
        actions.append({"action": "status_override", "targetStatus": "NEW", "isAutomatic": False})
    return actions


# ══════════════════════════════════════════════════════════════════════════════
# TIMELINE
# ══════════════════════════════════════════════════════════════════════════════


async def _create_timeline(
    tenant_id: str,
    complaint_id: str,
    action: str,
    from_status: str,
    to_status: str,
    performed_by: str,
    performed_by_role: str,
    description: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Create a ComplaintTimeline entry (fire-and-forget)."""
    try:
        record = {
            "id": str(uuid.uuid4()),
            "tenantId": tenant_id,
            "complaintId": complaint_id,
            "action": action,
            "fromStatus": from_status,
            "toStatus": to_status,
            "description": description,
            "performedBy": performed_by,
            "performedByRole": performed_by_role,
            "metadata": json.dumps(metadata or {}),
            "createdAt": _now_iso(),
        }
        await insert_record(TIMELINE_TABLE, record)
    except Exception as exc:
        log.warning(f"Failed to create timeline entry: {exc}")


async def get_timeline(tenant_id: str, complaint_id: str) -> list[dict[str, Any]]:
    """Get all timeline entries for a complaint."""
    result = await query_table(
        TIMELINE_TABLE,
        where={"complaintId": complaint_id},
        order="createdAt.desc",
    )
    entries = []
    for entry in result.get("data", []):
        meta = entry.get("metadata")
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except json.JSONDecodeError:
                meta = {}
        entries.append({
            "id": entry["id"],
            "complaintId": entry.get("complaintId"),
            "action": entry.get("action"),
            "fromStatus": entry.get("fromStatus"),
            "toStatus": entry.get("toStatus"),
            "description": entry.get("description"),
            "performedBy": entry.get("performedBy"),
            "performedByRole": entry.get("performedByRole"),
            "metadata": meta,
            "createdAt": _iso(entry.get("createdAt")),
        })
    return entries


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION HELPER (fire-and-forget)
# ══════════════════════════════════════════════════════════════════════════════


async def _send_notification(
    tenant_id: str,
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    entity_type: str = "complaint",
    entity_id: str | None = None,
) -> None:
    """Create an in-app notification record (fire-and-forget)."""
    try:
        record = {
            "id": str(uuid.uuid4()),
            "tenantId": tenant_id,
            "userId": user_id,
            "title": title,
            "message": message,
            "channel": "in_app",
            "type": notification_type,
            "isRead": False,
            "entityType": entity_type,
            "entityId": entity_id,
            "createdAt": _now_iso(),
        }
        await insert_record(NOTIFICATION_TABLE, record)
    except Exception as exc:
        log.warning(f"Failed to create notification: {exc}")


async def _send_firebase(
    user_id: str,
    title: str,
    message: str,
    tenant_id: str,
    entity_type: str = "complaint",
    entity_id: str | None = None,
) -> None:
    """Send Firebase push notification (fire-and-forget)."""
    try:
        from app.integrations.firebase import get_firebase
        fb = get_firebase()
        await fb.send_notification(
            user_id=user_id,
            title=title,
            message=message,
            data={"entityType": entity_type, "entityId": entity_id} if entity_id else None,
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    except Exception as exc:
        log.warning(f"Firebase notification failed: {exc}")


# ══════════════════════════════════════════════════════════════════════════════
# CACHE INVALIDATION (fire-and-forget)
# ══════════════════════════════════════════════════════════════════════════════


async def _invalidate_complaint_cache(tenant_id: str) -> None:
    """Invalidate complaint-related cache keys."""
    try:
        from app.integrations.redis import get_redis
        redis = get_redis()
        await redis.invalidate_pattern(f"hms:{tenant_id}:complaints:*")
        await redis.invalidate_pattern(f"hms:{tenant_id}:dashboard:*")
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════════════════════
# MAIN SERVICE FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════


async def list_complaints(
    tenant_id: str,
    user: AuthUser,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List complaints with RBAC filtering, search, and pagination."""
    # Resolve customer_id for customer role
    customer_id = None
    if user.role == "customer":
        cust_result = await query_table(
            CUSTOMER_TABLE,
            select="id",
            where={"tenantId": tenant_id, "OR": [
                *([{'email': user.email}] if user.email else []),
            ]},
            limit=1,
        )
        cust_rows = cust_result.get("data", [])
        if cust_rows:
            customer_id = cust_rows[0]["id"]

    data_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="complaint",
        customer_id=customer_id,
    )

    if data_scope is NEVER_MATCH:
        return {"data": [], "total": 0, "page": params.get("page", 1), "pageSize": params.get("pageSize", 20), "totalPages": 0, "accessLevel": "none"}

    # Determine access level
    access_level = "all" if user.role in ("super_admin", "admin", "finance") else "scoped"

    where: dict[str, Any] = {}
    if data_scope.get("OR"):
        where["OR"] = data_scope["OR"]
    else:
        where.update({k: v for k, v in data_scope.items() if k != "OR"})

    # Apply filters
    if params.get("status"):
        where["status"] = params["status"]
    if params.get("priority"):
        where["priority"] = params["priority"]
    if params.get("category"):
        where["category"] = params["category"]
    if params.get("assignedToId"):
        where["assignedToId"] = params["assignedToId"]
    if params.get("customerId"):
        where["customerId"] = params["customerId"]
    if params.get("search"):
        search = params["search"]
        search_or = [
            {"title": {"contains": search}},
            {"description": {"contains": search}},
            {"complaintNumber": {"contains": search}},
        ]
        if "OR" in where:
            where["AND"] = [{"OR": search_or}, {"OR": where["OR"]}]
            del where["OR"]
        else:
            where["OR"] = search_or

    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    offset = (page - 1) * page_size

    sort_col = params.get("sortBy", "createdAt")
    sort_dir = params.get("sortOrder", "desc")
    order = f"{sort_col}.{sort_dir}"

    result = await query_table(
        COMPLAINT_TABLE,
        select=_build_select_for_list(),
        where=where,
        order=order,
        limit=page_size,
        offset=offset,
        count="exact",
    )

    items = result.get("data", [])
    total_str = result.get("count", "0")
    try:
        total = int(total_str) if total_str not in ("*", None) else len(items)
    except (ValueError, TypeError):
        total = len(items)

    # Resolve customer/equipment names in batch
    missing_cids = list({c["customerId"] for c in items if c.get("customerId") and not c.get("customerName")})
    missing_eids = list({c["equipmentId"] for c in items if c.get("equipmentId") and not c.get("equipmentName")})

    customer_map: dict[str, str] = {}
    equipment_map: dict[str, str] = {}

    if missing_cids:
        cust_res = await _safe_query(
            lambda: query_table(CUSTOMER_TABLE, select="id,name", where={"id": {"in": missing_cids}}),
            {"data": []},
            "customer name batch",
        )
        for row in cust_res.get("data", []):
            customer_map[row["id"]] = row["name"]

    if missing_eids:
        eq_res = await _safe_query(
            lambda: query_table(EQUIPMENT_TABLE, select="id,name", where={"id": {"in": missing_eids}}),
            {"data": []},
            "equipment name batch",
        )
        for row in eq_res.get("data", []):
            equipment_map[row["id"]] = row["name"]

    # Resolve assigned/supervisor user names
    user_ids = list({
        uid for c in items
        for uid in (c.get("assignedToId"), c.get("supervisorId"))
        if uid
    })
    user_name_map: dict[str, str] = {}
    if user_ids:
        user_res = await _safe_query(
            lambda: query_table(USER_TABLE, select="id,name", where={"id": {"in": user_ids}}),
            {"data": []},
            "user name batch",
        )
        for row in user_res.get("data", []):
            user_name_map[row["id"]] = row["name"]

    data = []
    for c in items:
        cname = _resolve_customer_name(c, customer_map)
        ename = equipment_map.get(c["equipmentId"]) if c.get("equipmentId") else None
        data.append({
            "id": c["id"],
            "tenantId": c["tenantId"],
            "customerId": c.get("customerId"),
            "customerName": cname,
            "equipmentId": c.get("equipmentId"),
            "equipmentName": ename,
            "title": c["title"],
            "description": c["description"],
            "priority": c["priority"],
            "status": c["status"],
            "category": c.get("category"),
            "photos": c.get("photos"),
            "assignedToId": c.get("assignedToId"),
            "assignedToName": user_name_map.get(c.get("assignedToId")),
            "supervisorId": c.get("supervisorId"),
            "supervisorName": user_name_map.get(c.get("supervisorId")),
            "resolutionNotes": c.get("resolutionNotes"),
            "customerRating": c.get("customerRating"),
            "customerFeedback": c.get("customerFeedback"),
            "complaintNumber": c.get("complaintNumber"),
            "resolvedAt": _iso(c.get("resolvedAt")),
            "closedAt": _iso(c.get("closedAt")),
            "createdAt": _iso(c.get("createdAt")),
            "updatedAt": _iso(c.get("updatedAt")),
        })

    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
        "accessLevel": access_level,
    }


async def create_complaint(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new complaint."""
    require_permission("complaint.create", user.role)

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    customer_id = data.get("customerId")

    if not title:
        raise ValidationException(message="Title is required")
    if not description:
        raise ValidationException(message="Description is required")
    if not customer_id:
        raise ValidationException(message="Customer is required")

    # Customer can only create for themselves
    if user.role == "customer":
        cust_result = await query_table(
            CUSTOMER_TABLE,
            select="id",
            where={"tenantId": tenant_id, "id": customer_id},
            limit=1,
        )
        if not cust_result.get("data"):
            raise ForbiddenException(message="You can only create complaints for your own account")

    # Technician cannot pre-assign to others
    assigned_to = None
    supervisor = None
    if user.role == "technician":
        assigned_to = data.get("assignedToId")
        if assigned_to and assigned_to != user.userId:
            raise ForbiddenException(message="Technicians cannot assign complaints to others")
    elif user.role != "customer":
        assigned_to = data.get("assignedToId") or None
        supervisor = data.get("supervisorId") or None

    # Generate complaint number
    year = datetime.now(timezone.utc).year
    year_start = datetime(year, 1, 1, tzinfo=timezone.utc)
    year_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    count = await count_records(
        COMPLAINT_TABLE,
        where={"tenantId": tenant_id, "createdAt": {"gte": year_start.isoformat(), "lt": year_end.isoformat()}},
    )
    complaint_number = f"CMP/{year}/{str(count + 1).zfill(6)}"

    # Customer snapshot
    customer_snapshot = data.get("customerSnapshot")
    if not customer_snapshot and customer_id:
        cust = await _safe_query(
            lambda: query_table(CUSTOMER_TABLE, select="id,name,email,phone", where={"id": customer_id}, limit=1),
            {"data": []},
            "customer snapshot",
        )
        cust_rows = cust.get("data", [])
        if cust_rows:
            customer_snapshot = json.dumps({
                "name": cust_rows[0].get("name"),
                "email": cust_rows[0].get("email"),
                "phone": cust_rows[0].get("phone"),
            })

    photos = data.get("photos")
    gps = data.get("gpsLocation")
    loc_info = data.get("locationInfo")

    record: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "customerId": customer_id,
        "equipmentId": data.get("equipmentId") or None,
        "title": title,
        "description": description,
        "priority": data.get("priority", "medium"),
        "status": "NEW",
        "source": data.get("source", "admin"),
        "category": data.get("category") or None,
        "complaintNumber": complaint_number,
        "assignedToId": assigned_to,
        "supervisorId": supervisor,
        "photos": json.dumps(photos) if photos else None,
        "gpsLocation": json.dumps(gps) if gps else None,
        "customerSnapshot": customer_snapshot if isinstance(customer_snapshot, str) else json.dumps(customer_snapshot) if customer_snapshot else None,
        "locationInfo": json.dumps(loc_info) if loc_info else None,
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }

    created = await insert_record(COMPLAINT_TABLE, record)

    # Timeline
    await _create_timeline(
        tenant_id, created["id"], "created", "", "NEW",
        user.userId, user.role,
        f"Complaint created by {user.role}",
    )

    # Invalidate cache
    await _invalidate_complaint_cache(tenant_id)

    return {
        "id": created["id"],
        "complaintNumber": complaint_number,
        "tenantId": tenant_id,
        "customerId": customer_id,
        "customerName": None,
        "equipmentId": data.get("equipmentId"),
        "equipmentName": None,
        "title": title,
        "description": description,
        "priority": data.get("priority", "medium"),
        "status": "NEW",
        "category": data.get("category"),
        "assignedToId": assigned_to,
        "assignedToName": None,
        "supervisorId": supervisor,
        "supervisorName": None,
        "createdAt": created.get("createdAt", _now_iso()),
        "updatedAt": created.get("updatedAt", _now_iso()),
    }


async def get_complaint(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
) -> dict[str, Any]:
    """Get a single complaint by ID with RBAC access check."""
    # Build RBAC data scope
    customer_id = None
    if user.role == "customer":
        cust_result = await query_table(
            CUSTOMER_TABLE,
            select="id",
            where={"tenantId": tenant_id, "OR": [
                *([{'email': user.email}] if user.email else []),
            ]},
            limit=1,
        )
        for r in cust_result.get("data", []):
            customer_id = r["id"]
            break

    data_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="complaint",
        customer_id=customer_id,
    )

    if data_scope is NEVER_MATCH:
        raise ForbiddenException(message="No access to complaints")

    # Add complaint ID filter
    where = {**data_scope, "id": complaint_id}

    # Remove duplicate OR that would conflict with id filter
    if "OR" in where and len(where) > 2:
        pass  # Keep OR for the data scope

    result = await query_table(
        COMPLAINT_TABLE,
        select="*",
        where=where,
        limit=1,
    )

    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Complaint")

    complaint = rows[0]

    # Resolve names
    cname = None
    if complaint.get("customerId"):
        cust = await _safe_query(
            lambda: query_table(CUSTOMER_TABLE, select="id,name", where={"id": complaint["customerId"]}, limit=1),
            {"data": []},
            "customer name",
        )
        for r in cust.get("data", []):
            cname = r["name"]
    if not cname and complaint.get("customerSnapshot"):
        try:
            snap = json.loads(complaint["customerSnapshot"]) if isinstance(complaint["customerSnapshot"], str) else complaint["customerSnapshot"]
            cname = snap.get("name")
        except (json.JSONDecodeError, TypeError):
            pass

    ename = None
    if complaint.get("equipmentId"):
        eq = await _safe_query(
            lambda: query_table(EQUIPMENT_TABLE, select="id,name", where={"id": complaint["equipmentId"]}, limit=1),
            {"data": []},
            "equipment name",
        )
        for r in eq.get("data", []):
            ename = r["name"]

    # Resolve user names
    user_name_map: dict[str, str] = {}
    uids = list({uid for uid in (complaint.get("assignedToId"), complaint.get("supervisorId")) if uid})
    if uids:
        ures = await _safe_query(
            lambda: query_table(USER_TABLE, select="id,name", where={"id": {"in": uids}}),
            {"data": []},
            "user names",
        )
        for r in ures.get("data", []):
            user_name_map[r["id"]] = r["name"]

    resp: dict[str, Any] = {
        "id": complaint["id"],
        "tenantId": complaint["tenantId"],
        "customerId": complaint.get("customerId"),
        "customerName": cname,
        "equipmentId": complaint.get("equipmentId"),
        "equipmentName": ename,
        "title": complaint["title"],
        "description": complaint["description"],
        "priority": complaint["priority"],
        "status": complaint["status"],
        "category": complaint.get("category"),
        "complaintNumber": complaint.get("complaintNumber"),
        "source": complaint.get("source"),
        "photos": complaint.get("photos"),
        "gpsLocation": complaint.get("gpsLocation"),
        "assignedToId": complaint.get("assignedToId"),
        "assignedToName": user_name_map.get(complaint.get("assignedToId")),
        "supervisorId": complaint.get("supervisorId"),
        "supervisorName": user_name_map.get(complaint.get("supervisorId")),
        "resolutionNotes": complaint.get("resolutionNotes"),
        "customerRating": complaint.get("customerRating"),
        "customerFeedback": complaint.get("customerFeedback"),
        "assignmentStatus": complaint.get("assignmentStatus"),
        "assignedBy": complaint.get("assignedBy"),
        "assignedByRole": complaint.get("assignedByRole"),
        "assignedAt": _iso(complaint.get("assignedAt")),
        "lastReassignedAt": _iso(complaint.get("lastReassignedAt")),
        "assignmentReason": complaint.get("assignmentReason"),
        "reassignmentCount": complaint.get("reassignmentCount"),
        "slaResponseDeadline": _iso(complaint.get("slaResponseDeadline")),
        "workOrderId": complaint.get("workOrderId"),
        "invoiceId": complaint.get("invoiceId"),
        "eta": complaint.get("eta"),
        "rejectionReason": complaint.get("rejectionReason"),
        "reworkReason": complaint.get("reworkReason"),
        "customerSnapshot": complaint.get("customerSnapshot"),
        "locationInfo": complaint.get("locationInfo"),
        "acceptedAt": _iso(complaint.get("acceptedAt")),
        "startedAt": _iso(complaint.get("startedAt")),
        "completedAt": _iso(complaint.get("completedAt")),
        "clientConfirmedAt": _iso(complaint.get("clientConfirmedAt")),
        "resolvedAt": _iso(complaint.get("resolvedAt")),
        "closedAt": _iso(complaint.get("closedAt")),
        "createdAt": _iso(complaint.get("createdAt")),
        "updatedAt": _iso(complaint.get("updatedAt")),
    }

    # Redact sensitive fields for customer role
    if user.role == "customer":
        for field in ("rejectionReason", "reworkReason", "assignmentReason", "reassignmentCount", "slaResponseDeadline"):
            resp.pop(field, None)

    return resp


async def update_complaint(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update complaint fields (NOT status transitions — use /workflow for that)."""
    require_permission("complaint.update_fields", user.role)

    # Customer can only update rating/feedback
    if user.role == "customer":
        allowed = {"customerRating", "customerFeedback"}
        requested = set(data.keys())
        disallowed = requested - allowed
        if disallowed:
            raise ForbiddenException(message=f"Customers can only update rating and feedback. Disallowed: {disallowed}")

    # Technician cannot reassign
    if user.role == "technician":
        if data.get("assignedToId") and data["assignedToId"] != user.userId:
            raise ForbiddenException(message="Technicians cannot reassign complaints")
        if "supervisorId" in data:
            raise ForbiddenException(message="Technicians cannot change supervisors")

    # Status transitions must go through /workflow
    if data.get("status"):
        raise ValidationException(message="Use POST /complaints/{id}/workflow for status transitions")

    # Validate rating
    if data.get("customerRating") is not None:
        rating = int(data["customerRating"])
        if not (1 <= rating <= 5):
            raise ValidationException(message="Customer rating must be between 1 and 5")

    # Build update data
    update_data: dict[str, Any] = {}
    field_map = {
        "title": "title",
        "description": "description",
        "priority": "priority",
        "category": "category",
        "resolutionNotes": "resolutionNotes",
        "customerRating": "customerRating",
        "customerFeedback": "customerFeedback",
        "eta": "eta",
    }
    for api_key, db_key in field_map.items():
        if api_key in data:
            update_data[db_key] = data[api_key]

    if "photos" in data:
        update_data["photos"] = json.dumps(data["photos"]) if data["photos"] else None
    if "gpsLocation" in data:
        update_data["gpsLocation"] = json.dumps(data["gpsLocation"]) if data["gpsLocation"] else None
    if "locationInfo" in data:
        update_data["locationInfo"] = json.dumps(data["locationInfo"]) if data["locationInfo"] else None
    if "assignedToId" in data:
        update_data["assignedToId"] = data["assignedToId"] or None
    if "supervisorId" in data:
        update_data["supervisorId"] = data["supervisorId"] or None

    update_data["updatedAt"] = _now_iso()

    updated = await update_record(COMPLAINT_TABLE, complaint_id, update_data)

    await _invalidate_complaint_cache(tenant_id)

    return {**updated, "updatedAt": _now_iso()}


async def delete_complaint(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
) -> None:
    """Delete a complaint (admin/super_admin only, only if status is NEW)."""
    require_permission("complaint.delete", user.role)

    # Verify complaint exists and is in NEW status
    result = await query_table(
        COMPLAINT_TABLE,
        select="id,status",
        where={"id": complaint_id, "tenantId": tenant_id},
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Complaint")
    if rows[0]["status"] != "NEW":
        raise ValidationException(message="Can only delete complaints in NEW status")

    await delete_record(COMPLAINT_TABLE, complaint_id)
    await _invalidate_complaint_cache(tenant_id)


async def assign_technician(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Assign or reassign a technician to a complaint."""
    require_permission("complaint.assign_technician", user.role)

    technician_id = data.get("technicianId")
    reason = data.get("reason")
    if not technician_id:
        raise ValidationException(message="technicianId is required")

    # Get complaint
    result = await query_table(
        COMPLAINT_TABLE,
        select="id,assignedToId,supervisorId,customerId,title,category,status,assignmentStatus,assignedAt,slaResponseDeadline,priority,reassignmentCount,tenantId",
        where={"id": complaint_id, "tenantId": tenant_id},
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Complaint")
    complaint = rows[0]

    # Validate technician
    tech_result = await query_table(
        USER_TABLE,
        select="id,name,role,isOnline,departmentId,phone,email",
        where={"id": technician_id, "tenantId": tenant_id, "isActive": True},
        limit=1,
    )
    tech_rows = tech_result.get("data", [])
    if not tech_rows:
        raise NotFoundException(resource="Technician")
    tech = tech_rows[0]
    if tech["role"] not in TECH_ROLES:
        raise ValidationException(message="Selected user is not a technician or supervisor")

    if complaint["assignedToId"] == technician_id:
        raise ConflictException(message=f"{tech['name']} is already assigned to this complaint")

    # Check workload
    active_count = await count_records(
        COMPLAINT_TABLE,
        where={
            "assignedToId": technician_id,
            "tenantId": tenant_id,
            "id": {"ne": complaint_id},
            "status": {"in": ["ASSIGNED", "ACCEPTED", "WORK_ORDER_CREATED", "IN_PROGRESS"]},
        },
    )
    if active_count >= MAX_ACTIVE_JOBS:
        raise ValidationException(message=f"{tech['name']} already has {active_count} active jobs (max {MAX_ACTIVE_JOBS})")

    is_reassignment = complaint["assignedToId"] is not None and complaint["assignedToId"] != technician_id
    sla_deadline = (utcnow() + timedelta(minutes=SLA_RESPONSE_MINUTES)).isoformat()

    prev_tech_name = None
    if complaint.get("assignedToId"):
        prev_res = await _safe_query(
            lambda: query_table(USER_TABLE, select="id,name", where={"id": complaint["assignedToId"]}, limit=1),
            {"data": []},
            "prev tech name",
        )
        for r in prev_res.get("data", []):
            prev_tech_name = r["name"]

    update_data: dict[str, Any] = {
        "assignedToId": technician_id,
        "supervisorId": (user.userId if user.role in ("supervisor", "manager") else complaint.get("supervisorId")) or user.userId,
        "assignedBy": user.userId,
        "assignedByRole": user.role,
        "assignmentReason": reason or None,
        "assignmentStatus": "PENDING_ACCEPTANCE",
        "rejectionReason": None,
        "eta": None,
        "status": "ASSIGNED",
        "slaResponseDeadline": sla_deadline,
        "updatedAt": _now_iso(),
    }

    if is_reassignment:
        update_data["lastReassignedAt"] = _now_iso()
        update_data["reassignmentCount"] = (complaint.get("reassignmentCount") or 0) + 1
    elif not complaint.get("assignedAt"):
        update_data["assignedAt"] = _now_iso()

    updated = await update_record(COMPLAINT_TABLE, complaint_id, update_data)

    # Timeline
    action = "reassigned" if is_reassignment else "assigned"
    if is_reassignment:
        desc = f"{tech['name']} reassigned by {user.role} (replacing {prev_tech_name or 'unassigned'}). Reason: {reason or 'N/A'}. SLA: {SLA_RESPONSE_MINUTES}min to accept."
    else:
        desc = f"{tech['name']} assigned by {user.role}. Reason: {reason or 'N/A'}. SLA: {SLA_RESPONSE_MINUTES}min to accept."
    await _create_timeline(
        tenant_id, complaint_id, action, complaint["status"], "ASSIGNED",
        user.userId, user.role, desc,
        metadata={"technicianId": technician_id, "technicianName": tech["name"],
                 "previousTechnicianId": complaint.get("assignedToId"), "previousTechnicianName": prev_tech_name,
                 "isReassignment": is_reassignment, "reason": reason or None,
                 "slaResponseDeadline": sla_deadline},
    )

    # Notify technician
    await _send_firebase(technician_id, f"New Complaint Assigned: {complaint['title']}",
                         f"You have been assigned to complaint: {complaint['title']}", tenant_id, entity_id=complaint_id)
    await _send_notification(tenant_id, technician_id, "Complaint Assigned",
                             f"{user.role} assigned you to: {complaint['title']}", "workflow_transition", complaint_id)

    # Notify previous tech if reassignment
    if is_reassignment and complaint.get("assignedToId"):
        await _send_notification(tenant_id, complaint["assignedToId"], "Complaint Reassigned",
                                 f"Complaint reassigned to {tech['name']}. Reason: {reason or 'N/A'}", "complaint_reassigned_away", complaint_id)

    await _invalidate_complaint_cache(tenant_id)

    timeline = await get_timeline(tenant_id, complaint_id)

    return {
        "success": True,
        "isReassignment": is_reassignment,
        "message": f"{tech['name']} has been {'reassigned to' if is_reassignment else 'assigned to'} this complaint. SLA: {SLA_RESPONSE_MINUTES}min to accept.",
        "complaint": {
            "id": updated["id"],
            "status": updated.get("status"),
            "assignedToId": updated.get("assignedToId"),
            "assignedBy": updated.get("assignedBy"),
            "assignedByRole": updated.get("assignedByRole"),
            "assignedAt": _iso(updated.get("assignedAt")),
            "lastReassignedAt": _iso(updated.get("lastReassignedAt")),
            "assignmentReason": updated.get("assignmentReason"),
            "assignmentStatus": updated.get("assignmentStatus"),
            "reassignmentCount": updated.get("reassignmentCount"),
            "slaResponseDeadline": _iso(updated.get("slaResponseDeadline")),
        },
        "timeline": timeline,
    }


async def get_available_technicians(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
    q: str = "",
    status_filter: str = "",
    department: str = "",
    sort_by: str = "availability",
    limit: int = 25,
) -> dict[str, Any]:
    """Get technicians available for assignment."""
    if user.role not in ASSIGNMENT_ROLES:
        raise ForbiddenException(message="Insufficient permissions")

    where: dict[str, Any] = {
        "tenantId": tenant_id,
        "isActive": True,
        "role": {"in": list(TECH_ROLES)},
    }

    if q:
        where["OR"] = [
            {"name": {"contains": q}},
            {"email": {"contains": q}},
            {"employeeNumber": {"contains": q}},
            {"phone": {"contains": q}},
        ]

    if status_filter == "available":
        where["isOnline"] = True
    elif status_filter == "busy":
        where["isOnline"] = False

    if department:
        where["departmentId"] = department

    result = await query_table(
        USER_TABLE,
        select="id,name,email,phone,role,employeeNumber,avatar,departmentId,isOnline,lastLogin,profileCompleted",
        where=where,
        limit=limit * 2,
    )

    technicians = result.get("data", [])
    tech_ids = [t["id"] for t in technicians]

    # Parallel enrichment
    now = utcnow()

    async def _get_active_jobs():
        if not tech_ids:
            return {}
        res = await query_table(
            COMPLAINT_TABLE,
            select="assignedToId,id,title,status,priority,category,createdAt",
            where={"assignedToId": {"in": tech_ids}, "status": {"in": ["ASSIGNED", "ACCEPTED", "WORK_ORDER_CREATED", "IN_PROGRESS"]}},
        )
        cmap: dict[str, list] = {}
        for r in res.get("data", []):
            aid = r.get("assignedToId")
            if aid:
                cmap.setdefault(aid, []).append(r)
        return cmap

    async def _get_leave():
        if not tech_ids:
            return {}
        # Simplified: no leave table query in this scope
        return {}

    complaint_map, leave_map = await _safe_query(_get_active_jobs, {}, "active jobs"), await _safe_query(_get_leave, {}, "leave")

    # Get complaint info for current assignment
    comp_info = await _safe_query(
        lambda: query_table(COMPLAINT_TABLE, select="assignedToId,supervisorId,category,status,assignmentStatus,assignedAt,slaResponseDeadline,priority",
                               where={"id": complaint_id, "tenantId": tenant_id}, limit=1),
        {"data": []},
        "complaint info",
    )
    comp_rows = comp_info.get("data", [])
    current_assignment = None
    if comp_rows:
        c = comp_rows[0]
        current_assignment = {
            "assignedToId": c.get("assignedToId"),
            "supervisorId": c.get("supervisorId"),
            "category": c.get("category"),
            "assignmentStatus": c.get("assignmentStatus"),
            "assignedAt": _iso(c.get("assignedAt")),
            "slaResponseDeadline": _iso(c.get("slaResponseDeadline")),
            "priority": c.get("priority"),
        }

    enriched = []
    for t in technicians:
        active = complaint_map.get(t["id"], [])
        active_count = len(active)
        on_leave = bool(leave_map.get(t["id"]))
        can_assign = not on_leave and active_count < MAX_ACTIVE_JOBS

        enriched.append({
            "id": t["id"],
            "name": t["name"],
            "email": t.get("email"),
            "phone": t.get("phone"),
            "role": t["role"],
            "employeeNumber": t.get("employeeNumber"),
            "avatar": t.get("avatar"),
            "departmentId": t.get("departmentId"),
            "isOnline": bool(t.get("isOnline")),
            "lastLogin": _iso(t.get("lastLogin")),
            "activeJobs": active_count,
            "maxJobs": MAX_ACTIVE_JOBS,
            "workloadPercent": round((active_count / MAX_ACTIVE_JOBS) * 100),
            "onLeave": on_leave,
            "availabilityStatus": "on_leave" if on_leave else ("available" if t.get("isOnline") else "offline"),
            "canAssign": can_assign,
            "currentTasks": [{"id": c["id"], "title": c["title"], "status": c["status"], "priority": c["priority"], "category": c.get("category"), "createdAt": _iso(c.get("createdAt"))} for c in active],
            "isCurrentlyAssigned": t["id"] == (current_assignment.get("assignedToId") if current_assignment else None),
        })

    # Sort
    if sort_by == "workload":
        enriched.sort(key=lambda x: (x["activeJobs"], -int(x["isOnline"])))
    elif sort_by == "name":
        enriched.sort(key=lambda x: x["name"])
    else:  # availability (default)
        def _avail_sort(x):
            pri = 2 if x["onLeave"] else (0 if x["isOnline"] else 1)
            return (pri, x["activeJobs"], x["name"])
        enriched.sort(key=_avail_sort)

    return {
        "technicians": enriched[:limit],
        "currentAssignment": current_assignment,
    }


async def accept_reject_complaint(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Technician accepts or rejects a complaint assignment."""
    action = data.get("action")
    eta = data.get("eta")
    rejection_reason = data.get("rejectionReason")

    if action not in ("accept", "reject"):
        raise ValidationException(message='action must be "accept" or "reject"')

    if user.role != "technician":
        raise ForbiddenException(message="Only technicians can accept or reject assignments")

    # Get complaint
    result = await query_table(
        COMPLAINT_TABLE,
        select="*",
        where={"id": complaint_id, "tenantId": tenant_id},
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Complaint")
    complaint = rows[0]

    # Must be assigned to this user
    if complaint.get("assignedToId") != user.userId:
        raise ForbiddenException(message="This complaint is not assigned to you")

    # Must be in PENDING_ACCEPTANCE or ASSIGNED
    if complaint.get("assignmentStatus") != "PENDING_ACCEPTANCE" and complaint.get("status") != "ASSIGNED":
        raise ValidationException(message=f"Cannot {action}: complaint is not pending acceptance (current: {complaint.get('assignmentStatus')})")

    if action == "accept":
        # Update to ACCEPTED
        update_data: dict[str, Any] = {
            "assignmentStatus": "ACCEPTED",
            "status": "ACCEPTED",
            "acceptedAt": _now_iso(),
            "eta": eta or None,
            "rejectionReason": None,
            "updatedAt": _now_iso(),
        }
        updated = await update_record(COMPLAINT_TABLE, complaint_id, update_data)

        await _create_timeline(
            tenant_id, complaint_id, "accepted", "ASSIGNED", "ACCEPTED",
            user.userId, user.role,
            f"Technician accepted the assignment.{f' ETA: {eta}' if eta else ''}",
            metadata={"technicianId": user.userId, "eta": eta or None},
        )

        # Auto-create Work Order
        year = datetime.now(timezone.utc).year
        wo_count = await count_records(WORK_ORDER_TABLE, where={"tenantId": tenant_id})
        wo_number = f"WO-{year}-{str(wo_count + 1).zfill(6)}"

        wo_record: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "tenantId": tenant_id,
            "complaintId": complaint_id,
            "equipmentId": complaint.get("equipmentId"),
            "title": f"{wo_number} — {complaint['title']}",
            "description": complaint.get("description"),
            "status": "ACCEPTED",
            "priority": complaint.get("priority"),
            "type": "corrective",
            "category": complaint.get("category"),
            "assignedToId": complaint.get("assignedToId"),
            "supervisorId": complaint.get("supervisorId"),
            "createdBy": user.userId,
            "scheduledDate": eta or None,
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        wo = await insert_record(WORK_ORDER_TABLE, wo_record)

        # Update complaint with work order and advance to WORK_ORDER_CREATED
        await update_record(COMPLAINT_TABLE, complaint_id, {
            "workOrderId": wo["id"],
            "status": "WORK_ORDER_CREATED",
            "updatedAt": _now_iso(),
        })

        await _create_timeline(
            tenant_id, complaint_id, "work_order_created", "ACCEPTED", "WORK_ORDER_CREATED",
            user.userId, user.role,
            f"Work order {wo_number} auto-created and assigned.",
            metadata={"workOrderId": wo["id"], "workOrderNumber": wo_number},
        )

        # Notify admins
        await _send_notification(tenant_id, complaint.get("supervisorId") or "",
                                 "Technician Accepted Assignment",
                                 f"Complaint accepted: {complaint['title']}", "complaint_accepted", complaint_id)

        await _invalidate_complaint_cache(tenant_id)
        timeline = await get_timeline(tenant_id, complaint_id)

        return {
            "success": True,
            "message": "Assignment accepted. Work order created.",
            "complaint": {
                "id": complaint_id,
                "status": "WORK_ORDER_CREATED",
                "assignmentStatus": "ACCEPTED",
                "assignedToId": complaint.get("assignedToId"),
                "acceptedAt": _iso(update_data["acceptedAt"]),
                "rejectionReason": None,
                "workOrderId": wo["id"],
                "eta": eta or None,
            },
            "workOrder": {"id": wo["id"], "title": wo["title"], "status": wo["status"]},
            "timeline": timeline,
        }

    else:  # reject
        if not rejection_reason or not rejection_reason.strip():
            raise ValidationException(message="Rejection reason is required")

        update_data = {
            "assignmentStatus": "REJECTED",
            "status": "NEW",
            "assignedToId": None,
            "rejectionReason": rejection_reason,
            "eta": None,
            "acceptedAt": None,
            "updatedAt": _now_iso(),
        }
        updated = await update_record(COMPLAINT_TABLE, complaint_id, update_data)

        await _create_timeline(
            tenant_id, complaint_id, "rejected", "ASSIGNED", "NEW",
            user.userId, user.role,
            f"Technician rejected the assignment. Reason: {rejection_reason}",
            metadata={"rejectionReason": rejection_reason},
        )

        # Notify admins
        await _send_notification(tenant_id, complaint.get("supervisorId") or "",
                                 "Technician Rejected Assignment",
                                 f"Complaint rejected: {complaint['title']}. Reason: {rejection_reason}",
                                 "complaint_rejected", complaint_id)

        await _invalidate_complaint_cache(tenant_id)
        timeline = await get_timeline(tenant_id, complaint_id)

        return {
            "success": True,
            "message": "Assignment rejected. Complaint returned to pool for reassignment.",
            "complaint": {
                "id": complaint_id,
                "status": "NEW",
                "assignmentStatus": "REJECTED",
                "assignedToId": None,
                "acceptedAt": None,
                "rejectionReason": rejection_reason,
                "workOrderId": None,
                "eta": None,
            },
            "workOrder": None,
            "timeline": timeline,
        }


async def process_workflow(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Generic workflow handler for status transitions."""
    action = data.get("action")
    override_target = data.get("targetStatus")

    if not action:
        raise ValidationException(message="Missing required field: action")

    is_admin_override = (action == "override" and user.role in ("super_admin", "admin"))

    target_status = ACTION_STATUS_MAP.get(action) if action != "override" else override_target
    if not target_status:
        raise ValidationException(message=f"Unknown action: {action}")

    # Get complaint
    result = await query_table(
        COMPLAINT_TABLE,
        select="*",
        where={"id": complaint_id, "tenantId": tenant_id},
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Complaint")
    complaint = rows[0]

    current_status = complaint.get("status", "NEW")

    # Validate transition
    validation = validate_transition(current_status, target_status, user.role, is_admin_override)
    if not validation["success"]:
        raise ValidationException(message=validation["error"])

    # Build update data based on action
    update_data: dict[str, Any] = {"status": target_status, "updatedAt": _now_iso()}
    action_name = validation["action"]

    if action == "start" and not complaint.get("startedAt"):
        update_data["startedAt"] = _now_iso()

    if action == "complete":
        update_data["completedAt"] = _now_iso()
        # Update linked work order
        wo_id = data.get("workOrderId") or complaint.get("workOrderId")
        if wo_id:
            labor = data.get("laborCost") or 0
            material = data.get("materialCost") or 0
            wo_update: dict[str, Any] = {
                "status": "COMPLETED",
                "isLocked": True,
                "completedAt": _now_iso(),
                "laborHours": data.get("laborHours"),
                "laborCost": labor,
                "materialCost": material,
                "totalCost": labor + material,
                "updatedAt": _now_iso(),
            }
            if data.get("checklistData"):
                wo_update["checklistData"] = json.dumps(data["checklistData"])
            if data.get("beforePhotos"):
                wo_update["beforePhotos"] = json.dumps(data["beforePhotos"])
            if data.get("afterPhotos"):
                wo_update["afterPhotos"] = json.dumps(data["afterPhotos"])
            if data.get("materialsUsed"):
                wo_update["materialsUsed"] = json.dumps(data["materialsUsed"])
            if data.get("remarks"):
                wo_update["remarks"] = data["remarks"]
            if data.get("technicianSignature"):
                wo_update["technicianSignature"] = data["technicianSignature"]
            if data.get("videoUrl"):
                wo_update["videoUrl"] = data["videoUrl"]
            await _safe_query(
                lambda wo_id=wo_id, wo_update=wo_update: update_record(WORK_ORDER_TABLE, wo_id, wo_update),
                None, "update work order",
            )

    if action == "client_confirm":
        update_data["clientConfirmedAt"] = _now_iso()
        # Auto-advance to DRAFT_INVOICE
        update_data["status"] = "DRAFT_INVOICE"
        # Auto-create draft invoice
        wo_id = complaint.get("workOrderId")
        if wo_id:
            wo_res = await _safe_query(
                lambda: query_table(WORK_ORDER_TABLE, select="laborCost,materialCost,laborHours", where={"id": wo_id}, limit=1),
                {"data": []},
                "WO for invoice",
            )
            wo_rows = wo_res.get("data", [])
            labor = wo_rows[0]["laborCost"] if wo_rows else 0
            material = wo_rows[0]["materialCost"] if wo_rows else 0
            subtotal = labor + material
            inv_number = f"INV-{datetime.now(timezone.utc).year}-{str(uuid.uuid4().int >> 96).zfill(6)}"
            inv_record = {
                "id": str(uuid.uuid4()),
                "tenantId": tenant_id,
                "customerId": complaint.get("customerId"),
                "workOrderId": wo_id,
                "invoiceNumber": inv_number,
                "title": f"Invoice for {complaint['title']}",
                "description": f"Service completion for complaint: {complaint['title']}",
                "items": json.dumps([]),
                "subtotal": subtotal,
                "tax": 0, "discount": 0, "total": subtotal,
                "status": "DRAFT",
                "dueDate": (utcnow() + timedelta(days=30)).isoformat(),
                "createdBy": user.userId,
                "createdAt": _now_iso(),
                "updatedAt": _now_iso(),
            }
            inv = await _safe_query(lambda: insert_record(INVOICE_TABLE, inv_record), None, "create invoice")
            if inv:
                update_data["invoiceId"] = inv["id"]

    if action == "client_reject":
        update_data["reworkReason"] = data.get("reworkReason")

    if action == "rework":
        update_data["reworkReason"] = data.get("reworkReason")
        if not complaint.get("startedAt"):
            update_data["startedAt"] = _now_iso()

    if action == "approve_invoice" and complaint.get("invoiceId"):
        await _safe_query(
            lambda: update_record(INVOICE_TABLE, complaint["invoiceId"], {"status": "APPROVED", "updatedAt": _now_iso()}),
            None, "approve invoice",
        )

    if action == "send_invoice" and complaint.get("invoiceId"):
        await _safe_query(
            lambda: update_record(INVOICE_TABLE, complaint["invoiceId"], {"status": "PENDING", "sentVia": data.get("sentVia", "portal"), "updatedAt": _now_iso()}),
            None, "send invoice",
        )

    if action == "record_payment" and complaint.get("invoiceId"):
        await _safe_query(
            lambda: update_record(INVOICE_TABLE, complaint["invoiceId"], {
                "status": "PAID",
                "paidAt": data.get("paidAt") or _now_iso(),
                "paymentMethod": data.get("paymentMethod"),
                "paymentRef": data.get("paymentRef"),
                "updatedAt": _now_iso(),
            }),
            None, "record payment",
        )

    if action == "close":
        update_data["closedAt"] = _now_iso()
        update_data["resolvedAt"] = complaint.get("resolvedAt") or _now_iso()

    if action == "override":
        update_data["resolutionNotes"] = data.get("notes") or complaint.get("resolutionNotes")
        if target_status == "CLOSED":
            update_data["closedAt"] = _now_iso()
            update_data["resolvedAt"] = complaint.get("resolvedAt") or _now_iso()

    updated = await update_record(COMPLAINT_TABLE, complaint_id, update_data)

    # Timeline
    await _create_timeline(
        tenant_id, complaint_id, action_name or action, current_status, updated.get("status", target_status),
        user.userId, user.role,
        f"{action} by {user.role}",
        metadata={k: v for k, v in data.items() if k in ("assignedToId", "supervisorId", "eta", "rejectionReason", "reworkReason", "laborCost", "materialCost", "notes") and v is not None},
    )

    await _invalidate_complaint_cache(tenant_id)
    timeline = await get_timeline(tenant_id, complaint_id)

    return {
        "complaint": {
            "id": updated["id"],
            "status": updated.get("status"),
            "assignedToId": updated.get("assignedToId"),
            "supervisorId": updated.get("supervisorId"),
            "workOrderId": updated.get("workOrderId"),
            "invoiceId": updated.get("invoiceId"),
            "eta": updated.get("eta"),
            "rejectionReason": updated.get("rejectionReason"),
            "reworkReason": updated.get("reworkReason"),
            "acceptedAt": _iso(updated.get("acceptedAt")),
            "startedAt": _iso(updated.get("startedAt")),
            "completedAt": _iso(updated.get("completedAt")),
            "clientConfirmedAt": _iso(updated.get("clientConfirmedAt")),
            "resolvedAt": _iso(updated.get("resolvedAt")),
            "closedAt": _iso(updated.get("closedAt")),
            "updatedAt": _iso(updated.get("updatedAt")),
        },
        "timeline": timeline,
    }


async def get_assignment_history(
    tenant_id: str,
    complaint_id: str,
    user: AuthUser,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Get assignment history for a complaint."""
    if user.role not in ("super_admin", "admin", "supervisor", "manager", "technician", "finance"):
        raise ForbiddenException(message="Insufficient permissions")

    # Get complaint
    comp_result = await query_table(
        COMPLAINT_TABLE,
        select="id,title,assignedToId,assignedAt,assignmentStatus,reassignmentCount",
        where={"id": complaint_id, "tenantId": tenant_id},
        limit=1,
    )
    comp_rows = comp_result.get("data", [])
    if not comp_rows:
        raise NotFoundException(resource="Complaint")
    complaint = comp_rows[0]

    # Get timeline entries for assignment actions
    offset = (page - 1) * page_size
    tl_result = await query_table(
        TIMELINE_TABLE,
        where={"complaintId": complaint_id, "tenantId": tenant_id, "action": {"in": ["assigned", "reassigned", "accepted", "rejected"]}},
        order="createdAt.desc",
        offset=offset,
        limit=page_size,
        count="exact",
    )

    entries = []
    user_ids = set()
    for entry in tl_result.get("data", []):
        performer = entry.get("performedBy")
        if performer:
            user_ids.add(performer)
        meta = entry.get("metadata")
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except json.JSONDecodeError:
                meta = {}
        entries.append({
            "id": entry["id"],
            "action": entry.get("action"),
            "fromStatus": entry.get("fromStatus"),
            "toStatus": entry.get("toStatus"),
            "description": entry.get("description"),
            "createdAt": _iso(entry.get("createdAt")),
            "performedBy": None,  # resolved below
            "metadata": {
                "technicianId": meta.get("technicianId"),
                "technicianName": meta.get("technicianName"),
                "previousTechnicianId": meta.get("previousTechnicianId"),
                "previousTechnicianName": meta.get("previousTechnicianName"),
                "isReassignment": meta.get("isReassignment"),
                "reason": meta.get("reason"),
                "reassignmentCount": meta.get("reassignmentCount"),
                "slaResponseDeadline": meta.get("slaResponseDeadline"),
            },
        })

    # Resolve performer names
    if user_ids:
        ures = await _safe_query(
            lambda: query_table(USER_TABLE, select="id,name,role,avatar,employeeNumber", where={"id": {"in": list(user_ids)}}),
            {"data": []},
            "performer names",
        )
        user_map = {r["id"]: r for r in ures.get("data", [])}
        for entry in entries:
            performer_id = None
            # Get performer from original entry
            for orig in tl_result.get("data", []):
                if orig["id"] == entry["id"]:
                    performer_id = orig.get("performedBy")
                    break
            if performer_id and performer_id in user_map:
                u = user_map[performer_id]
                entry["performedBy"] = {"id": u["id"], "name": u["name"], "role": u.get("role"), "avatar": u.get("avatar"), "employeeNumber": u.get("employeeNumber")}

    total_str = tl_result.get("count", "0")
    try:
        total = int(total_str) if total_str not in ("*", None) else len(entries)
    except (ValueError, TypeError):
        total = len(entries)

    # Current assignee
    current_assignee = None
    if complaint.get("assignedToId"):
        ca_res = await _safe_query(
            lambda: query_table(USER_TABLE, select="id,name,role,avatar,employeeNumber", where={"id": complaint["assignedToId"]}, limit=1),
            {"data": []},
            "current assignee",
        )
        for r in ca_res.get("data", []):
            current_assignee = {**r, "assignedAt": _iso(complaint.get("assignedAt")), "assignmentStatus": complaint.get("assignmentStatus")}

    return {
        "complaint": {
            "id": complaint["id"],
            "title": complaint["title"],
            "currentAssignment": current_assignee,
            "reassignmentCount": complaint.get("reassignmentCount"),
        },
        "entries": entries,
        "pagination": {"page": page, "pageSize": page_size, "totalCount": total, "totalPages": (total + page_size - 1) // page_size if total > 0 else 0},
    }


async def get_counts(
    tenant_id: str,
    user: AuthUser,
) -> dict[str, int]:
    """Count complaints by status (RBAC scoped)."""
    customer_id = None
    if user.role == "customer":
        cust_result = await query_table(
            CUSTOMER_TABLE,
            select="id",
            where={"tenantId": tenant_id, "OR": [
                *([{'email': user.email}] if user.email else []),
            ]},
            limit=1,
        )
        for r in cust_result.get("data", []):
            customer_id = r["id"]
            break

    data_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="complaint",
        customer_id=customer_id,
    )

    if data_scope is NEVER_MATCH:
        return {}

    # Query all complaints and count by status in-memory
    # (PostgREST groupBy is not directly available, so we fetch and count)
    result = await query_table(
        COMPLAINT_TABLE,
        select="status",
        where=data_scope,
    )

    counts: dict[str, int] = {}
    for row in result.get("data", []):
        status = row.get("status")
        if status:
            counts[status] = counts.get(status, 0) + 1

    return counts


async def get_escalation_rules(
    user: AuthUser,
) -> list[dict[str, Any]]:
    """Return configured escalation rules."""
    if user.role not in ("super_admin", "admin", "manager", "supervisor"):
        raise ForbiddenException(message="Escalation rules visible to supervisors, managers, and admins only")

    return [
        {
            "status": rule["status"],
            "threshold": _format_threshold(rule["thresholdMs"]),
            "thresholdMs": rule["thresholdMs"],
            "severity": rule["severity"],
            "label": rule["label"],
            "description": rule["description"],
            "notifyRoles": rule["notifyRoles"],
            "notifyCustomer": rule["notifyCustomer"],
            "notifySupervisor": rule["notifySupervisor"],
        }
        for rule in ESCALATION_RULES
    ]


async def check_escalation(
    tenant_id: str,
    user: AuthUser,
    target_tenant_id: str | None = None,
) -> dict[str, Any]:
    """Check if any complaints should be escalated based on SLA."""
    if user.role not in ("super_admin", "admin", "manager"):
        raise ForbiddenException(message="Only admin, super_admin, or manager can trigger escalation checks")

    effective_tenant = target_tenant_id if (target_tenant_id and user.role == "super_admin") else tenant_id

    triggered: list[dict[str, Any]] = []
    now = utcnow()

    for rule in ESCALATION_RULES:
        threshold_dt = now - timedelta(milliseconds=rule["thresholdMs"])
        result = await query_table(
            COMPLAINT_TABLE,
            select="id,title,status,assignedToId,assignedAt,customerId,priority,updatedAt",
            where={
                "tenantId": effective_tenant,
                "status": rule["status"],
                "updatedAt": {"lt": threshold_dt.isoformat()},
            },
        )
        for row in result.get("data", []):
            triggered.append({
                "complaintId": row["id"],
                "title": row["title"],
                "status": row["status"],
                "rule": rule["label"],
                "severity": rule["severity"],
                "threshold": _format_threshold(rule["thresholdMs"]),
            })

    return {"success": True, "triggered": triggered, "details": triggered}


async def get_customer_profile(
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get customer profile with buildings and equipment (customer role only)."""
    if user.role != "customer":
        return {"customer": None, "buildings": [], "equipment": []}

    # Find user
    user_result = await query_table(
        USER_TABLE,
        select="id,name,email,phone,tenantId",
        where={"id": user.userId},
        limit=1,
    )
    user_rows = user_result.get("data", [])
    if not user_rows:
        raise NotFoundException(resource="User")
    u = user_rows[0]

    # Find customer record
    cust_where: dict[str, Any] = {"tenantId": tenant_id, "OR": []}
    if u.get("email"):
        cust_where["OR"].append({"email": u["email"]})
    if u.get("phone"):
        cust_where["OR"].append({"phone": u["phone"]})
    if not cust_where["OR"]:
        cust_where["OR"].append({"id": "__never__"})  # no match

    cust_result = await query_table(
        CUSTOMER_TABLE,
        select="*",
        where=cust_where,
        limit=1,
    )
    cust_rows = cust_result.get("data", [])

    was_auto_created = False
    if not cust_rows:
        # Auto-create
        count = await count_records(CUSTOMER_TABLE, where={"tenantId": tenant_id})
        cust_number = f"CUST-{str(count + 1).zfill(6)}"
        cust_record = {
            "id": str(uuid.uuid4()),
            "tenantId": tenant_id,
            "name": u.get("name"),
            "email": u.get("email") or user.email or None,
            "phone": u.get("phone") or "",
            "customerNumber": cust_number,
            "country": "Brunei",
            "isActive": True,
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        customer = await insert_record(CUSTOMER_TABLE, cust_record)
        was_auto_created = True
    else:
        customer = cust_rows[0]

    # Get equipment
    eq_result = await query_table(
        EQUIPMENT_TABLE,
        select="id,name,category,assetNumber,brand,model,building,room,location,status,condition",
        where={"tenantId": tenant_id, "customerId": customer["id"], "status": {"in": ["active", "under_maintenance"]}},
        order="building.asc,name.asc",
    )
    equipment = eq_result.get("data", [])

    # Derive buildings
    building_map: dict[str, int] = {}
    for eq in equipment:
        bldg = eq.get("building") or "Unassigned"
        building_map[bldg] = building_map.get(bldg, 0) + 1
    buildings = [{"label": b, "equipmentCount": c} for b, c in building_map.items()]

    return {
        "customer": {
            "id": customer["id"],
            "name": customer.get("name"),
            "email": customer.get("email"),
            "phone": customer.get("phone"),
            "address": customer.get("address"),
            "companyName": customer.get("companyName"),
            "customerNumber": customer.get("customerNumber"),
            "pic": customer.get("pic"),
            "country": customer.get("country"),
            "district": customer.get("district"),
            "gpsLocation": customer.get("gpsLocation"),
            "wasAutoCreated": was_auto_created,
        },
        "buildings": buildings,
        "equipment": equipment,
    }


async def get_workflow_state(
    tenant_id: str,
    user: AuthUser,
    complaint_id: str,
) -> dict[str, Any]:
    """Get workflow state and available actions for a complaint."""
    customer_id = None
    if user.role == "customer":
        cust_result = await query_table(
            CUSTOMER_TABLE,
            select="id",
            where={"tenantId": tenant_id, "OR": [
                *([{'email': user.email}] if user.email else []),
            ]},
            limit=1,
        )
        for r in cust_result.get("data", []):
            customer_id = r["id"]
            break

    data_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="complaint",
        customer_id=customer_id,
    )

    if data_scope is NEVER_MATCH:
        raise ForbiddenException(message="No access to this complaint")

    result = await query_table(
        COMPLAINT_TABLE,
        select="*",
        where={**data_scope, "id": complaint_id},
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Complaint")
    complaint = rows[0]

    current_status = complaint.get("status", "NEW")
    available_actions = get_available_actions(current_status, user.role)
    timeline = await get_timeline(tenant_id, complaint_id)

    return {
        "complaint": {
            "id": complaint["id"],
            "status": complaint["status"],
            "priority": complaint["priority"],
            "category": complaint.get("category"),
            "title": complaint["title"],
            "source": complaint.get("source"),
            "assignedToId": complaint.get("assignedToId"),
            "supervisorId": complaint.get("supervisorId"),
            "workOrderId": complaint.get("workOrderId"),
            "invoiceId": complaint.get("invoiceId"),
            "eta": complaint.get("eta"),
            "rejectionReason": complaint.get("rejectionReason"),
            "reworkReason": complaint.get("reworkReason"),
            "acceptedAt": _iso(complaint.get("acceptedAt")),
            "startedAt": _iso(complaint.get("startedAt")),
            "completedAt": _iso(complaint.get("completedAt")),
            "clientConfirmedAt": _iso(complaint.get("clientConfirmedAt")),
            "resolvedAt": _iso(complaint.get("resolvedAt")),
            "closedAt": _iso(complaint.get("closedAt")),
            "createdAt": _iso(complaint.get("createdAt")),
            "updatedAt": _iso(complaint.get("updatedAt")),
        },
        "availableActions": available_actions,
        "timeline": timeline,
    }
