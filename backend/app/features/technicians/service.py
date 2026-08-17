"""
Technician service layer - CENTRALIZED technician resolution.

MOHD.HMS ENTERPRISE

This is the SINGLE source of technician data for the entire system.
Technicians = users with role IN (technician, supervisor) and isActive=true.

Provides:
  - list_technicians (with KPI stats, availability, skills)
  - get_available_technicians (not currently assigned to active complaints)
  - get_technician (full detail with active complaints/WOs, timeline, leave)
  - get_technician_timeline (today's activity timeline)
  - get_technician_performance (metrics: completion, SLA, ratings, attendance, revenue)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.integrations.supabase import AsyncSupabaseClient, get_supabase

from .schemas import (
    ACTIVE_COMPLAINT_STATUSES,
    ACTIVE_WO_STATUSES,
    CLOSED_STATUSES,
    MAX_ACTIVE_JOBS,
    TECH_ROLES,
)

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


def _compute_availability(
    on_leave: bool,
    has_emergency: bool,
    active_jobs: int,
    is_online: bool,
) -> str:
    """Determine availability status for a technician."""
    if on_leave:
        return "on_leave"
    if has_emergency:
        return "emergency"
    if active_jobs > 0:
        return "busy"
    if is_online:
        return "available"
    return "offline"


# ── List Technicians ─────────────────────────────────────────────────────


async def list_technicians(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    department: str = "",
    status: str = "",
    skill: str = "",
    sort_by: str = "name",
) -> dict[str, Any]:
    """List all technicians/supervisors with KPI stats.

    Matches: GET /api/technicians
    Returns: { stats: {...}, technicians: [...], pagination: {...} }
    """
    db: AsyncSupabaseClient = get_supabase()
    offset = (page - 1) * page_size

    # Base where clause
    base_where: dict[str, Any] = {
        "tenantId": tenant_id,
        "isActive": True,
        "role": {"in": TECH_ROLES},
    }

    # Search filter (applied at DB level)
    list_where: dict[str, Any] = {**base_where}
    if search:
        list_where["OR"] = [
            {"name": {"contains": search}},
            {"email": {"contains": search}},
            {"phone": {"contains": search}},
            {"employeeNumber": {"contains": search}},
        ]
    if department:
        list_where["departmentId"] = department

    # Fetch all tech IDs for KPI computation
    all_techs_result = await _safe_query(
        lambda: db.query(
            "User",
            select="id,isOnline,departmentId",
            where=base_where,
        ),
        fallback={"data": []},
        label="all_tech_ids",
    )
    all_techs = all_techs_result.get("data", [])
    all_tech_ids = [t["id"] for t in all_techs]
    online_map = {t["id"]: bool(t.get("isOnline")) for t in all_techs}

    # Paginated tech list
    [count_result, technicians] = await _safe_query(
        lambda: (
            db.query(
                "User",
                select="id,name,email,phone,avatar,employeeNumber,role,departmentId,isOnline,lastLogin,department:Department(name)",
                where=list_where,
                order="createdAt.desc",
                offset=offset,
                limit=page_size,
                count="exact",
            )
        ),
        fallback=({"count": "0"}, []),
        label="tech_list",
    )

    if not isinstance(count_result, dict) and not isinstance(technicians, list):
        # _safe_query returned the fallback tuple
        count_result = {"count": "0"}
        technicians = []

    # Unpack properly
    if isinstance(count_result, dict) and "data" in count_result and not technicians:
        technicians = count_result.get("data", [])

    count_str = count_result.get("count", "0") if isinstance(count_result, dict) else "0"
    try:
        total = int(count_str) if count_str != "*" else 0
    except (ValueError, TypeError):
        total = 0

    page_tech_ids = [t["id"] for t in technicians if isinstance(t, dict)]

    # ── Parallel enrichment queries ─────────────────────────────────────
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    today_end = today_end_dt.isoformat()

    # 1. On-leave check
    leave_map: dict[str, dict] = {}
    if all_tech_ids:
        leave_result = await _safe_query(
            lambda: db.query(
                "LeaveRequest",
                select="userId,type",
                where={
                    "userId": {"in": all_tech_ids},
                    "status": "APPROVED",
                    "startDate": {"lte": now.isoformat()},
                    "endDate": {"gte": now.isoformat()},
                },
            ),
            fallback={"data": []},
            label="leave_check",
        )
        for l in leave_result.get("data", []):
            uid = l.get("userId")
            if uid and uid not in leave_map:
                leave_map[uid] = {"onLeave": True, "type": l.get("type")}

    # 2. Emergency complaints (active high/critical)
    emergency_map: dict[str, int] = {}
    if all_tech_ids:
        emergency_result = await _safe_query(
            lambda: db.query(
                "Complaint",
                select="assignedToId",
                where={
                    "assignedToId": {"in": all_tech_ids},
                    "status": "IN_PROGRESS",
                    "priority": {"in": ["critical", "high"]},
                },
            ),
            fallback={"data": []},
            label="emergency_count",
        )
        for row in emergency_result.get("data", []):
            uid = row.get("assignedToId")
            if uid:
                emergency_map[uid] = emergency_map.get(uid, 0) + 1

    # 3. Active complaints per page tech
    active_complaints: list[dict] = []
    if page_tech_ids:
        active_complaints = await _safe_query(
            lambda: db.query(
                "Complaint",
                select="id,title,status,priority,category,customerId,assignedToId,assignedAt,createdAt",
                where={
                    "assignedToId": {"in": page_tech_ids},
                    "status": {"in": ACTIVE_COMPLAINT_STATUSES},
                },
            ),
            fallback=[],
            label="active_complaints",
        )

    # Build per-tech active complaint map
    complaints_by_tech: dict[str, list] = {}
    for c in active_complaints:
        uid = c.get("assignedToId")
        if uid:
            complaints_by_tech.setdefault(uid, []).append(c)

    # 4. Active work orders per page tech
    active_wos: list[dict] = []
    if page_tech_ids:
        active_wos = await _safe_query(
            lambda: db.query(
                "WorkOrder",
                select="id,title,status,assignedToId",
                where={
                    "assignedToId": {"in": page_tech_ids},
                    "status": {"in": ACTIVE_WO_STATUSES},
                },
            ),
            fallback=[],
            label="active_work_orders",
        )

    wos_by_tech: dict[str, list] = {}
    for wo in active_wos:
        uid = wo.get("assignedToId")
        if uid:
            wos_by_tech.setdefault(uid, []).append(wo)

    # 5. All active jobs count (for KPI stats across ALL techs)
    all_active_jobs_map: dict[str, int] = {}
    if all_tech_ids:
        all_active_result = await _safe_query(
            lambda: db.query(
                "Complaint",
                select="assignedToId",
                where={
                    "assignedToId": {"in": all_tech_ids},
                    "status": {"in": ACTIVE_COMPLAINT_STATUSES},
                },
            ),
            fallback={"data": []},
            label="all_active_jobs",
        )
        for row in all_active_result.get("data", []):
            uid = row.get("assignedToId")
            if uid:
                all_active_jobs_map[uid] = all_active_jobs_map.get(uid, 0) + 1

    # 6. Completed stats (for page techs)
    completed_map: dict[str, dict] = {}
    if page_tech_ids:
        completed_result = await _safe_query(
            lambda: db.query(
                "Complaint",
                select="assignedToId,startedAt,completedAt",
                where={
                    "assignedToId": {"in": page_tech_ids},
                    "status": {"in": CLOSED_STATUSES},
                    "startedAt": {"isNotNull": True},
                    "completedAt": {"isNotNull": True},
                },
            ),
            fallback=[],
            label="completed_stats",
        )
        for r in completed_result:
            uid = r.get("assignedToId")
            if not uid:
                continue
            started = r.get("startedAt")
            completed = r.get("completedAt")
            if uid not in completed_map:
                completed_map[uid] = {"count": 0, "totalMs": 0}
            completed_map[uid]["count"] += 1
            if started and completed:
                try:
                    ms = (datetime.fromisoformat(completed) - datetime.fromisoformat(started)).total_seconds() * 1000
                    completed_map[uid]["totalMs"] += ms
                except (ValueError, TypeError):
                    pass

    # 7. Skills (distinct complaint categories for page techs)
    skill_map: dict[str, list[str]] = {}
    if page_tech_ids:
        skills_result = await _safe_query(
            lambda: db.query(
                "Complaint",
                select="assignedToId,category",
                where={
                    "assignedToId": {"in": page_tech_ids},
                    "category": {"isNotNull": True},
                },
                limit=5000,
            ),
            fallback=[],
            label="skills",
        )
        for r in skills_result.get("data", []):
            uid = r.get("assignedToId")
            cat = r.get("category")
            if uid and cat and cat.strip():
                skill_map.setdefault(uid, set())
                skill_map[uid].add(cat)

    # 8. Today completed per page tech
    today_completed_map: dict[str, int] = {}
    if page_tech_ids:
        today_comp_result = await _safe_query(
            lambda: db.query(
                "Complaint",
                select="assignedToId",
                where={
                    "assignedToId": {"in": page_tech_ids},
                    "status": {"in": CLOSED_STATUSES},
                    "completedAt": {"gte": today_start, "lte": today_end},
                },
            ),
            fallback={"data": []},
            label="today_completed",
        )
        for r in today_comp_result.get("data", []):
            uid = r.get("assignedToId")
            if uid:
                today_completed_map[uid] = today_completed_map.get(uid, 0) + 1

    # 9. Today attendance per page tech
    attendance_map: dict[str, dict] = {}
    if page_tech_ids:
        att_result = await _safe_query(
            lambda: db.query(
                "Attendance",
                select="userId,hoursWorked,checkIn,checkOut,status",
                where={
                    "userId": {"in": page_tech_ids},
                    "date": {"gte": today_start, "lte": today_end},
                },
            ),
            fallback={"data": []},
            label="attendance",
        )
        for r in att_result.get("data", []):
            uid = r.get("userId")
            if uid:
                attendance_map[uid] = {
                    "hoursWorked": r.get("hoursWorked"),
                    "status": r.get("status"),
                }

    # ── Compute KPI stats (using ALL techs) ────────────────────────────
    kpi = {"totalTechnicians": len(all_tech_ids), "activeCount": 0,
           "inactiveCount": 0, "availableCount": 0, "busyCount": 0,
           "onLeaveCount": 0, "offlineCount": 0, "emergencyCount": 0}

    for tid in all_tech_ids:
        on_leave = leave_map.get(tid, {}).get("onLeave", False)
        has_emergency = (emergency_map.get(tid, 0) or 0) > 0
        active_jobs = all_active_jobs_map.get(tid, 0)
        is_online = online_map.get(tid, False)
        avail = _compute_availability(on_leave, has_emergency, active_jobs, is_online)
        if avail == "on_leave":
            kpi["onLeaveCount"] += 1
        elif avail == "emergency":
            kpi["emergencyCount"] += 1
        elif avail == "busy":
            kpi["busyCount"] += 1
        elif avail == "available":
            kpi["availableCount"] += 1
        else:
            kpi["offlineCount"] += 1
    kpi["activeCount"] = len(all_tech_ids)

    # ── Enrich paginated technicians ────────────────────────────────────
    enriched = []
    for t in technicians:
        if not isinstance(t, dict):
            continue
        tid = t["id"]
        dept = t.pop("department", None)

        on_leave = leave_map.get(tid, {}).get("onLeave", False)
        leave_type = leave_map.get(tid, {}).get("type")
        has_emergency = (emergency_map.get(tid, 0) or 0) > 0
        tech_complaints = complaints_by_tech.get(tid, [])
        tech_wos = wos_by_tech.get(tid, [])
        active_jobs = len(tech_complaints)

        comp = completed_map.get(tid, {})
        comp_count = comp.get("count", 0)
        comp_ms = comp.get("totalMs", 0)
        avg_hours = None
        if comp_count > 0 and comp_ms > 0:
            avg_hours = round((comp_ms / comp_count) / 3_600_000, 1)

        skills = list(skill_map.get(tid, set()))[:8]
        avail_status = _compute_availability(on_leave, has_emergency, active_jobs, bool(t.get("isOnline")))

        first_complaint = tech_complaints[0] if tech_complaints else None
        first_wo = tech_wos[0] if tech_wos else None

        att = attendance_map.get(tid, {})

        enriched.append({
            "id": tid,
            "name": t.get("name"),
            "email": t.get("email"),
            "phone": t.get("phone"),
            "avatar": t.get("avatar"),
            "employeeNumber": t.get("employeeNumber"),
            "role": t.get("role"),
            "departmentId": t.get("departmentId"),
            "departmentName": (dept or {}).get("name") if dept else None,
            "isOnline": bool(t.get("isOnline")),
            "availabilityStatus": avail_status,
            "activeJobs": active_jobs,
            "activeWorkOrders": len(tech_wos),
            "maxJobs": MAX_ACTIVE_JOBS,
            "workloadPercent": round((active_jobs / MAX_ACTIVE_JOBS) * 100),
            "currentComplaint": {
                "id": first_complaint["id"],
                "title": first_complaint.get("title"),
                "status": first_complaint.get("status"),
                "priority": first_complaint.get("priority"),
                "category": first_complaint.get("category"),
                "assignedAt": _to_iso(first_complaint.get("assignedAt")),
            } if first_complaint else None,
            "currentWorkOrder": {
                "id": first_wo["id"],
                "title": first_wo.get("title"),
                "status": first_wo.get("status"),
            } if first_wo else None,
            "avgCompletionHours": avg_hours,
            "totalCompleted": comp_count,
            "skills": skills,
            "onLeave": on_leave,
            "leaveType": leave_type,
            "completedToday": today_completed_map.get(tid, 0),
            "hoursWorkedToday": att.get("hoursWorked") if att else None,
            "lastLogin": _to_iso(t.get("lastLogin")),
            # Sort helpers
            "_name": t.get("name", ""),
            "_availabilityOrder": {
                "emergency": 0, "busy": 1, "available": 2, "offline": 3, "on_leave": 4,
            }.get(avail_status, 5),
            "_activeJobs": active_jobs,
            "_isOnline": bool(t.get("isOnline")),
            "_lastLogin": t.get("lastLogin"),
        })

    # ── Post-filter by availability status ──────────────────────────────
    if status:
        enriched = [t for t in enriched if t.get("availabilityStatus") == status]

    # ── Post-filter by skill ────────────────────────────────────────────
    if skill:
        skill_lower = skill.lower()
        enriched = [t for t in enriched if any(s.lower().find(skill_lower) >= 0 for s in t.get("skills", []))]

    # ── Sort ────────────────────────────────────────────────────────────
    def _sort_key(t: dict) -> tuple:
        name = t.get("_name", "")
        avail_order = t.get("_availabilityOrder", 5)
        active = t.get("_activeJobs", 0)
        is_online = 1 if t.get("_isOnline") else 0
        last_login = t.get("_lastLogin")

        if sort_by == "availability":
            return (avail_order, active, name)
        elif sort_by == "workload":
            return (active, -is_online, name)
        elif sort_by == "recently_active":
            login_ts = 0
            if last_login:
                try:
                    login_ts = datetime.fromisoformat(last_login).timestamp() if isinstance(last_login, str) else 0
                except (ValueError, TypeError):
                    pass
            return (-login_ts,)
        else:  # name (default)
            return (name,)

    enriched.sort(key=_sort_key)

    # Strip internal sort keys
    result = []
    for t in enriched:
        t.pop("_name", None)
        t.pop("_availabilityOrder", None)
        t.pop("_activeJobs", None)
        t.pop("_isOnline", None)
        t.pop("_lastLogin", None)
        result.append(t)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "stats": kpi,
        "technicians": result,
        "pagination": {"page": page, "pageSize": page_size, "total": total, "totalPages": total_pages},
    }


# ── Available Technicians ─────────────────────────────────────────────────


async def get_available_technicians(
    tenant_id: str,
    department: str = "",
    search: str = "",
) -> list[dict[str, Any]]:
    """Get technicians available for assignment (not on leave, not at max capacity).

    Matches: GET /api/technicians/available
    Returns: { technicians: [...] }
    """
    result = await list_technicians(
        tenant_id=tenant_id,
        page=1,
        page_size=50,
        search=search,
        department=department,
        status="available",
    )
    return result


# ── Technician Detail ─────────────────────────────────────────────────────


async def get_technician(
    tenant_id: str,
    tech_id: str,
) -> dict[str, Any]:
    """Get a single technician's full detail.

    Matches: GET /api/technicians/{id}
    Returns flat object with activeComplaints, activeWorkOrders, performance, etc.
    """
    db: AsyncSupabaseClient = get_supabase()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    today_end = today_end_dt.isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Fetch technician
    tech_result = await _safe_query(
        lambda: db.query(
            "User",
            select="id,name,email,phone,avatar,employeeNumber,role,departmentId,isOnline,lastLogin,gpsLocation,profileCompleted,createdAt,updatedAt",
            where={"id": tech_id, "tenantId": tenant_id, "isActive": True, "role": {"in": TECH_ROLES}},
            single=True,
        ),
        fallback=None,
        label="tech_detail",
    )
    tech = tech_result.get("data") if isinstance(tech_result, dict) else None
    if isinstance(tech, list):
        tech = tech[0] if tech else None
    if not tech:
        raise NotFoundException(resource="Technician")

    # Fetch department
    dept = None
    dept_head_name = None
    if tech.get("departmentId"):
        dept_result = await _safe_query(
            lambda: db.query(
                "Department",
                select="id,name,description,headId",
                where={"id": tech["departmentId"], "tenantId": tenant_id},
                single=True,
            ),
            fallback=None,
            label="tech_dept",
        )
        dept = dept_result.get("data") if isinstance(dept_result, dict) else None
        if isinstance(dept, list):
            dept = dept[0] if dept else None
        if dept and dept.get("headId"):
            head_result = await _safe_query(
                lambda: db.query("User", select="name", where={"id": dept["headId"], "tenantId": tenant_id}, single=True),
                fallback=None,
                label="tech_dept_head",
            )
            head_data = head_result.get("data") if isinstance(head_result, dict) else None
            if isinstance(head_data, list):
                head_data = head_data[0] if head_data else None
            dept_head_name = head_data.get("name") if head_data else None

    # Parallel enrichment queries
    tech_complaint_ids_result = await _safe_query(
        lambda: db.query("Complaint", select="id", where={"assignedToId": tech_id, "tenantId": tenant_id}),
        fallback={"data": []},
        label="tech_complaint_ids",
    )
    tech_complaint_ids = [r["id"] for r in tech_complaint_ids_result.get("data", [])]

    [active_complaints, active_wos, today_attendance, today_timeline, monthly_completed, monthly_avg_time, ratings, stock_movements, leave_history, current_leave] = await _safe_query(
        lambda: (
            _safe_query(
                lambda: db.query(
                    "Complaint",
                    select="id,title,description,status,priority,category,assignedAt,acceptedAt,startedAt,createdAt,customerId,equipmentId",
                    where={"assignedToId": tech_id, "tenantId": tenant_id, "status": {"in": ACTIVE_COMPLAINT_STATUSES}},
                    order="priority.desc",
                ),
                fallback=[],
                label="tech_active_complaints",
            ),
            _safe_query(
                lambda: db.query(
                    "WorkOrder",
                    select="id,workOrderNumber,title,description,status,priority,type,scheduledDate,dueDate,startedAt,laborHours,totalCost,customerId",
                    where={"assignedToId": tech_id, "tenantId": tenant_id, "status": {"in": ACTIVE_WO_STATUSES}},
                    order="priority.desc",
                ),
                fallback=[],
                label="tech_active_wos",
            ),
            _safe_query(
                lambda: db.query(
                    "Attendance",
                    select="id,date,checkIn,checkOut,hoursWorked,status,checkInGps,checkOutGps",
                    where={"userId": tech_id, "tenantId": tenant_id, "date": {"gte": today_start, "lte": today_end}},
                    single=True,
                ),
                fallback=None,
                label="tech_attendance",
            ),
            _safe_query(
                lambda: db.query(
                    "ComplaintTimeline",
                    select="id,complaintId,action,fromStatus,toStatus,description,performedBy,performedByRole,createdAt",
                    where={"complaintId": {"in": tech_complaint_ids}, "createdAt": {"gte": today_start, "lte": today_end}},
                    order="createdAt.asc",
                ) if tech_complaint_ids else {"data": []},
                fallback=[],
                label="tech_timeline",
            ),
            _safe_query(
                lambda: db.count("Complaint", where={"assignedToId": tech_id, "tenantId": tenant_id, "status": {"in": CLOSED_STATUSES}, "completedAt": {"gte": month_start}}),
                fallback=0,
                label="tech_monthly_completed",
            ),
            None,  # monthly_avg_time computed below
            _safe_query(
                lambda: db.query(
                    "Complaint",
                    select="id,customerRating,customerFeedback",
                    where={"assignedToId": tech_id, "tenantId": tenant_id, "customerRating": {"isNotNull": True}},
                    limit=50,
                ),
                fallback=[],
                label="tech_ratings",
            ),
            _safe_query(
                lambda: db.query(
                    "StockMovement",
                    select="id,itemId,quantity,unitCost,reason,referenceNo,referenceType,createdAt",
                    where={"performedBy": tech_id, "tenantId": tenant_id, "type": "stock_out"},
                    order="createdAt.desc",
                    limit=20,
                ),
                fallback=[],
                label="tech_stock",
            ),
            _safe_query(
                lambda: db.query(
                    "LeaveRequest",
                    select="id,type,startDate,endDate,days,reason,status,approvedBy,approvedAt,createdAt",
                    where={"userId": tech_id, "tenantId": tenant_id},
                    order="createdAt.desc",
                    limit=10,
                ),
                fallback=[],
                label="tech_leave",
            ),
            _safe_query(
                lambda: db.query(
                    "LeaveRequest",
                    select="id,type,startDate,endDate,reason",
                    where={"userId": tech_id, "tenantId": tenant_id, "status": "APPROVED", "startDate": {"lte": now.isoformat()}, "endDate": {"gte": now.isoformat()}},
                    single=True,
                ),
                fallback=None,
                label="tech_current_leave",
            ),
        ),
        fallback=([], [], None, [], 0, None, [], [], [], None),
        label="tech_parallel",
    )

    # Compute monthly avg time
    completed_with_timing = await _safe_query(
        lambda: db.query(
            "Complaint",
            select="startedAt,completedAt",
            where={"assignedToId": tech_id, "tenantId": tenant_id, "status": {"in": CLOSED_STATUSES}, "startedAt": {"isNotNull": True}, "completedAt": {"isNotNull": True, "gte": month_start}},
        ),
        fallback=[],
        label="tech_avg_time",
    )
    monthly_avg_time = None
    if completed_with_timing:
        rows = completed_with_timing if isinstance(completed_with_timing, list) else completed_with_timing.get("data", [])
        total_ms = 0
        valid = 0
        for r in rows:
            s = r.get("startedAt")
            c = r.get("completedAt")
            if s and c:
                try:
                    total_ms += (datetime.fromisoformat(c) - datetime.fromisoformat(s)).total_seconds() * 1000
                    valid += 1
                except (ValueError, TypeError):
                    pass
        if valid > 0:
            monthly_avg_time = round((total_ms / valid) / 3_600_000, 1)

    # Ratings avg
    ratings_with_values = [r for r in (ratings or []) if r.get("customerRating") is not None]
    avg_rating = None
    if ratings_with_values:
        avg_rating = round(sum(r.get("customerRating", 0) for r in ratings_with_values) / len(ratings_with_values), 1)

    return {
        "id": tech["id"],
        "name": tech.get("name"),
        "email": tech.get("email"),
        "phone": tech.get("phone"),
        "avatar": tech.get("avatar"),
        "employeeNumber": tech.get("employeeNumber"),
        "role": tech.get("role"),
        "isOnline": tech.get("isOnline"),
        "gpsLocation": tech.get("gpsLocation"),
        "profileCompleted": tech.get("profileCompleted"),
        "createdAt": _to_iso(tech.get("createdAt")),
        "updatedAt": _to_iso(tech.get("updatedAt")),
        "lastLogin": _to_iso(tech.get("lastLogin")),
        "department": {
            "id": dept.get("id"), "name": dept.get("name"),
            "description": dept.get("description"), "headName": dept_head_name,
        } if dept else None,
        "activeComplaints": active_complaints if isinstance(active_complaints, list) else [],
        "activeWorkOrders": active_wos if isinstance(active_wos, list) else [],
        "todayAttendance": today_attendance if isinstance(today_attendance, dict) else None,
        "todayTimeline": today_timeline if isinstance(today_timeline, list) else [],
        "performance": {
            "completedThisMonth": monthly_completed if isinstance(monthly_completed, int) else 0,
            "avgCompletionTimeHours": monthly_avg_time,
            "totalRatingsReceived": len(ratings_with_values),
            "averageRating": avg_rating,
        },
        "inventoryIssued": stock_movements if isinstance(stock_movements, list) else [],
        "leaveHistory": leave_history if isinstance(leave_history, list) else [],
        "onLeave": bool(current_leave),
        "currentLeave": current_leave if isinstance(current_leave, dict) else None,
    }


# ── Technician Timeline ───────────────────────────────────────────────────


async def get_technician_timeline(
    tenant_id: str,
    tech_id: str,
) -> dict[str, Any]:
    """Get today's activity timeline for a technician.

    Matches: GET /api/technicians/{id}/timeline
    Returns: { technicianId, technicianName, date, attendance, timeline, summary }
    """
    db: AsyncSupabaseClient = get_supabase()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_iso = today_start.isoformat()
    today_end_iso = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()

    # Verify technician
    tech_result = await _safe_query(
        lambda: db.query(
            "User",
            select="id,name",
            where={"id": tech_id, "tenantId": tenant_id, "isActive": True, "role": {"in": TECH_ROLES}},
            single=True,
        ),
        fallback=None,
        label="timeline_tech_check",
    )
    tech = tech_result.get("data") if isinstance(tech_result, dict) else None
    if isinstance(tech, list):
        tech = tech[0] if tech else None
    if not tech:
        raise NotFoundException(resource="Technician")

    # Get complaint IDs
    comp_ids_result = await _safe_query(
        lambda: db.query("Complaint", select="id", where={"assignedToId": tech_id, "tenantId": tenant_id}),
        fallback={"data": []},
        label="timeline_comp_ids",
    )
    comp_ids = [r["id"] for r in comp_ids_result.get("data", [])]

    # Parallel: attendance + timeline
    [attendance, timeline_entries] = await _safe_query(
        lambda: (
            _safe_query(
                lambda: db.query(
                    "Attendance",
                    select="id,checkIn,checkOut,status,hoursWorked",
                    where={"userId": tech_id, "tenantId": tenant_id, "date": {"gte": today_start_iso, "lte": today_end_iso}},
                    single=True,
                ),
                fallback=None,
                label="timeline_attendance",
            ),
            _safe_query(
                lambda: db.query(
                    "ComplaintTimeline",
                    select="id,complaintId,action,fromStatus,toStatus,description,performedBy,performedByRole,createdAt",
                    where={"complaintId": {"in": comp_ids}, "createdAt": {"gte": today_start_iso, "lte": today_end_iso}},
                    order="createdAt.asc",
                ) if comp_ids else {"data": []},
                fallback=[],
                label="timeline_entries",
            ),
        ),
        fallback=(None, []),
        label="timeline_parallel",
    )

    # Build timeline
    timeline: list[dict] = []

    if isinstance(attendance, dict) and attendance.get("checkIn"):
        timeline.append({
            "time": _to_iso(attendance["checkIn"]),
            "actionType": "check_in",
            "description": f"Checked in{' (late)' if attendance.get('status') == 'late' else ''}",
            "entityId": attendance.get("id"),
            "entityType": "attendance",
            "metadata": {"status": attendance.get("status"), "hoursWorked": attendance.get("hoursWorked")},
        })

    # Action descriptions
    action_descs = {
        "created": lambda c: f"New complaint created: {c}",
        "assigned": lambda c: f"Assigned to complaint: {c}",
        "accepted": lambda c: f"Accepted complaint: {c}",
        "started": lambda c: f"Started work on: {c}",
        "completed": lambda c: f"Completed work on: {c}",
        "closed": lambda c: f"Complaint closed: {c}",
    }

    for entry in (timeline_entries or []):
        if not isinstance(entry, dict):
            continue
        action = entry.get("action", "")
        desc_fn = action_descs.get(action)
        description = desc_fn("Unknown Complaint") if desc_fn else (entry.get("description") or f"{action}: Unknown Complaint")
        timeline.append({
            "time": _to_iso(entry.get("createdAt")),
            "actionType": action,
            "description": description,
            "entityId": entry.get("complaintId"),
            "entityType": "complaint",
            "metadata": {
                "performedBy": entry.get("performedBy"),
                "performedByRole": entry.get("performedByRole"),
                "fromStatus": entry.get("fromStatus"),
                "toStatus": entry.get("toStatus"),
            },
        })

    if isinstance(attendance, dict) and attendance.get("checkOut"):
        timeline.append({
            "time": _to_iso(attendance["checkOut"]),
            "actionType": "check_out",
            "description": "Checked out",
            "entityId": attendance.get("id"),
            "entityType": "attendance",
            "metadata": {"status": attendance.get("status"), "hoursWorked": attendance.get("hoursWorked")},
        })

    # Sort chronologically
    timeline.sort(key=lambda x: x.get("time") or "")

    return {
        "technicianId": tech_id,
        "technicianName": tech.get("name"),
        "date": today_start.strftime("%Y-%m-%d"),
        "attendance": {
            "checkIn": _to_iso(attendance.get("checkIn")) if isinstance(attendance, dict) else None,
            "checkOut": _to_iso(attendance.get("checkOut")) if isinstance(attendance, dict) else None,
            "hoursWorked": attendance.get("hoursWorked") if isinstance(attendance, dict) else None,
            "status": attendance.get("status") if isinstance(attendance, dict) else None,
        },
        "timeline": timeline,
        "summary": {
            "totalActivities": len(timeline),
            "checkIns": sum(1 for t in timeline if t["actionType"] == "check_in"),
            "checkOuts": sum(1 for t in timeline if t["actionType"] == "check_out"),
            "complaintActivities": sum(1 for t in timeline if t["entityType"] == "complaint"),
        },
    }


# ── Technician Performance ────────────────────────────────────────────────


async def get_technician_performance(
    tenant_id: str,
    tech_id: str,
) -> dict[str, Any]:
    """Get performance metrics for a single technician.

    Matches: GET /api/technicians/{id}/performance
    Returns comprehensive performance object.
    """
    db: AsyncSupabaseClient = get_supabase()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()

    # Week start (Monday)
    week_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_of_week = week_start.weekday()
    if day_of_week != 0:  # Not Monday
        week_start = week_start.replace(day=week_start.day - day_of_week)
    week_start_iso = week_start.isoformat()

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_start_iso = month_start.isoformat()
    month_end = now.replace(day=28)  # Safe upper bound
    while month_end.month == now.month:
        month_end = month_end.replace(day=month_end.day + 1)
    month_end_iso = month_end.isoformat()

    # Verify technician
    tech_result = await _safe_query(
        lambda: db.query(
            "User",
            select="id,name",
            where={"id": tech_id, "tenantId": tenant_id, "isActive": True, "role": {"in": TECH_ROLES}},
            single=True,
        ),
        fallback=None,
        label="perf_tech_check",
    )
    tech = tech_result.get("data") if isinstance(tech_result, dict) else None
    if isinstance(tech, list):
        tech = tech[0] if tech else None
    if not tech:
        raise NotFoundException(resource="Technician")

    # Complaint IDs assigned to this tech
    comp_ids_result = await _safe_query(
        lambda: db.query("Complaint", select="id", where={"assignedToId": tech_id, "tenantId": tenant_id}),
        fallback={"data": []},
        label="perf_comp_ids",
    )
    comp_ids = [r["id"] for r in comp_ids_result.get("data", [])]

    # Work order IDs linked to those complaints
    wo_ids: list[str] = []
    if comp_ids:
        wo_result = await _safe_query(
            lambda: db.query("WorkOrder", select="id", where={"complaintId": {"in": comp_ids}, "tenantId": tenant_id}),
            fallback={"data": []},
            label="perf_wo_ids",
        )
        wo_ids = [r["id"] for r in wo_result.get("data", [])]

    # Also WOs directly assigned
    direct_wo_result = await _safe_query(
        lambda: db.query("WorkOrder", select="id", where={"assignedToId": tech_id, "tenantId": tenant_id}),
        fallback={"data": []},
        label="perf_direct_wo_ids",
    )
    all_wo_ids = list(set(wo_ids + [r["id"] for r in direct_wo_result.get("data", [])]))

    # Parallel queries
    def _count_complaint(where_extra: dict) -> int:
        r = _safe_query(
            lambda: db.query("Complaint", select="id", where={"assignedToId": tech_id, "tenantId": tenant_id, **where_extra}, count="exact", limit=1),
            fallback={"count": "0"},
            label="perf_count",
        )
        cs = r.get("count", "0")
        try:
            return int(cs) if cs != "*" else 0
        except (ValueError, TypeError):
            return 0

    all_time_completed = _count_complaint({"status": {"in": CLOSED_STATUSES}})
    monthly_completed = _count_complaint({"status": {"in": CLOSED_STATUSES}, "completedAt": {"gte": month_start_iso, "lte": month_end_iso}})
    weekly_completed = _count_complaint({"status": {"in": CLOSED_STATUSES}, "completedAt": {"gte": week_start_iso}})
    today_completed = _count_complaint({"status": {"in": CLOSED_STATUSES}, "completedAt": {"gte": today_start, "lte": today_end}})
    pending_count = _count_complaint({"status": {"in": ACTIVE_COMPLAINT_STATUSES}})
    cancelled_count = _count_complaint({"status": "CANCELLED"})

    # SLA complaints
    sla_complaints = await _safe_query(
        lambda: db.query(
            "Complaint",
            select="id,priority,assignedAt,completedAt",
            where={"assignedToId": tech_id, "tenantId": tenant_id, "status": {"in": CLOSED_STATUSES}, "assignedAt": {"isNotNull": True}, "completedAt": {"isNotNull": True}},
        ),
        fallback=[],
        label="perf_sla",
    )

    sla_thresholds = {"critical": 4, "high": 8, "medium": 24, "low": 48}
    sla_compliant = 0
    sla_total = 0
    for c in (sla_complaints or []):
        a = c.get("assignedAt")
        c2 = c.get("completedAt")
        if a and c2:
            try:
                hours = (datetime.fromisoformat(c2) - datetime.fromisoformat(a)).total_seconds() / 3600
                threshold = sla_thresholds.get(c.get("priority", "low"), 48)
                if hours <= threshold:
                    sla_compliant += 1
                sla_total += 1
            except (ValueError, TypeError):
                pass

    sla_pct = round((sla_compliant / sla_total) * 100, 1) if sla_total > 0 else None

    # Ratings
    ratings = await _safe_query(
        lambda: db.query("Complaint", select="id,customerRating", where={"assignedToId": tech_id, "tenantId": tenant_id, "customerRating": {"isNotNull": True}}),
        fallback=[],
        label="perf_ratings",
    )
    ratings_arr = ratings.get("data", []) if isinstance(ratings, dict) else (ratings or [])
    avg_rating = None
    if ratings_arr:
        vals = [r.get("customerRating", 0) for r in ratings_arr if r.get("customerRating") is not None]
        avg_rating = round(sum(vals) / len(vals), 1) if vals else None

    # Rework
    rework_ids_result = await _safe_query(
        lambda: db.query("ComplaintTimeline", select="complaintId", where={"complaintId": {"in": comp_ids}, "action": "rework_required"}, limit=1000) if comp_ids else {"data": []},
        fallback={"data": []},
        label="perf_rework",
    )
    rework_ids = set(r.get("complaintId") for r in rework_ids_result.get("data", []) if r.get("complaintId"))
    rework_count = len(rework_ids)
    total_closed = all_time_completed
    first_time_fix = total_closed - rework_count
    ftfr = round((first_time_fix / total_closed) * 100, 1) if total_closed > 0 else None
    rework_rate = round((rework_count / total_closed) * 100, 1) if total_closed > 0 else None

    # Attendance
    monthly_att = await _safe_query(
        lambda: db.query(
            "Attendance",
            select="id,date,checkIn,status,hoursWorked",
            where={"userId": tech_id, "tenantId": tenant_id, "date": {"gte": month_start_iso, "lte": month_end_iso}},
        ),
        fallback=[],
        label="perf_attendance",
    )
    att_arr = monthly_att.get("data", []) if isinstance(monthly_att, dict) else (monthly_att or [])
    present_days = sum(1 for a in att_arr if a.get("status") in ("present", "late"))

    # Count working days in month (exclude weekends)
    working_days = 0
    d = month_start
    while d.month == now.month:
        if d.weekday() < 5:  # Mon-Fri
            working_days += 1
        d = d.replace(day=d.day + 1)

    att_pct = round((present_days / working_days) * 100, 1) if working_days > 0 else None

    punctual_days = 0
    for a in att_arr:
        ci = a.get("checkIn")
        if ci:
            try:
                ci_dt = datetime.fromisoformat(ci)
                if ci_dt.hour < 9 or (ci_dt.hour == 9 and ci_dt.minute == 0):
                    punctual_days += 1
            except (ValueError, TypeError):
                pass
    punctuality = round((punctual_days / working_days) * 100, 1) if working_days > 0 else None

    # Avg completion time
    all_completed = await _safe_query(
        lambda: db.query(
            "Complaint",
            select="startedAt,completedAt",
            where={"assignedToId": tech_id, "tenantId": tenant_id, "status": {"in": CLOSED_STATUSES}, "startedAt": {"isNotNull": True}, "completedAt": {"isNotNull": True}},
        ),
        fallback=[],
        label="perf_avg_completion",
    )
    avg_completion = None
    total_ms = 0
    valid = 0
    for r in (all_completed or []):
        s = r.get("startedAt")
        c = r.get("completedAt")
        if s and c:
            try:
                total_ms += (datetime.fromisoformat(c) - datetime.fromisoformat(s)).total_seconds() * 1000
                valid += 1
            except (ValueError, TypeError):
                pass
    if valid > 0:
        avg_completion = round((total_ms / valid) / 3_600_000, 1)

    # Revenue from invoices
    revenue = 0
    inv_count = 0
    if all_wo_ids:
        inv_result = await _safe_query(
            lambda: db.query(
                "Invoice",
                select="id,total,status",
                where={"tenantId": tenant_id, "workOrderId": {"in": all_wo_ids}, "status": {"in": ["PAID", "APPROVED", "PENDING"]}},
            ),
            fallback=[],
            label="perf_revenue",
        )
        invs = inv_result.get("data", []) if isinstance(inv_result, dict) else (inv_result or [])
        inv_count = len(invs)
        revenue = sum(i.get("total", 0) or 0 for i in invs)

    return {
        "technicianId": tech_id,
        "technicianName": tech.get("name"),
        "completedJobs": {
            "allTime": all_time_completed,
            "thisMonth": monthly_completed,
            "thisWeek": weekly_completed,
            "today": today_completed,
        },
        "pendingJobs": pending_count,
        "cancelledJobs": cancelled_count,
        "slaCompliance": {
            "compliant": sla_compliant,
            "total": sla_total,
            "percentage": sla_pct,
        },
        "customerSatisfaction": {
            "totalRatings": len(ratings_arr),
            "averageRating": avg_rating,
        },
        "quality": {
            "firstTimeFixRate": ftfr,
            "reworkRate": rework_rate,
            "reworkCount": rework_count,
            "totalClosedJobs": total_closed,
        },
        "attendance": {
            "thisMonth": {
                "percentage": att_pct,
                "presentDays": present_days,
                "totalWorkingDays": working_days,
                "punctuality": punctuality,
                "punctualDays": punctual_days,
            },
        },
        "efficiency": {
            "averageCompletionTimeHours": avg_completion,
            "totalLaborHours": 0.0,
        },
        "revenue": {
            "totalGenerated": round(revenue, 2),
            "invoiceCount": inv_count,
        },
        "workOrderCosts": {
            "totalLaborCost": 0.0,
            "totalMaterialCost": 0.0,
            "completedWorkOrders": 0,
        },
    }
