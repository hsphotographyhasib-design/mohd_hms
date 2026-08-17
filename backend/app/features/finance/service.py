"""
Finance business logic — revenue metrics, invoice summaries, payment summaries.

MOHD.HMS ENTERPRISE
"""

from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import MODEL_TO_TABLE, query_table, count_records
from app.core.logging import get_logger

log = get_logger(__name__)

INVOICE_TABLE = MODEL_TO_TABLE.get("invoice", "Invoice")
WORK_ORDER_TABLE = MODEL_TO_TABLE.get("workOrder", "WorkOrder")


async def get_finance_metrics(tenant_id: str) -> dict[str, Any]:
    """Get finance metrics: revenue, expenses, collection rate, monthly breakdown."""

    # Paid invoices total
    paid_result = await query_table(
        INVOICE_TABLE,
        select="total",
        where={"status": "PAID"},
        tenant_id=tenant_id,
    )
    paid_invoices = paid_result.get("data", [])
    total_revenue = sum(float(inv.get("total", 0)) for inv in paid_invoices)

    # Pending revenue (PENDING + APPROVED)
    pending_result = await query_table(
        INVOICE_TABLE,
        select="total",
        where={"status": {"in": ["PENDING", "APPROVED"]}},
        tenant_id=tenant_id,
    )
    pending_invoices = pending_result.get("data", [])
    pending_revenue = sum(float(inv.get("total", 0)) for inv in pending_invoices)

    # Overdue revenue
    overdue_result = await query_table(
        INVOICE_TABLE,
        select="total",
        where={"status": "OVERDUE"},
        tenant_id=tenant_id,
    )
    overdue_invoices = overdue_result.get("data", [])
    overdue_amount = sum(float(inv.get("total", 0)) for inv in overdue_invoices)

    # Outstanding invoices (PENDING + APPROVED + OVERDUE)
    outstanding_amount = pending_revenue + overdue_amount

    # Collection rate
    total_billed = total_revenue + outstanding_amount
    collection_rate = round((total_revenue / total_billed) * 100, 1) if total_billed > 0 else 0

    # Expenses from completed work orders
    wo_result = await query_table(
        WORK_ORDER_TABLE,
        select="totalCost",
        where={"status": "COMPLETED"},
        tenant_id=tenant_id,
    )
    work_orders = wo_result.get("data", [])
    total_expenses = sum(float(wo.get("totalCost", 0)) for wo in work_orders)

    # All invoices for status counts and monthly revenue
    all_invoices_result = await query_table(
        INVOICE_TABLE,
        select="status,total,paidAt",
        tenant_id=tenant_id,
    )
    all_invoices = all_invoices_result.get("data", [])

    # Invoice status counts
    status_counts: dict[str, int] = {}
    for inv in all_invoices:
        s = inv.get("status") or "DRAFT"
        status_counts[s] = status_counts.get(s, 0) + 1

    invoice_status_counts = [
        {"status": "DRAFT", "count": status_counts.get("DRAFT", 0)},
        {"status": "PENDING", "count": status_counts.get("PENDING", 0)},
        {"status": "APPROVED", "count": status_counts.get("APPROVED", 0)},
        {"status": "PAID", "count": status_counts.get("PAID", 0)},
        {"status": "OVERDUE", "count": status_counts.get("OVERDUE", 0)},
        {"status": "CANCELLED", "count": status_counts.get("CANCELLED", 0)},
    ]

    # Monthly revenue for last 6 months
    monthly_revenue = _compute_monthly_revenue(paid_invoices)

    return {
        "totalRevenue": total_revenue,
        "pendingRevenue": pending_revenue,
        "outstandingAmount": outstanding_amount,
        "collectionRate": collection_rate,
        "totalExpenses": total_expenses,
        "monthlyRevenue": monthly_revenue,
        "invoiceStatusCounts": invoice_status_counts,
    }


def _compute_monthly_revenue(paid_invoices: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Compute monthly revenue for the last 6 months from paid invoices."""
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    monthly: list[dict[str, Any]] = []

    for i in range(5, -1, -1):
        month_start = datetime(now.year, now.month - i, 1, tzinfo=timezone.utc)
        if now.month - i <= 0:
            month_start = datetime(now.year - 1, 12 + (now.month - i), 1, tzinfo=timezone.utc)
        month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(seconds=1)

        month_name = month_start.strftime("%b '%y")

        month_total = 0
        for inv in paid_invoices:
            paid_at = inv.get("paidAt")
            if not paid_at:
                continue
            try:
                paid_dt = datetime.fromisoformat(str(paid_at).replace("Z", "+00:00"))
                if month_start <= paid_dt <= month_end:
                    month_total += float(inv.get("total", 0))
            except (ValueError, TypeError):
                continue

        monthly.append({
            "month": month_name,
            "revenue": round(month_total, 2),
        })

    return monthly
