from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import query_table
from app.core.logging import get_logger
from app.integrations.redis import get_redis
from app.rbac.data_scope import NEVER_MATCH

log = get_logger(__name__)


# ── Dashboard Scope (mirrors Express buildDashboardScope) ─────────────────


@dataclass
class DashboardScope:
    """Resolved WHERE clauses and visibility flags for a given role."""
    tenant_id: str
    user_id: str
    role: str

    # PostgREST where clauses
    complaint_where: dict[str, Any] = field(default_factory=lambda: NEVER_MATCH.copy())
    work_order_where: dict[str, Any] = field(default_factory=lambda: NEVER_MATCH.copy())
    work_order_secondary_where: dict[str, Any] | None = None
    invoice_where: dict[str, Any] = field(default_factory=lambda: NEVER_MATCH.copy())
    equipment_where: dict[str, Any] = field(default_factory=lambda: NEVER_MATCH.copy())
    pm_where: dict[str, Any] = field(default_factory=lambda: NEVER_MATCH.copy())

    # Visibility flags
    can_see_revenue: bool = False
    can_see_inventory: bool = False
    can_see_pm: bool = False
    can_see_employees: bool = False
    can_see_customers: bool = False
    can_see_equipment: bool = False
    can_see_complaints: bool = False
    can_see_work_orders: bool = False

    # Customer role returns 1 for totalCustomers
    customer_count_override: int | None = None


async def build_dashboard_scope(
    tenant_id: str,
    user_id: str,
    role: str,
) -> DashboardScope:
    """Build dashboard scope per role (same logic as Express backend)."""
    base: dict[str, Any] = {"tenantId": tenant_id}
    hidden = NEVER_MATCH.copy()

    # ── Full-access roles ─────────────────────────────────────────────
    if role in ("super_admin", "admin", "manager"):
        return DashboardScope(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            complaint_where=base.copy(),
            work_order_where=base.copy(),
            invoice_where=base.copy(),
            equipment_where=base.copy(),
            pm_where=base.copy(),
            can_see_revenue=True,
            can_see_inventory=True,
            can_see_pm=True,
            can_see_employees=True,
            can_see_customers=True,
            can_see_equipment=True,
            can_see_complaints=True,
            can_see_work_orders=True,
        )

    # ── Supervisor ─────────────────────────────────────────────────────
    if role == "supervisor":
        # Look up department and tech IDs
        dept_id = None
        tech_ids: list[str] = []
        user_result = await query_table("user", select="departmentId", where={"id": user_id}, limit=1)
        user_data = user_result.get("data", [])
        if user_data:
            dept_id = user_data[0].get("departmentId")

        if dept_id:
            techs_result = await query_table(
                "user",
                select="id",
                where={"tenantId": tenant_id, "departmentId": dept_id, "role": "technician", "isActive": True},
            )
            tech_ids = [t["id"] for t in techs_result.get("data", []) if t.get("id")]

        # Find complaint IDs supervised by this user
        my_complaints_result = await query_table(
            "Complaint", select="id", where={**base, "supervisorId": user_id}
        )
        my_complaint_ids = [c["id"] for c in my_complaints_result.get("data", []) if c.get("id")]

        wo_where = ({**base, "complaintId": {"in": my_complaint_ids}}
                     if my_complaint_ids else hidden)
        wo_secondary = ({**base, "assignedToId": {"in": tech_ids}}
                         if tech_ids else None)

        return DashboardScope(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            complaint_where={**base, "supervisorId": user_id},
            work_order_where=wo_where,
            work_order_secondary_where=wo_secondary,
            invoice_where=hidden,
            equipment_where=hidden,
            pm_where=hidden,
            can_see_employees=True,
            can_see_customers=True,
            can_see_complaints=True,
            can_see_work_orders=True,
        )

    # ── Technician ─────────────────────────────────────────────────────
    if role == "technician":
        return DashboardScope(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            complaint_where={**base, "assignedToId": user_id},
            work_order_where={**base, "assignedToId": user_id},
            equipment_where=base.copy(),  # tenant-wide count
            can_see_equipment=True,
            can_see_complaints=True,
            can_see_work_orders=True,
        )

    # ── Finance ────────────────────────────────────────────────────────
    if role == "finance":
        return DashboardScope(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            invoice_where=base.copy(),
            can_see_revenue=True,
            can_see_customers=True,
        )

    # ── HR ─────────────────────────────────────────────────────────────
    if role == "hr":
        return DashboardScope(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            can_see_employees=True,
        )

    # ── Customer ───────────────────────────────────────────────────────
    if role == "customer":
        cust_id = await _get_customer_id(tenant_id, user_id)

        complaint_ids: list[str] = []
        if cust_id:
            cc_result = await query_table(
                "Complaint", select="id", where={"tenantId": tenant_id, "customerId": cust_id}
            )
            complaint_ids = [c["id"] for c in cc_result.get("data", []) if c.get("id")]

        wo_where = ({**base, "complaintId": {"in": complaint_ids}}
                     if complaint_ids else hidden)

        return DashboardScope(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            complaint_where={**base, "customerId": cust_id} if cust_id else hidden,
            work_order_where=wo_where,
            invoice_where={**base, "customerId": cust_id} if cust_id else hidden,
            equipment_where={**base, "customerId": cust_id} if cust_id else hidden,
            can_see_customers=True,
            can_see_equipment=bool(cust_id),
            can_see_complaints=bool(cust_id),
            can_see_work_orders=bool(complaint_ids),
            customer_count_override=1,
        )

    # ── Unknown: deny everything ──────────────────────────────────────
    return DashboardScope(tenant_id=tenant_id, user_id=user_id, role=role)


# ── Helper to count records in a where clause ────────────────────────────


async def _count(table: str, where: dict[str, Any]) -> int:
    if not where or where == NEVER_MATCH:
        return 0
    result = await query_table(table, select="id", where=where, count="exact", limit=1)
    count_str = result.get("count", "0")
    try:
        return int(count_str) if count_str not in ("*", None) else len(result.get("data", []))
    except (ValueError, TypeError):
        return 0


async def _sum_field(table: str, where: dict[str, Any], field: str) -> float:
    """Sum a numeric field across matching records."""
    if not where or where == NEVER_MATCH:
        return 0.0
    result = await query_table(table, select=field, where=where)
    data = result.get("data", [])
    return sum(float(r.get(field, 0) or 0) for r in data)


def _to_status_map(rows: list[dict[str, Any]]) -> dict[str, int]:
    """Convert groupBy-style results to a status→count map."""
    m: dict[str, int] = {}
    for row in rows:
        status = row.get("status", "unknown")
        count = row.get("count", 0)
        if isinstance(count, dict):
            count = count.get("id", 0)
        m[status] = int(count or 0)
    return m


def _build_monthly_revenue(invoices: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build last 6 months revenue data."""
    now = datetime.now(timezone.utc)
    result: list[dict[str, Any]] = []
    for i in range(5, -1, -1):
        start = datetime(now.year, now.month - i, 1, tzinfo=timezone.utc) if now.month - i > 0 else \
            datetime(now.year - 1, now.month - i + 12, 1, tzinfo=timezone.utc)
        if now.month - i > 0:
            end_month = now.month - i
            end_year = now.year
        else:
            end_month = now.month - i + 12
            end_year = now.year - 1
        # last day of month
        if end_month == 12:
            next_month_start = datetime(end_year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            next_month_start = datetime(end_year, end_month + 1, 1, tzinfo=timezone.utc)
        end = next_month_start - timedelta(seconds=1)

        label = start.strftime("%b %y")
        rev = 0.0
        for inv in invoices:
            paid_at = inv.get("paidAt")
            if not paid_at:
                continue
            try:
                paid_dt = datetime.fromisoformat(str(paid_at).replace("Z", "+00:00"))
                if start <= paid_dt <= end:
                    rev += float(inv.get("total", 0) or 0)
            except (ValueError, TypeError):
                continue
        result.append({"month": label, "revenue": round(rev, 2)})
    return result


def _calc_pm_compliance(pm_list: list[dict[str, Any]]) -> int:
    if not pm_list:
        return 0
    completed = sum(1 for pm in pm_list if pm.get("status") == "completed")
    return round((completed / len(pm_list)) * 100)


# ── Dashboard service functions ───────────────────────────────────────────


async def get_full_dashboard(tenant_id: str, user_id: str, role: str) -> dict[str, Any]:
    """Full combined dashboard (cached 30s)."""
    redis = get_redis()
    cache_key = redis.build_cache_key(tenant_id, "dashboard", "full", role, user_id)

    async def _fetch() -> dict[str, Any]:
        scope = await build_dashboard_scope(tenant_id, user_id, role)
        return await _build_full(scope)

    return await redis.cached_fetch(cache_key, _fetch, ttl=30)


async def get_kpi(tenant_id: str, user_id: str, role: str) -> dict[str, Any]:
    """KPI metrics (cached 30s)."""
    redis = get_redis()
    cache_key = redis.build_cache_key(tenant_id, "dashboard", "kpi", role, user_id)

    async def _fetch() -> dict[str, Any]:
        scope = await build_dashboard_scope(tenant_id, user_id, role)
        return await _build_kpi(scope)

    return await redis.cached_fetch(cache_key, _fetch, ttl=30)


async def get_recent(tenant_id: str, user_id: str, role: str) -> dict[str, Any]:
    """Recent activity (cached 30s)."""
    redis = get_redis()
    cache_key = redis.build_cache_key(tenant_id, "dashboard", "recent", role, user_id)

    async def _fetch() -> dict[str, Any]:
        scope = await build_dashboard_scope(tenant_id, user_id, role)
        return await _build_recent(scope)

    return await redis.cached_fetch(cache_key, _fetch, ttl=30)


async def get_charts(tenant_id: str, user_id: str, role: str) -> dict[str, Any]:
    """Chart data (cached 60s)."""
    redis = get_redis()
    cache_key = redis.build_cache_key(tenant_id, "dashboard", "charts", role, user_id)

    async def _fetch() -> dict[str, Any]:
        scope = await build_dashboard_scope(tenant_id, user_id, role)
        return await _build_charts(scope)

    return await redis.cached_fetch(cache_key, _fetch, ttl=60)


# ── Internal builders ────────────────────────────────────────────────────


async def _build_kpi(scope: DashboardScope) -> dict[str, Any]:
    """Build KPI metrics from scope."""
    import asyncio

    async def safe_count(table: str, where: dict[str, Any]) -> int:
        try:
            return await _count(table, where)
        except Exception:
            return 0

    async def safe_sum(table: str, where: dict[str, Any], field: str) -> float:
        try:
            return await _sum_field(table, where, field)
        except Exception:
            return 0.0

    [
        total_equipment,
        active_equipment,
        total_revenue,
        pending_invoices,
        overdue_invoices,
        total_employees,
        low_stock_items,
    ] = await asyncio.gather(
        safe_count("Equipment", scope.equipment_where) if scope.can_see_equipment else asyncio.sleep(0, 0),
        safe_count("Equipment", {**scope.equipment_where, "status": "active"}) if scope.can_see_equipment else asyncio.sleep(0, 0),
        safe_sum("Invoice", {**scope.invoice_where, "status": "PAID"}, "total") if scope.can_see_revenue else asyncio.sleep(0, 0.0),
        safe_count("Invoice", {**scope.invoice_where, "status": "PENDING"}) if scope.can_see_revenue else asyncio.sleep(0, 0),
        safe_count("Invoice", {**scope.invoice_where, "status": "OVERDUE"}) if scope.can_see_revenue else asyncio.sleep(0, 0),
        safe_count("user", {"tenantId": scope.tenant_id, "isActive": True}) if scope.can_see_employees else asyncio.sleep(0, 0),
        _count_low_stock(scope) if scope.can_see_inventory else asyncio.sleep(0, 0),
    )

    # Customers
    if scope.can_see_customers:
        if scope.customer_count_override is not None:
            total_customers = scope.customer_count_override
        else:
            total_customers = await safe_count("customer", {"tenantId": scope.tenant_id, "isActive": True})
    else:
        total_customers = 0

    # Complaint status groups
    c_status_map: dict[str, int] = {}
    if scope.can_see_complaints:
        complaints = await _fetch_complaints(scope)
        c_status_map = _to_status_map(complaints)

    open_complaints = c_status_map.get("OPEN", c_status_map.get("NEW", 0))
    in_progress = c_status_map.get("IN_PROGRESS", c_status_map.get("ACCEPTED", 0))

    # Work order status groups
    wo_status_map: dict[str, int] = {}
    total_wo = 0
    if scope.can_see_work_orders:
        wo_list = await _fetch_work_orders(scope)
        wo_status_map = _to_status_map(wo_list)
        total_wo = sum(wo_status_map.values())

    pending_wo = wo_status_map.get("PENDING", 0)
    completed_wo = wo_status_map.get("COMPLETED", 0)

    # PM compliance
    pm_compliance = 0
    if scope.can_see_pm:
        pm_list = await _fetch_pm(scope)
        pm_compliance = _calc_pm_compliance(pm_list)

    return {
        "totalEquipment": total_equipment,
        "activeEquipment": active_equipment,
        "openComplaints": open_complaints,
        "inProgressComplaints": in_progress,
        "totalWorkOrders": total_wo,
        "pendingWorkOrders": pending_wo,
        "completedWorkOrders": completed_wo,
        "totalRevenue": total_revenue,
        "pendingInvoices": pending_invoices,
        "overdueInvoices": overdue_invoices,
        "pmCompliance": pm_compliance,
        "totalCustomers": total_customers,
        "totalEmployees": total_employees,
        "lowStockItems": low_stock_items,
        "accessLevel": scope.role,
    }


async def _build_full(scope: DashboardScope) -> dict[str, Any]:
    """Build full dashboard combining KPI + charts + recent."""
    kpi = await _build_kpi(scope)
    charts = await _build_charts(scope)
    recent = await _build_recent(scope)
    return {**kpi, **charts, **recent}


async def _build_charts(scope: DashboardScope) -> dict[str, Any]:
    """Build chart data."""
    import asyncio

    # Complaints by category
    complaints_by_category: list[dict[str, Any]] = []
    complaints_by_status: list[dict[str, Any]] = []
    monthly_revenue: list[dict[str, Any]] = []
    pm_compliance = 0
    upcoming_pm_counts: dict[str, int] = {"completed": 0, "overdue": 0, "scheduled": 0}

    if scope.can_see_complaints:
        complaints = await _fetch_complaints(scope)
        complaints_by_status = [{"status": c.get("status", "Unknown"), "count": c.get("count", 0)} for c in complaints]

        # Category distribution
        cat_result = await query_table(
            "Complaint", select="category,count",
            where={**scope.complaint_where, "category": {"isNotNull": True}},
        )
        cat_data = cat_result.get("data", [])
        complaints_by_category = [{"category": c.get("category", "Unknown"), "count": c.get("count", 0)} for c in cat_data]

    if scope.can_see_revenue:
        inv_result = await query_table(
            "Invoice", select="total,paidAt",
            where={**scope.invoice_where, "status": "PAID", "paidAt": {"isNotNull": True}},
        )
        monthly_revenue = _build_monthly_revenue(inv_result.get("data", []))

    if scope.can_see_pm:
        pm_list = await _fetch_pm(scope)
        pm_compliance = _calc_pm_compliance(pm_list)
        upcoming_pm_counts = {
            "completed": sum(1 for pm in pm_list if pm.get("status") == "completed"),
            "overdue": sum(1 for pm in pm_list if pm.get("status") == "overdue"),
            "scheduled": sum(1 for pm in pm_list if pm.get("status") in ("scheduled", "active")),
        }

    return {
        "monthlyRevenue": monthly_revenue,
        "complaintsByCategory": complaints_by_category,
        "complaintsByStatus": complaints_by_status,
        "pmCompliance": pm_compliance,
        "upcomingPmCounts": upcoming_pm_counts,
    }


async def _build_recent(scope: DashboardScope) -> dict[str, Any]:
    """Build recent activity."""
    import asyncio

    async def _recent_complaints():
        if not scope.can_see_complaints:
            return []
        result = await query_table(
            "Complaint",
            select="id,tenantId,customerId,equipmentId,title,description,priority,status,category,assignedToId,supervisorId,createdAt,updatedAt,resolvedAt,closedAt",
            where=scope.complaint_where,
            order="createdAt.desc",
            limit=5,
        )
        return await _enrich_complaints(result.get("data", []))

    async def _recent_work_orders():
        if not scope.can_see_work_orders:
            return []
        result = await query_table(
            "WorkOrder",
            select="id,tenantId,complaintId,equipmentId,title,description,status,priority,type,assignedToId,scheduledDate,completedAt,totalCost,createdAt,updatedAt",
            where=scope.work_order_where,
            order="createdAt.desc",
            limit=5,
        )
        rows = result.get("data", [])
        # Dedup if secondary where exists
        if scope.work_order_secondary_where:
            result2 = await query_table(
                "WorkOrder",
                select="id,tenantId,complaintId,equipmentId,title,description,status,priority,type,assignedToId,scheduledDate,completedAt,totalCost,createdAt,updatedAt",
                where=scope.work_order_secondary_where,
                order="createdAt.desc",
                limit=5,
            )
            seen = {r["id"] for r in rows}
            for r in result2.get("data", []):
                if r["id"] not in seen:
                    rows.append(r)
                    seen.add(r["id"])
            rows = rows[:5]
        return await _enrich_work_orders(rows)

    async def _upcoming_pm():
        if not scope.can_see_pm:
            return []
        now_iso = datetime.now(timezone.utc).isoformat()
        result = await query_table(
            "PmSchedule",
            select="id,tenantId,equipmentId,title,description,frequency,lastExecuted,nextDueDate,assignedToId,status,createdAt,updatedAt",
            where={**scope.pm_where, "status": "active", "nextDueDate": {"gte": now_iso}},
            order="nextDueDate.asc",
            limit=6,
        )
        return await _enrich_pm(result.get("data", []))

    [recent_complaints, recent_work_orders, upcoming_pm] = await asyncio.gather(
        _recent_complaints(),
        _recent_work_orders(),
        _upcoming_pm(),
    )

    return {
        "recentComplaints": recent_complaints,
        "recentWorkOrders": recent_work_orders,
        "upcomingPm": upcoming_pm,
    }


# ── Enrichment helpers ───────────────────────────────────────────────────


async def _enrich_complaints(complaints: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not complaints:
        return []
    customer_ids = list({c.get("customerId") for c in complaints if c.get("customerId")})
    assignee_ids = list({c.get("assignedToId") for c in complaints if c.get("assignedToId")})
    supervisor_ids = list({c.get("supervisorId") for c in complaints if c.get("supervisorId")})

    import asyncio
    [customers, assignees, supervisors] = await asyncio.gather(
        _name_lookup("customer", customer_ids) if customer_ids else asyncio.sleep(0, {}),
        _name_lookup("user", assignee_ids) if assignee_ids else asyncio.sleep(0, {}),
        _name_lookup("user", supervisor_ids) if supervisor_ids else asyncio.sleep(0, {}),
    )

    for c in complaints:
        c["customerName"] = customers.get(c.get("customerId"))
        c["assignedToName"] = assignees.get(c.get("assignedToId"))
        c["supervisorName"] = supervisors.get(c.get("supervisorId"))
    return complaints


async def _enrich_work_orders(work_orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not work_orders:
        return []
    assignee_ids = list({wo.get("assignedToId") for wo in work_orders if wo.get("assignedToId")})
    equipment_ids = list({wo.get("equipmentId") for wo in work_orders if wo.get("equipmentId")})

    import asyncio
    [assignees, equipment] = await asyncio.gather(
        _name_lookup("user", assignee_ids) if assignee_ids else asyncio.sleep(0, {}),
        _name_lookup("Equipment", equipment_ids) if equipment_ids else asyncio.sleep(0, {}),
    )

    for wo in work_orders:
        wo["assignedToName"] = assignees.get(wo.get("assignedToId"))
        wo["equipmentName"] = equipment.get(wo.get("equipmentId"))
    return work_orders


async def _enrich_pm(pm_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not pm_list:
        return []
    assignee_ids = list({pm.get("assignedToId") for pm in pm_list if pm.get("assignedToId")})
    equipment_ids = list({pm.get("equipmentId") for pm in pm_list if pm.get("equipmentId")})

    import asyncio
    [assignees, equipment] = await asyncio.gather(
        _name_lookup("user", assignee_ids) if assignee_ids else asyncio.sleep(0, {}),
        _name_lookup("Equipment", equipment_ids) if equipment_ids else asyncio.sleep(0, {}),
    )

    for pm in pm_list:
        pm["assignedToName"] = assignees.get(pm.get("assignedToId"))
        pm["equipmentName"] = equipment.get(pm.get("equipmentId"))
    return pm_list


async def _name_lookup(table: str, ids: list[str]) -> dict[str, str]:
    """Fetch id→name mapping for a list of IDs."""
    if not ids:
        return {}
    result = await query_table(table, select="id,name", where={"id": {"in": ids}})
    return {r["id"]: r.get("name") for r in result.get("data", []) if r.get("id")}


async def _fetch_complaints(scope: DashboardScope) -> list[dict[str, Any]]:
    """Fetch complaints with status counts."""
    # PostgREST doesn't have groupBy, so we fetch all matching and aggregate
    result = await query_table(
        "Complaint", select="id,status", where=scope.complaint_where
    )
    rows = result.get("data", [])
    # Aggregate status counts
    status_counts: dict[str, int] = {}
    for r in rows:
        s = r.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
    return [{"status": s, "count": c} for s, c in status_counts.items()]


async def _fetch_work_orders(scope: DashboardScope) -> list[dict[str, Any]]:
    """Fetch work orders with status counts."""
    result = await query_table(
        "WorkOrder", select="id,status", where=scope.work_order_where
    )
    rows = result.get("data", [])
    status_counts: dict[str, int] = {}
    for r in rows:
        s = r.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    # Merge secondary where if present
    if scope.work_order_secondary_where:
        result2 = await query_table(
            "WorkOrder", select="id,status", where=scope.work_order_secondary_where
        )
        for r in result2.get("data", []):
            s = r.get("status", "unknown")
            status_counts[s] = status_counts.get(s, 0) + 1

    return [{"status": s, "count": c} for s, c in status_counts.items()]


async def _fetch_pm(scope: DashboardScope) -> list[dict[str, Any]]:
    """Fetch PM schedules."""
    result = await query_table("PmSchedule", select="status", where=scope.pm_where)
    return result.get("data", [])


async def _count_low_stock(scope: DashboardScope) -> int:
    """Count inventory items at or below minimum stock."""
    result = await query_table(
        "InventoryItem", select="quantity,minStock",
        where={"tenantId": scope.tenant_id, "isActive": True},
    )
    data = result.get("data", [])
    return sum(1 for item in data
               if float(item.get("quantity", 0) or 0) <= float(item.get("minStock", 0) or 0))


async def _get_customer_id(tenant_id: str, user_id: str) -> str | None:
    """Find the Customer record linked to a user."""
    user_result = await query_table("user", select="email,phone", where={"id": user_id}, limit=1)
    user_data = user_result.get("data", [])
    if not user_data:
        return None

    or_conds: list[dict[str, Any]] = []
    if user_data[0].get("email"):
        or_conds.append({"email": user_data[0]["email"]})
    if user_data[0].get("phone"):
        or_conds.append({"phone": user_data[0]["phone"]})

    if not or_conds:
        return None

    cust_result = await query_table(
        "customer", select="id", where={"tenantId": tenant_id, "OR": or_conds}, limit=1
    )
    cust_data = cust_result.get("data", [])
    return cust_data[0]["id"] if cust_data else None
