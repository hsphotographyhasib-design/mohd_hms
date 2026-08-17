"""
IRMS business logic — inspection & report management system.

MOHD.HMS ENTERPRISE

Implements:
  - Dashboard statistics and KPIs
  - Analytics with monthly trends and technician performance
  - Activity feed
  - Project CRUD
  - Report CRUD with auto-numbering
  - Photo management (single, bulk, reorder)
  - Revision history and rollback
  - Approval workflow (advance/reject)
  - Digital signatures
  - PDF generation (stub)
  - Inspection template CRUD with checklist items
  - IRM user management
  - Inspection CRUD with lifecycle and completion scoring
  - Inspection reports, dashboard-stats, and analytics
"""

import json
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
    ForbiddenException,
    InternalException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.rbac.permissions import has_action_permission, has_feature_access
from app.features.irms.schemas import STATUS_FLOW

log = get_logger(__name__)

# ── Table name constants ─────────────────────────────────────────────────────

PROJECT_TABLE = MODEL_TO_TABLE.get("irmProject", "IrmProject")
REPORT_TABLE = MODEL_TO_TABLE.get("irmReport", "IrmReport")
REVISION_TABLE = MODEL_TO_TABLE.get("irmRevision", "IrmRevision")
ACTIVITY_TABLE = MODEL_TO_TABLE.get("irmActivity", "IrmActivity")
APPROVAL_TABLE = MODEL_TO_TABLE.get("irmApproval", "IrmApproval")
PHOTO_TABLE = MODEL_TO_TABLE.get("irmPhoto", "IrmPhoto")
IRM_USER_TABLE = MODEL_TO_TABLE.get("irmUser", "IrmUser")
INSPECTION_TABLE = MODEL_TO_TABLE.get("inspection", "Inspection")
INSPECTION_TEMPLATE_TABLE = MODEL_TO_TABLE.get("inspectionTemplate", "InspectionTemplate")
INSPECTION_CHECKLIST_TABLE = MODEL_TO_TABLE.get("inspectionChecklistItem", "InspectionChecklistItem")
INSPECTION_RESULT_TABLE = MODEL_TO_TABLE.get("inspectionResult", "InspectionResult")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")

#: Photo type to prefix mapping for re-numbering
TYPE_PREFIXES = {
    "before": "B", "after": "A", "progress": "P", "defect": "D",
    "inspection": "I", "completion": "C", "final": "F", "evidence": "E",
}

#: Allowed IRMS roles (from RBAC matrix)
IRMS_ALLOWED_ROLES = {"super_admin", "admin", "manager", "supervisor", "technician"}


def _check_irms_access(user: AuthUser) -> None:
    """Verify user has IRMS feature access. Raises ForbiddenException if not."""
    if user.role not in IRMS_ALLOWED_ROLES:
        raise ForbiddenException(
            message=f"Role '{user.role}' is not authorized to access IRMS",
            details={"required_roles": sorted(IRMS_ALLOWED_ROLES), "user_role": user.role},
        )


def _check_action(user: AuthUser, entity: str, action: str) -> None:
    """Verify user has a specific IRMS action permission."""
    if not has_action_permission(user.role, entity, action):
        raise ForbiddenException(
            message=f"No permission for {entity}.{action}",
            details={"permission": f"{entity}.{action}", "user_role": user.role},
        )


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════


async def get_dashboard(user: AuthUser) -> dict[str, Any]:
    """Get IRMS dashboard statistics and summary data."""
    _check_irms_access(user)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)

    # Today's inspections
    today_where = {
        "inspectionDate": {"gte": today_start.isoformat(), "lt": tomorrow_start.isoformat()},
    }
    today_inspections = await count_records(REPORT_TABLE, today_where, tenant_id=user.tenantId)

    # Completed reports
    completed_reports = await count_records(
        REPORT_TABLE, {"status": "approved"}, tenant_id=user.tenantId,
    )

    # Pending reports
    pending_where = {"status": {"in": ["draft", "submitted", "supervisor_review", "manager_approval"]}}
    pending_reports = await count_records(REPORT_TABLE, pending_where, tenant_id=user.tenantId)

    # Overdue reports
    overdue_where = {
        "AND": [
            {"inspectionDate": {"lt": today_start.isoformat()}},
            {"status": {"neq": "approved"}},
        ],
    }
    overdue_reports = await count_records(REPORT_TABLE, overdue_where, tenant_id=user.tenantId)

    # Active projects
    active_projects = await count_records(
        PROJECT_TABLE, {"status": "active"}, tenant_id=user.tenantId,
    )

    # Active work orders (reports with workOrderNumber)
    active_work_orders = await count_records(
        REPORT_TABLE, {"workOrderNumber": {"isNotNull": True}}, tenant_id=user.tenantId,
    )

    # Total photos
    photos_uploaded = await count_records(PHOTO_TABLE, tenant_id=user.tenantId)

    # Average completion (approximate: query recent reports)
    avg_result = await query_table(
        REPORT_TABLE,
        select="completionPct",
        where={"completionPct": {"isNotNull": True}},
        limit=1000,
        tenant_id=user.tenantId,
    )
    reports_data = avg_result.get("data", [])
    if reports_data:
        total_pct = sum(r.get("completionPct", 0) for r in reports_data)
        avg_completion = round(total_pct / len(reports_data))
    else:
        avg_completion = 0

    # Recent reports
    recent_reports = await query_table(
        REPORT_TABLE,
        where={},
        order="createdAt.desc",
        limit=5,
        tenant_id=user.tenantId,
    )

    # Upcoming inspections
    upcoming_where = {"inspectionDate": {"gte": today_start.isoformat()}}
    upcoming_inspections = await query_table(
        REPORT_TABLE,
        where=upcoming_where,
        order="inspectionDate.asc",
        limit=5,
        tenant_id=user.tenantId,
    )

    # Inspection trend: last 14 days
    fourteen_days_ago = today_start - timedelta(days=13)
    trend_where = {
        "AND": [
            {"inspectionDate": {"gte": fourteen_days_ago.isoformat()}},
            {"inspectionDate": {"lt": tomorrow_start.isoformat()}},
        ],
    }
    trend_reports = await query_table(
        REPORT_TABLE,
        select="inspectionDate",
        where=trend_where,
        limit=1000,
        tenant_id=user.tenantId,
    )

    inspection_trend = []
    for i in range(13, -1, -1):
        day = today_start - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        count = sum(
            1 for r in trend_reports.get("data", [])
            if isinstance(r.get("inspectionDate"), str)
            and r["inspectionDate"].startswith(day_str)
        )
        inspection_trend.append({"date": day_str, "count": count})

    # Category breakdown
    category_reports = await query_table(
        REPORT_TABLE,
        select="workCategory",
        where={"workCategory": {"isNotNull": True}},
        limit=1000,
        tenant_id=user.tenantId,
    )
    category_counts: dict[str, int] = {}
    for r in category_reports.get("data", []):
        cat = r.get("workCategory", "unknown")
        if cat:
            category_counts[cat] = category_counts.get(cat, 0) + 1
    category_breakdown = [
        {"workCategory": k, "_count": v} for k, v in category_counts.items()
    ]

    # Project progress (active projects with report counts)
    project_data = await query_table(
        PROJECT_TABLE,
        where={"status": "active"},
        limit=100,
        tenant_id=user.tenantId,
    )
    project_progress = []
    for p in project_data.get("data", []):
        pid = p.get("id", "")
        rep_count = await count_records(REPORT_TABLE, {"projectId": pid}, tenant_id=user.tenantId)
        project_progress.append({
            "id": pid,
            "name": p.get("name", ""),
            "number": p.get("number", ""),
            "reportCount": rep_count,
            "avgCompletionPct": 0,
        })

    # Recent activities
    recent_activities = await query_table(
        ACTIVITY_TABLE,
        where={},
        order="createdAt.desc",
        limit=10,
        tenant_id=user.tenantId,
    )

    return {
        "todayInspections": today_inspections,
        "completedReports": completed_reports,
        "pendingReports": pending_reports,
        "overdueReports": overdue_reports,
        "activeProjects": active_projects,
        "activeWorkOrders": active_work_orders,
        "photosUploaded": photos_uploaded,
        "avgCompletion": avg_completion,
        "recentReports": recent_reports.get("data", []),
        "upcomingInspections": upcoming_inspections.get("data", []),
        "inspectionTrend": inspection_trend,
        "categoryBreakdown": category_breakdown,
        "projectProgress": project_progress,
        "recentActivities": recent_activities.get("data", []),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════


async def get_analytics(user: AuthUser) -> dict[str, Any]:
    """Get IRMS analytics data."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view_analytics")

    now = datetime.now(timezone.utc)
    six_months_ago = (now.replace(day=1) - timedelta(days=1)).replace(day=1) - timedelta(days=150)

    # Fetch all reports from last 6 months
    monthly_reports = await query_table(
        REPORT_TABLE,
        select="createdAt,status,completionPct,inspectorId,workCategory,priority,labourHours",
        where={"createdAt": {"gte": six_months_ago.isoformat()}},
        limit=10000,
        tenant_id=user.tenantId,
    )
    reports = monthly_reports.get("data", [])

    # Monthly trend
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = (now.month - i) % 12
        year = now.year - ((now.month - i - 1) // 12)
        month_dt = datetime(year, month_start or 12, 1)
        if month_start == 0:
            month_dt = datetime(year, 12, 1)
        month_label = month_dt.strftime("%b %Y")

        next_month = month_start + 1
        next_year = year
        if next_month > 12:
            next_month = 1
            next_year += 1

        month_str = f"{year}-{month_start:02d}"
        next_str = f"{next_year}-{next_month:02d}"

        month_items = [
            r for r in reports
            if isinstance(r.get("createdAt"), str) and (r["createdAt"].startswith(month_str) and not r["createdAt"].startswith(next_str))
        ]
        total = len(month_items)
        approved = sum(1 for r in month_items if r.get("status") == "approved")
        avg_comp = 0
        if month_items:
            avg_comp = round(sum(r.get("completionPct", 0) for r in month_items) / total)
        monthly_trend.append({
            "month": month_label,
            "total": total,
            "approved": approved,
            "avgCompletion": avg_comp,
        })

    # Status breakdown
    status_counts: dict[str, int] = {}
    for r in reports:
        s = r.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
    status_breakdown = [
        {"status": k, "_count": v} for k, v in status_counts.items()
    ]

    # Priority breakdown
    priority_counts: dict[str, int] = {}
    for r in reports:
        p = r.get("priority", "unknown")
        priority_counts[p] = priority_counts.get(p, 0) + 1
    priority_breakdown = [
        {"priority": k, "_count": v} for k, v in priority_counts.items()
    ]

    # Work category breakdown
    category_counts: dict[str, int] = {}
    for r in reports:
        c = r.get("workCategory")
        if c:
            category_counts[c] = category_counts.get(c, 0) + 1
    work_category_breakdown = [
        {"workCategory": k, "_count": v} for k, v in category_counts.items()
    ]

    # Technician performance
    all_users = await query_table(
        IRM_USER_TABLE,
        where={"role": "Inspector"},
        limit=100,
        tenant_id=user.tenantId,
    )
    technicians = all_users.get("data", [])
    technician_performance = []
    for t in technicians:
        tid = t.get("id", "")
        tech_reports = [r for r in reports if r.get("inspectorId") == tid]
        total = len(tech_reports)
        approved = sum(1 for r in tech_reports if r.get("status") == "approved")
        avg_completion = round(
            sum(r.get("completionPct", 0) for r in tech_reports) / total
        ) if total > 0 else 0
        total_hours = round(
            sum(r.get("labourHours", 0) or 0 for r in tech_reports), 1
        )
        this_month = sum(
            1 for r in tech_reports
            if isinstance(r.get("createdAt"), str) and r["createdAt"].startswith(f"{now.year}-{now.month:02d}")
        )
        technician_performance.append({
            "id": tid,
            "name": t.get("name", ""),
            "role": t.get("role", "Inspector"),
            "totalReports": total,
            "approvedReports": approved,
            "approvalRate": round((approved / total) * 100) if total > 0 else 0,
            "avgCompletion": avg_completion,
            "totalLabourHours": total_hours,
            "thisMonthReports": this_month,
        })

    # Labour hours by month
    labour_by_month = []
    for i in range(5, -1, -1):
        month_start = (now.month - i) % 12
        year = now.year - ((now.month - i - 1) // 12)
        month_str = f"{year}-{month_start:02d}" if month_start else f"{year}-12"
        month_dt = datetime(year, month_start or 12, 1)
        month_label = month_dt.strftime("%b %Y")

        month_items = [
            r for r in reports
            if isinstance(r.get("createdAt"), str) and r["createdAt"].startswith(month_str)
        ]
        hours = round(sum(r.get("labourHours", 0) or 0 for r in month_items), 1)
        labour_by_month.append({"month": month_label, "hours": hours})

    return {
        "monthlyTrend": monthly_trend,
        "statusBreakdown": status_breakdown,
        "priorityBreakdown": priority_breakdown,
        "workCategoryBreakdown": work_category_breakdown,
        "technicianPerformance": technician_performance,
        "labourByMonth": labour_by_month,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ACTIVITIES
# ═══════════════════════════════════════════════════════════════════════════════


async def list_activities(user: AuthUser) -> list[dict[str, Any]]:
    """Get recent IRMS activities."""
    _check_irms_access(user)
    result = await query_table(
        ACTIVITY_TABLE,
        where={},
        order="createdAt.desc",
        limit=50,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════


async def list_projects(
    user: AuthUser,
    q: str = "",
    status: str = "",
) -> list[dict[str, Any]]:
    """List IRM projects with search and filter."""
    _check_irms_access(user)

    where: dict[str, Any] = {}
    if q:
        where["OR"] = [
            {"name": {"contains": q}},
            {"number": {"contains": q}},
            {"customer": {"contains": q}},
        ]
    if status:
        where["status"] = status

    result = await query_table(
        PROJECT_TABLE,
        where=where,
        order="createdAt.desc",
        limit=100,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


async def create_project(user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new IRM project."""
    _check_irms_access(user)
    _check_action(user, "inspection", "create")

    data["tenantId"] = user.tenantId
    if "status" not in data:
        data["status"] = "active"

    record = await insert_record(PROJECT_TABLE, data)
    return record


async def get_project(user: AuthUser, project_id: str) -> dict[str, Any]:
    """Get a single project with its reports."""
    _check_irms_access(user)

    result = await query_table(
        PROJECT_TABLE,
        where={"id": project_id},
        tenant_id=user.tenantId,
    )
    projects = result.get("data", [])
    if not projects:
        raise NotFoundException(resource="IrmProject", message="Project not found")

    project = projects[0]

    # Get related reports
    reports_result = await query_table(
        REPORT_TABLE,
        where={"projectId": project_id},
        order="inspectionDate.desc",
        limit=100,
        tenant_id=user.tenantId,
    )
    project["reports"] = reports_result.get("data", [])
    project["reportCount"] = len(project["reports"])

    return project


async def update_project(user: AuthUser, project_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update an IRM project."""
    _check_irms_access(user)
    _check_action(user, "inspection", "update")

    # Verify project exists
    result = await query_table(
        PROJECT_TABLE, where={"id": project_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="IrmProject", message="Project not found")

    record = await update_record(PROJECT_TABLE, project_id, data)
    return record


async def delete_project(user: AuthUser, project_id: str) -> dict[str, Any]:
    """Delete an IRM project."""
    _check_irms_access(user)
    _check_action(user, "inspection", "delete")

    result = await query_table(
        PROJECT_TABLE, where={"id": project_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="IrmProject", message="Project not found")

    await delete_record(PROJECT_TABLE, project_id)
    return {"deleted": True}


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════════════════════════════


async def list_reports(
    user: AuthUser,
    q: str = "",
    status: str = "",
    priority: str = "",
    category: str = "",
    project_id: str = "",
) -> list[dict[str, Any]]:
    """List IRM reports with search and filter."""
    _check_irms_access(user)

    where: dict[str, Any] = {}
    if q:
        where["OR"] = [
            {"number": {"contains": q}},
            {"taskDescription": {"contains": q}},
            {"observation": {"contains": q}},
            {"building": {"contains": q}},
            {"room": {"contains": q}},
        ]
    if status:
        where["status"] = status
    if priority:
        where["priority"] = priority
    if project_id:
        where["projectId"] = project_id
    if category:
        where["photos"] = {"some": {"type": category}}

    result = await query_table(
        REPORT_TABLE,
        where=where,
        order="inspectionDate.desc",
        limit=200,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


async def create_report(user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new IRM report with auto-generated number."""
    _check_irms_access(user)
    _check_action(user, "inspection", "create")

    # Auto-generate report number
    count = await count_records(REPORT_TABLE, tenant_id=user.tenantId)
    year = datetime.now(timezone.utc).year
    data["number"] = f"IR-{year}-{str(count + 1).zfill(4)}"
    data["tenantId"] = user.tenantId

    report = await insert_record(REPORT_TABLE, data)

    # Create activity entry
    inspector_id = data.get("inspectorId", user.userId)
    await insert_record(ACTIVITY_TABLE, {
        "tenantId": user.tenantId,
        "type": "report_created",
        "description": f"Created inspection report {data['number']}",
        "userId": inspector_id,
        "reportId": report.get("id"),
        "projectId": data.get("projectId"),
    })

    return report


async def get_report(user: AuthUser, report_id: str) -> dict[str, Any]:
    """Get a single report with full details."""
    _check_irms_access(user)

    result = await query_table(
        REPORT_TABLE,
        where={"id": report_id},
        tenant_id=user.tenantId,
    )
    reports = result.get("data", [])
    if not reports:
        raise NotFoundException(resource="IrmReport", message="Report not found")

    report = reports[0]

    # Fetch related photos, revisions, approvals, activities
    photos = await query_table(
        PHOTO_TABLE,
        where={"reportId": report_id},
        order="sortOrder.asc",
        limit=200,
        tenant_id=user.tenantId,
    )
    report["photos"] = photos.get("data", [])

    revisions = await query_table(
        REVISION_TABLE,
        where={"reportId": report_id},
        order="version.desc",
        limit=50,
        tenant_id=user.tenantId,
    )
    report["revisions"] = revisions.get("data", [])

    approvals = await query_table(
        APPROVAL_TABLE,
        where={"reportId": report_id},
        order="createdAt.desc",
        limit=50,
        tenant_id=user.tenantId,
    )
    report["approvals"] = approvals.get("data", [])

    activities = await query_table(
        ACTIVITY_TABLE,
        where={"reportId": report_id},
        order="createdAt.desc",
        limit=50,
        tenant_id=user.tenantId,
    )
    report["activities"] = activities.get("data", [])

    return report


async def update_report(user: AuthUser, report_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update an IRM report."""
    _check_irms_access(user)
    _check_action(user, "inspection", "update")

    result = await query_table(
        REPORT_TABLE, where={"id": report_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="IrmReport", message="Report not found")

    existing = result["data"][0]
    new_status = data.pop("status", None)
    update_data = {**data}

    if new_status and existing.get("status") != new_status:
        # Save revision snapshot before status change
        version_count = await count_records(REVISION_TABLE, {"reportId": report_id}, tenant_id=user.tenantId)
        await insert_record(REVISION_TABLE, {
            "tenantId": user.tenantId,
            "reportId": report_id,
            "version": version_count + 1,
            "snapshot": json.dumps(existing),
            "note": f"Status changed from {existing.get('status')} to {new_status}",
            "userId": data.get("assessedById") or existing.get("inspectorId") or user.userId,
        })

        # Create approval record
        step_map = {
            "submitted": "supervisor_review",
            "supervisor_review": "supervisor_review",
            "manager_approval": "manager_approval",
            "approved": "manager_approval",
            "draft": "draft",
        }
        step = step_map.get(new_status, new_status)
        approval_status = "approved" if new_status == "approved" else ("rejected" if new_status == "draft" else "pending")
        await insert_record(APPROVAL_TABLE, {
            "tenantId": user.tenantId,
            "reportId": report_id,
            "step": step,
            "status": approval_status,
            "userId": data.get("assessedById") or existing.get("inspectorId") or user.userId,
            "comment": data.get("statusComment", f"Status changed to {new_status}"),
        })

        update_data["status"] = new_status

    record = await update_record(REPORT_TABLE, report_id, update_data)
    return record


async def delete_report(user: AuthUser, report_id: str) -> dict[str, Any]:
    """Delete an IRM report."""
    _check_irms_access(user)
    _check_action(user, "inspection", "delete")

    result = await query_table(
        REPORT_TABLE, where={"id": report_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="IrmReport", message="Report not found")

    await delete_record(REPORT_TABLE, report_id)
    return {"deleted": True}


# ═══════════════════════════════════════════════════════════════════════════════
# PHOTOS
# ═══════════════════════════════════════════════════════════════════════════════


async def list_photos(user: AuthUser, report_id: str) -> list[dict[str, Any]]:
    """Get all photos for a report."""
    _check_irms_access(user)

    result = await query_table(
        PHOTO_TABLE,
        where={"reportId": report_id},
        order="sortOrder.asc",
        limit=500,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


async def create_photo(user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a single photo for a report."""
    _check_irms_access(user)
    _check_action(user, "inspection", "upload_photos")

    data["tenantId"] = user.tenantId
    record = await insert_record(PHOTO_TABLE, data)
    return record


async def bulk_photo_action(
    user: AuthUser,
    report_id: str,
    action: str,
    photo_ids: list[str],
    category: str | None = None,
    room: str | None = None,
    sw_ref: str | None = None,
) -> dict[str, Any]:
    """Perform bulk photo operation (delete, move, rotate, duplicate)."""
    _check_irms_access(user)
    _check_action(user, "inspection", "upload_photos")

    if action == "delete":
        deleted_count = 0
        for pid in photo_ids:
            try:
                await delete_record(PHOTO_TABLE, pid)
                deleted_count += 1
            except NotFoundException:
                pass
        return {"deleted": deleted_count}

    elif action == "move":
        if not category and not room and not sw_ref:
            raise ValidationException(
                message="At least one of category, room, or swRef is required",
            )
        move_data: dict[str, Any] = {}
        if category:
            move_data["type"] = category
        if room:
            move_data["room"] = room
        if sw_ref:
            move_data["swRef"] = sw_ref
        updated_count = 0
        for pid in photo_ids:
            try:
                await update_record(PHOTO_TABLE, pid, move_data)
                updated_count += 1
            except NotFoundException:
                pass
        return {"updated": updated_count}

    elif action == "rotate":
        # In backend without sharp, we just return success as rotation
        # is better handled client-side or with a specialized image service
        rotated_photos = []
        for pid in photo_ids:
            result = await query_table(
                PHOTO_TABLE, where={"id": pid}, tenant_id=user.tenantId, limit=1,
            )
            photos = result.get("data", [])
            if photos:
                rotated_photos.append(photos[0])
        return rotated_photos

    elif action == "duplicate":
        duplicated = []
        for pid in photo_ids:
            result = await query_table(
                PHOTO_TABLE, where={"id": pid}, tenant_id=user.tenantId, limit=1,
            )
            photos = result.get("data", [])
            if photos:
                photo = photos[0]
                copy_data = {
                    k: v for k, v in photo.items()
                    if k not in ("id", "createdAt", "updatedAt", "timestamp")
                }
                copy_data["reportId"] = report_id
                copy_data["tenantId"] = user.tenantId
                caption = photo.get("caption") or ""
                copy_data["caption"] = f"{caption} (copy)"
                dup = await insert_record(PHOTO_TABLE, copy_data)
                duplicated.append(dup)
        return duplicated

    else:
        raise ValidationException(message=f"Unknown bulk action: {action}")


async def reorder_photos(
    user: AuthUser,
    report_id: str,
    photo_ids: list[str],
) -> list[dict[str, Any]]:
    """Reorder photos and re-number within type groups."""
    _check_irms_access(user)
    _check_action(user, "inspection", "upload_photos")

    # Update sortOrder for each photo
    for idx, pid in enumerate(photo_ids):
        try:
            await update_record(PHOTO_TABLE, pid, {"sortOrder": idx})
        except NotFoundException:
            pass

    # Re-number photos within each type group
    all_photos = await query_table(
        PHOTO_TABLE,
        where={"reportId": report_id},
        order="sortOrder.asc",
        limit=500,
        tenant_id=user.tenantId,
    )
    by_type: dict[str, list[dict[str, Any]]] = {}
    for p in all_photos.get("data", []):
        ptype = p.get("type", "before")
        if ptype not in by_type:
            by_type[ptype] = []
        by_type[ptype].append(p)

    for ptype, items in by_type.items():
        prefix = TYPE_PREFIXES.get(ptype, "B")
        for idx, item in enumerate(items):
            photo_num = f"{prefix}{str(idx + 1).zfill(3)}"
            try:
                await update_record(PHOTO_TABLE, item["id"], {"photoNumber": photo_num})
            except (NotFoundException, Exception):
                pass

    # Return updated photos
    updated = await query_table(
        PHOTO_TABLE,
        where={"reportId": report_id},
        order="sortOrder.asc",
        limit=500,
        tenant_id=user.tenantId,
    )
    return updated.get("data", [])


async def update_photo(
    user: AuthUser,
    photo_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update a single photo."""
    _check_irms_access(user)
    _check_action(user, "inspection", "upload_photos")

    record = await update_record(PHOTO_TABLE, photo_id, data)
    return record


async def delete_photo(user: AuthUser, photo_id: str) -> dict[str, Any]:
    """Delete a single photo."""
    _check_irms_access(user)
    _check_action(user, "inspection", "upload_photos")

    await delete_record(PHOTO_TABLE, photo_id)
    return {"deleted": True}


# ═══════════════════════════════════════════════════════════════════════════════
# REVISIONS
# ═══════════════════════════════════════════════════════════════════════════════


async def list_revisions(user: AuthUser, report_id: str) -> list[dict[str, Any]]:
    """Get revision history for a report."""
    _check_irms_access(user)

    result = await query_table(
        REVISION_TABLE,
        where={"reportId": report_id},
        order="version.desc",
        limit=50,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


async def rollback_revision(
    user: AuthUser,
    report_id: str,
    version: int,
) -> dict[str, Any]:
    """Rollback a report to a specific revision."""
    _check_irms_access(user)
    _check_action(user, "inspection", "update")

    # Find the revision
    result = await query_table(
        REVISION_TABLE,
        where={"reportId": report_id, "version": version},
        tenant_id=user.tenantId,
        limit=1,
    )
    revisions = result.get("data", [])
    if not revisions:
        raise NotFoundException(resource="IrmRevision", message="Revision not found")

    revision = revisions[0]
    snapshot = revision.get("snapshot", "{}")
    try:
        restorable_fields = json.loads(snapshot)
    except (json.JSONDecodeError, TypeError):
        raise InternalException(message="Invalid revision snapshot data")

    # Remove non-restorable fields
    skip_keys = {
        "id", "number", "project", "inspector", "assessedBy",
        "photos", "revisions", "approvals", "activities",
        "createdAt", "updatedAt", "tenantId",
    }
    for key in skip_keys:
        restorable_fields.pop(key, None)

    updated = await update_record(REPORT_TABLE, report_id, restorable_fields)

    # Create activity
    await insert_record(ACTIVITY_TABLE, {
        "tenantId": user.tenantId,
        "type": "revision_rollback",
        "description": f"Rolled back report to version {version}",
        "reportId": report_id,
        "projectId": updated.get("projectId"),
        "userId": revision.get("userId") or user.userId,
    })

    return updated


# ═══════════════════════════════════════════════════════════════════════════════
# STATUS TRANSITIONS
# ═══════════════════════════════════════════════════════════════════════════════


async def advance_report_status(
    user: AuthUser,
    report_id: str,
    action: str,
    comment: str | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    """Advance or reject a report through the approval workflow."""
    _check_irms_access(user)
    _check_action(user, "inspection", "approve")

    # Get current report
    result = await query_table(
        REPORT_TABLE, where={"id": report_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="IrmReport", message="Report not found")

    report = result["data"][0]
    actor_id = user_id or user.userId

    if action == "advance":
        current_status = report.get("status", "draft")
        try:
            current_idx = STATUS_FLOW.index(current_status)
        except ValueError:
            raise ValidationException(message=f"Cannot advance from status: {current_status}")

        if current_idx >= len(STATUS_FLOW) - 1:
            raise ValidationException(message="Cannot advance from current status — already at final state")

        next_status = STATUS_FLOW[current_idx + 1]

        # Save revision
        version_count = await count_records(REVISION_TABLE, {"reportId": report_id}, tenant_id=user.tenantId)
        await insert_record(REVISION_TABLE, {
            "tenantId": user.tenantId,
            "reportId": report_id,
            "version": version_count + 1,
            "snapshot": json.dumps(report),
            "note": f"Advanced from {current_status} to {next_status}",
            "userId": actor_id,
        })

        # Create approval
        step = "manager_approval" if next_status == "approved" else next_status
        approval_status = "approved" if next_status == "approved" else "pending"
        await insert_record(APPROVAL_TABLE, {
            "tenantId": user.tenantId,
            "reportId": report_id,
            "step": step,
            "status": approval_status,
            "userId": actor_id,
            "comment": comment or f"Advanced to {next_status}",
        })

        updated = await update_record(REPORT_TABLE, report_id, {"status": next_status})

        # Activity
        act_type = "report_approved" if next_status == "approved" else "status_changed"
        await insert_record(ACTIVITY_TABLE, {
            "tenantId": user.tenantId,
            "type": act_type,
            "description": f"Report {report.get('number')} status changed to {next_status}",
            "reportId": report_id,
            "projectId": report.get("projectId"),
            "userId": actor_id,
        })

        return updated

    elif action == "reject":
        # Save revision
        version_count = await count_records(REVISION_TABLE, {"reportId": report_id}, tenant_id=user.tenantId)
        await insert_record(REVISION_TABLE, {
            "tenantId": user.tenantId,
            "reportId": report_id,
            "version": version_count + 1,
            "snapshot": json.dumps(report),
            "note": f"Rejected: {comment or 'Returned to draft'}",
            "userId": actor_id,
        })

        await insert_record(APPROVAL_TABLE, {
            "tenantId": user.tenantId,
            "reportId": report_id,
            "step": report.get("status"),
            "status": "rejected",
            "userId": actor_id,
            "comment": comment or "Rejected",
        })

        updated = await update_record(REPORT_TABLE, report_id, {"status": "draft"})

        await insert_record(ACTIVITY_TABLE, {
            "tenantId": user.tenantId,
            "type": "report_rejected",
            "description": f"Report {report.get('number')} was rejected and returned to draft",
            "reportId": report_id,
            "projectId": report.get("projectId"),
            "userId": actor_id,
        })

        return updated

    else:
        raise ValidationException(message='Invalid action. Use "advance" or "reject".')


# ═══════════════════════════════════════════════════════════════════════════════
# SIGNATURES
# ═══════════════════════════════════════════════════════════════════════════════


async def update_signatures(
    user: AuthUser,
    report_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update digital signatures on a report."""
    _check_irms_access(user)
    _check_action(user, "inspection", "sign")

    update_data: dict[str, Any] = {}
    for sig_field in ("inspectorSign", "supervisorSign", "managerSign", "clientSign"):
        if sig_field in data:
            update_data[sig_field] = data[sig_field]

    if not update_data:
        raise ValidationException(message="No signature fields provided")

    record = await update_record(REPORT_TABLE, report_id, update_data)
    return record


# ═══════════════════════════════════════════════════════════════════════════════
# PDF (STUB)
# ═══════════════════════════════════════════════════════════════════════════════


async def generate_pdf(
    user: AuthUser,
    report_id: str,
    template: str = "government",
    sort: str = "oldest",
    download: str = "0",
) -> dict[str, Any]:
    """Generate PDF for a report (stub — full implementation pending)."""
    _check_irms_access(user)
    _check_action(user, "inspection", "export")

    return {
        "message": "PDF generation endpoint - use @react-pdf/renderer",
        "reportId": report_id,
        "template": template,
        "sort": sort,
        "download": download,
        "note": "This is a stub. Implement the full PDF engine separately using @react-pdf/renderer.",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════


async def list_templates(
    user: AuthUser,
    category: str = "",
) -> list[dict[str, Any]]:
    """List inspection templates."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view")

    where: dict[str, Any] = {"isActive": True}
    if category:
        where["category"] = category

    result = await query_table(
        INSPECTION_TEMPLATE_TABLE,
        where=where,
        order="createdAt.desc",
        limit=100,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


async def create_template(user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create an inspection template with checklist items."""
    _check_irms_access(user)
    _check_action(user, "inspection", "manage_templates")

    checklist_items = data.pop("checklistItems", [])
    data["tenantId"] = user.tenantId
    data["createdById"] = user.userId

    # Try to resolve creator name
    try:
        user_result = await query_table(
            USER_TABLE, where={"id": user.userId}, select="name", limit=1,
            tenant_id=user.tenantId,
        )
        users = user_result.get("data", [])
        if users:
            data["createdByName"] = users[0].get("name")
    except Exception:
        pass

    template = await insert_record(INSPECTION_TEMPLATE_TABLE, data)

    # Create checklist items
    template_id = template.get("id")
    for idx, item in enumerate(checklist_items):
        item_data = {
            "tenantId": user.tenantId,
            "templateId": template_id,
            "question": item.get("question", "").strip(),
            "category": item.get("category"),
            "itemType": item.get("type", "pass_fail"),
            "isRequired": item.get("required", True),
            "sortOrder": item.get("sortOrder", idx),
            "helpText": item.get("helpText"),
            "options": json.dumps(item["options"]) if item.get("options") else None,
            "minScore": item.get("minScore"),
            "maxScore": item.get("maxScore"),
        }
        await insert_record(INSPECTION_CHECKLIST_TABLE, item_data)

    # Fetch template with items for response
    items_result = await query_table(
        INSPECTION_CHECKLIST_TABLE,
        where={"templateId": template_id},
        order="sortOrder.asc",
        limit=200,
        tenant_id=user.tenantId,
    )
    template["checklistItems"] = items_result.get("data", [])
    return template


async def get_template(user: AuthUser, template_id: str) -> dict[str, Any]:
    """Get a single inspection template with checklist items."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view")

    result = await query_table(
        INSPECTION_TEMPLATE_TABLE,
        where={"id": template_id},
        tenant_id=user.tenantId,
        limit=1,
    )
    templates = result.get("data", [])
    if not templates:
        raise NotFoundException(resource="InspectionTemplate", message="Template not found")

    template = templates[0]

    items_result = await query_table(
        INSPECTION_CHECKLIST_TABLE,
        where={"templateId": template_id},
        order="sortOrder.asc",
        limit=200,
        tenant_id=user.tenantId,
    )
    template["checklistItems"] = items_result.get("data", [])

    # Count inspections using this template
    usage_count = await count_records(
        INSPECTION_TABLE, {"templateId": template_id}, tenant_id=user.tenantId,
    )
    template["usageCount"] = usage_count

    return template


async def update_template(
    user: AuthUser,
    template_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update an inspection template."""
    _check_irms_access(user)
    _check_action(user, "inspection", "manage_templates")

    result = await query_table(
        INSPECTION_TEMPLATE_TABLE, where={"id": template_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="InspectionTemplate", message="Template not found")

    checklist_items = data.pop("checklistItems", None)

    # Update template fields
    if data:
        await update_record(INSPECTION_TEMPLATE_TABLE, template_id, data)

    # Replace checklist items if provided
    if checklist_items is not None:
        # Delete existing items
        existing = await query_table(
            INSPECTION_CHECKLIST_TABLE,
            where={"templateId": template_id},
            select="id",
            limit=200,
            tenant_id=user.tenantId,
        )
        for item in existing.get("data", []):
            try:
                await delete_record(INSPECTION_CHECKLIST_TABLE, item["id"])
            except NotFoundException:
                pass

        # Create new items
        for idx, item in enumerate(checklist_items):
            item_data = {
                "tenantId": user.tenantId,
                "templateId": template_id,
                "question": item.get("question", "").strip(),
                "category": item.get("category"),
                "itemType": item.get("type", "pass_fail"),
                "isRequired": item.get("required", True),
                "sortOrder": item.get("sortOrder", idx),
                "helpText": item.get("helpText"),
                "options": json.dumps(item["options"]) if item.get("options") else None,
                "minScore": item.get("minScore"),
                "maxScore": item.get("maxScore"),
            }
            await insert_record(INSPECTION_CHECKLIST_TABLE, item_data)

    # Fetch and return updated template with items
    template = await get_template(user, template_id)
    return template


async def delete_template(user: AuthUser, template_id: str) -> dict[str, Any]:
    """Delete an inspection template."""
    _check_irms_access(user)
    _check_action(user, "inspection", "manage_templates")

    result = await query_table(
        INSPECTION_TEMPLATE_TABLE, where={"id": template_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="InspectionTemplate", message="Template not found")

    # Check if template is in use
    usage_count = await count_records(
        INSPECTION_TABLE, {"templateId": template_id}, tenant_id=user.tenantId,
    )
    if usage_count > 0:
        raise ValidationException(
            message=f"Cannot delete template: {usage_count} inspection(s) reference this template",
        )

    await delete_record(INSPECTION_TEMPLATE_TABLE, template_id)
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# IRM USERS
# ═══════════════════════════════════════════════════════════════════════════════


async def list_irm_users(user: AuthUser) -> list[dict[str, Any]]:
    """List all IRM users."""
    _check_irms_access(user)

    result = await query_table(
        IRM_USER_TABLE,
        where={},
        order="name.asc",
        limit=100,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


async def create_irm_user(user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create an IRM user."""
    _check_irms_access(user)
    _check_action(user, "inspection", "create")

    data["tenantId"] = user.tenantId
    record = await insert_record(IRM_USER_TABLE, data)
    return record


# ═══════════════════════════════════════════════════════════════════════════════
# INSPECTIONS
# ═══════════════════════════════════════════════════════════════════════════════


async def list_inspections(
    user: AuthUser,
    status: str = "",
    priority: str = "",
    type: str = "",
    assigned_to_id: str = "",
    equipment_id: str = "",
    search: str = "",
    view: str = "",
    month: str = "",
    from_date: str = "",
    to_date: str = "",
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """List inspections with filtering and pagination."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view")

    where: dict[str, Any] = {}

    # Technician scoping: only own inspections
    if user.role == "technician":
        where["assignedToId"] = user.userId

    if status:
        where["status"] = status
    if priority:
        where["priority"] = priority
    if type:
        where["inspectionType"] = type
    if assigned_to_id:
        where["assignedToId"] = assigned_to_id
    if equipment_id:
        where["equipmentId"] = equipment_id

    if search:
        where["OR"] = [
            {"title": {"contains": search}},
            {"description": {"contains": search}},
            {"equipmentName": {"contains": search}},
            {"assignedToName": {"contains": search}},
        ]

    # Calendar view: filter by month
    if view == "calendar" and month:
        parts = month.split("-")
        if len(parts) == 2:
            year_val = int(parts[0])
            month_val = int(parts[1])
            start_str = f"{year_val}-{month_val:02d}-01"
            if month_val == 12:
                end_str = f"{year_val + 1}-01-01"
            else:
                end_str = f"{year_val}-{month_val + 1:02d}-01"
            where["scheduledDate"] = {"gte": start_str, "lt": end_str}

    # Date range filter
    if from_date and view != "calendar":
        if "scheduledDate" not in where:
            where["scheduledDate"] = {}
        where["scheduledDate"]["gte"] = from_date
    if to_date and view != "calendar":
        if "scheduledDate" not in where:
            where["scheduledDate"] = {}
        where["scheduledDate"]["lt"] = to_date

    effective_limit = 1000 if view == "calendar" else page_size
    skip = 0 if view == "calendar" else (page - 1) * page_size

    total = await count_records(INSPECTION_TABLE, where, tenant_id=user.tenantId)

    result = await query_table(
        INSPECTION_TABLE,
        where=where,
        order="createdAt.desc",
        limit=effective_limit,
        offset=skip,
        tenant_id=user.tenantId,
    )

    items = result.get("data", [])
    effective_page_size = 1000 if view == "calendar" else page_size

    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": effective_page_size,
        "totalPages": (total + effective_page_size - 1) // effective_page_size if effective_page_size > 0 else 0,
    }


async def create_inspection(user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new inspection."""
    _check_irms_access(user)
    _check_action(user, "inspection", "create")

    data["tenantId"] = user.tenantId
    data["status"] = "scheduled"
    data["createdBy"] = user.userId
    data["maxScore"] = 100

    # Try to resolve creator name
    try:
        user_result = await query_table(
            USER_TABLE, where={"id": user.userId}, select="name", limit=1,
            tenant_id=user.tenantId,
        )
        users = user_result.get("data", [])
        if users:
            data["creatorName"] = users[0].get("name")
    except Exception:
        pass

    record = await insert_record(INSPECTION_TABLE, data)
    return record


async def get_inspection(user: AuthUser, inspection_id: str) -> dict[str, Any]:
    """Get a single inspection with full details."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view")

    result = await query_table(
        INSPECTION_TABLE,
        where={"id": inspection_id},
        tenant_id=user.tenantId,
        limit=1,
    )
    inspections = result.get("data", [])
    if not inspections:
        raise NotFoundException(resource="Inspection", message="Inspection not found")

    inspection = inspections[0]

    # Technician scoping
    if user.role == "technician" and inspection.get("assignedToId") != user.userId:
        raise NotFoundException(resource="Inspection", message="Inspection not found")

    # Fetch results and template
    results_result = await query_table(
        INSPECTION_RESULT_TABLE,
        where={"inspectionId": inspection_id},
        order="createdAt.asc",
        limit=200,
        tenant_id=user.tenantId,
    )
    inspection["results"] = results_result.get("data", [])

    template_id = inspection.get("templateId")
    if template_id:
        template_result = await query_table(
            INSPECTION_TEMPLATE_TABLE,
            where={"id": template_id},
            limit=1,
            tenant_id=user.tenantId,
        )
        templates = template_result.get("data", [])
        if templates:
            template = templates[0]
            items_result = await query_table(
                INSPECTION_CHECKLIST_TABLE,
                where={"templateId": template_id},
                order="sortOrder.asc",
                limit=200,
                tenant_id=user.tenantId,
            )
            template["checklistItems"] = items_result.get("data", [])
            inspection["template"] = template

    return inspection


async def update_inspection(
    user: AuthUser,
    inspection_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update an inspection."""
    _check_irms_access(user)

    result = await query_table(
        INSPECTION_TABLE, where={"id": inspection_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="Inspection", message="Inspection not found")

    existing = result["data"][0]
    new_status = data.get("status")
    assigned_to_id = data.get("assignedToId")

    # Determine required permission
    required_action = "complete" if new_status == "completed" else "update"
    if assigned_to_id and assigned_to_id != existing.get("assignedToId"):
        _check_action(user, "inspection", "assign")

    _check_action(user, "inspection", required_action)

    # Validate status transitions
    if new_status:
        valid_transitions = {
            "scheduled": ["in_progress", "cancelled"],
            "in_progress": ["completed", "failed", "cancelled"],
            "completed": [],
            "failed": [],
            "cancelled": [],
            "overdue": ["in_progress", "cancelled"],
        }
        allowed = valid_transitions.get(existing.get("status", ""), [])
        if new_status not in allowed:
            raise ValidationException(
                message=f"Invalid status transition: {existing.get('status')} → {new_status}",
            )

    update_data = {**data}

    # Auto-set timestamps
    if new_status == "in_progress" and not existing.get("startedAt"):
        update_data["startedAt"] = datetime.now(timezone.utc).isoformat()
    if new_status == "completed":
        update_data["completedAt"] = datetime.now(timezone.utc).isoformat()

    # Resolve assignedToName if needed
    if assigned_to_id and not data.get("assignedToName"):
        try:
            user_result = await query_table(
                USER_TABLE, where={"id": assigned_to_id}, select="name", limit=1,
                tenant_id=user.tenantId,
            )
            users = user_result.get("data", [])
            if users:
                update_data["assignedToName"] = users[0].get("name")
        except Exception:
            pass

    record = await update_record(INSPECTION_TABLE, inspection_id, update_data)
    return record


async def delete_inspection(user: AuthUser, inspection_id: str) -> dict[str, Any]:
    """Delete an inspection."""
    _check_irms_access(user)
    _check_action(user, "inspection", "delete")

    result = await query_table(
        INSPECTION_TABLE, where={"id": inspection_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="Inspection", message="Inspection not found")

    existing = result["data"][0]
    if existing.get("status") == "in_progress":
        raise ValidationException(message="Cannot delete an inspection that is in progress")

    await delete_record(INSPECTION_TABLE, inspection_id)
    return {"success": True}


async def complete_inspection(user: AuthUser, inspection_id: str) -> dict[str, Any]:
    """Mark an inspection as completed with automatic scoring."""
    _check_irms_access(user)
    _check_action(user, "inspection", "complete")

    result = await query_table(
        INSPECTION_TABLE, where={"id": inspection_id}, tenant_id=user.tenantId, limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="Inspection", message="Inspection not found")

    inspection = result["data"][0]

    # Technician scoping
    if user.role == "technician" and inspection.get("assignedToId") != user.userId:
        raise NotFoundException(resource="Inspection", message="Inspection not found")

    # Only scheduled or in_progress can be completed
    if inspection.get("status") not in ("scheduled", "in_progress"):
        raise ValidationException(
            message=f"Cannot complete inspection with status: {inspection.get('status')}",
        )

    # Calculate result from inspection results
    results_result = await query_table(
        INSPECTION_RESULT_TABLE,
        where={"inspectionId": inspection_id},
        limit=500,
        tenant_id=user.tenantId,
    )
    results = results_result.get("data", [])

    result_val = "pass"
    calculated_score = None

    if results:
        total_items = len(results)
        pass_items = sum(
            1 for r in results
            if r.get("answer") in ("pass", "yes", "ok")
        )
        fail_items = sum(
            1 for r in results
            if r.get("answer") in ("fail", "no", "not_ok")
        )
        pass_rate = pass_items / total_items if total_items > 0 else 0

        if fail_items > 0 and pass_items == 0:
            result_val = "fail"
        elif fail_items > 0 and pass_rate < 0.7:
            result_val = "fail"
        elif fail_items > 0 and pass_rate < 1:
            result_val = "conditional"
        else:
            result_val = "pass"

        # Score from individual results
        scored = [r for r in results if r.get("score") is not None]
        if scored:
            total_score = sum(r["score"] for r in scored)
            calculated_score = round(total_score / len(scored))
        else:
            calculated_score = round(pass_rate * (inspection.get("maxScore") or 100))
    else:
        # Check checklistData field
        checklist_data = inspection.get("checklistData")
        if checklist_data:
            try:
                checklist = json.loads(checklist_data) if isinstance(checklist_data, str) else checklist_data
                if isinstance(checklist, list) and checklist:
                    pass_count = sum(
                        1 for item in checklist
                        if item.get("answer") in ("pass", "yes", "ok")
                    )
                    fail_count = sum(
                        1 for item in checklist
                        if item.get("answer") in ("fail", "no", "not_ok")
                    )
                    rate = pass_count / len(checklist) if checklist else 0
                    if fail_count > 0 and pass_count == 0:
                        result_val = "fail"
                    elif fail_count > 0 and rate < 0.7:
                        result_val = "fail"
                    elif fail_count > 0 and rate < 1:
                        result_val = "conditional"
                    else:
                        result_val = "pass"
                    calculated_score = round(rate * (inspection.get("maxScore") or 100))
            except (json.JSONDecodeError, TypeError):
                pass

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": "completed",
        "completedAt": now_iso,
        "result": result_val,
        "passRate": 100 if result_val == "pass" else (0 if result_val == "fail" else None),
    }
    if calculated_score is not None:
        update_data["score"] = calculated_score

    record = await update_record(INSPECTION_TABLE, inspection_id, update_data)
    return record


# ═══════════════════════════════════════════════════════════════════════════════
# INSPECTION REPORTS / DASHBOARD-STATS / ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════


async def get_inspection_reports(user: AuthUser) -> list[dict[str, Any]]:
    """Get inspection reports (completed inspections)."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view")

    result = await query_table(
        INSPECTION_TABLE,
        where={"status": "completed"},
        order="completedAt.desc",
        limit=100,
        tenant_id=user.tenantId,
    )
    return result.get("data", [])


async def get_inspection_dashboard_stats(user: AuthUser) -> dict[str, Any]:
    """Get inspection dashboard statistics."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)

    total = await count_records(INSPECTION_TABLE, tenant_id=user.tenantId)
    scheduled = await count_records(INSPECTION_TABLE, {"status": "scheduled"}, tenant_id=user.tenantId)
    in_progress = await count_records(INSPECTION_TABLE, {"status": "in_progress"}, tenant_id=user.tenantId)
    completed = await count_records(INSPECTION_TABLE, {"status": "completed"}, tenant_id=user.tenantId)
    failed = await count_records(INSPECTION_TABLE, {"status": "failed"}, tenant_id=user.tenantId)
    overdue = await count_records(INSPECTION_TABLE, {"status": "overdue"}, tenant_id=user.tenantId)

    # Today's scheduled
    today_where = {
        "AND": [
            {"scheduledDate": {"gte": today_start.isoformat()}},
            {"scheduledDate": {"lt": tomorrow_start.isoformat()}},
        ],
    }
    today_count = await count_records(INSPECTION_TABLE, today_where, tenant_id=user.tenantId)

    # Technician-specific stats
    if user.role == "technician":
        my_total = await count_records(INSPECTION_TABLE, {"assignedToId": user.userId}, tenant_id=user.tenantId)
        my_completed = await count_records(
            INSPECTION_TABLE,
            {"assignedToId": user.userId, "status": "completed"},
            tenant_id=user.tenantId,
        )
        my_in_progress = await count_records(
            INSPECTION_TABLE,
            {"assignedToId": user.userId, "status": "in_progress"},
            tenant_id=user.tenantId,
        )
    else:
        my_total = my_completed = my_in_progress = 0

    return {
        "total": total,
        "scheduled": scheduled,
        "inProgress": in_progress,
        "completed": completed,
        "failed": failed,
        "overdue": overdue,
        "todayScheduled": today_count,
        "myTotal": my_total,
        "myCompleted": my_completed,
        "myInProgress": my_in_progress,
    }


async def get_inspection_analytics(user: AuthUser) -> dict[str, Any]:
    """Get inspection analytics data."""
    _check_irms_access(user)
    _check_action(user, "inspection", "view_analytics")

    now = datetime.now(timezone.utc)
    six_months_ago = (now.replace(day=1) - timedelta(days=1)).replace(day=1) - timedelta(days=150)

    # Fetch completed inspections
    completed_result = await query_table(
        INSPECTION_TABLE,
        select="createdAt,result,score,priority,inspectionType",
        where={
            "AND": [
                {"status": "completed"},
                {"createdAt": {"gte": six_months_ago.isoformat()}},
            ],
        },
        limit=10000,
        tenant_id=user.tenantId,
    )
    completed = completed_result.get("data", [])

    # Monthly completion trend
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = (now.month - i) % 12
        year = now.year - ((now.month - i - 1) // 12)
        month_str = f"{year}-{month_start:02d}" if month_start else f"{year}-12"
        month_dt = datetime(year, month_start or 12, 1)
        month_label = month_dt.strftime("%b %Y")

        month_items = [
            r for r in completed
            if isinstance(r.get("createdAt"), str) and r["createdAt"].startswith(month_str)
        ]
        total = len(month_items)
        passed = sum(1 for r in month_items if r.get("result") == "pass")
        failed = sum(1 for r in month_items if r.get("result") == "fail")
        avg_score = round(
            sum(r.get("score", 0) for r in month_items if r.get("score") is not None) /
            max(len([r for r in month_items if r.get("score") is not None]), 1),
        )
        monthly_trend.append({
            "month": month_label,
            "total": total,
            "passed": passed,
            "failed": failed,
            "avgScore": avg_score,
        })

    # Result breakdown
    result_counts: dict[str, int] = {}
    for r in completed:
        res = r.get("result", "unknown")
        result_counts[res] = result_counts.get(res, 0) + 1

    # Priority breakdown
    priority_counts: dict[str, int] = {}
    for r in completed:
        p = r.get("priority", "unknown")
        priority_counts[p] = priority_counts.get(p, 0) + 1

    # Type breakdown
    type_counts: dict[str, int] = {}
    for r in completed:
        t = r.get("inspectionType", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "monthlyTrend": monthly_trend,
        "resultBreakdown": [{"result": k, "count": v} for k, v in result_counts.items()],
        "priorityBreakdown": [{"priority": k, "count": v} for k, v in priority_counts.items()],
        "typeBreakdown": [{"type": k, "count": v} for k, v in type_counts.items()],
    }
