"""
Reports business logic.

MOHD.HMS ENTERPRISE

Returns summary statistics for complaints, work orders, invoices, and
equipment with date range filtering.
"""

from typing import Any

from app.core.database import (
    MODEL_TO_TABLE,
    query_table,
)
from app.core.logging import get_logger

log = get_logger(__name__)

# Table name constants
COMPLAINT_TABLE = MODEL_TO_TABLE.get("complaint", "Complaint")
WORK_ORDER_TABLE = MODEL_TO_TABLE.get("workOrder", "WorkOrder")
INVOICE_TABLE = MODEL_TO_TABLE.get("invoice", "Invoice")
EQUIPMENT_TABLE = MODEL_TO_TABLE.get("equipment", "Equipment")


async def _count_by_status(
    table: str,
    tenant_id: str,
    status_field: str,
    start_date: str | None,
    end_date: str | None,
) -> dict[str, Any]:
    """Count records in a table grouped by status, with optional date filtering."""
    where: dict[str, Any] = {}
    if start_date:
        where["createdAt"] = {"gte": start_date}
    if end_date:
        where["createdAt"] = {"lte": end_date}
    if start_date and end_date:
        where["createdAt"] = {"gte": start_date, "lte": end_date}

    result = await query_table(
        table,
        select=f"{status_field},id",
        where=where,
        tenant_id=tenant_id,
        limit=10000,
    )

    records = result.get("data", [])
    by_status: dict[str, int] = {}
    for record in records:
        status_val = record.get(status_field, "unknown") or "unknown"
        by_status[status_val] = by_status.get(status_val, 0) + 1

    return {
        "total": len(records),
        "byStatus": by_status,
    }


async def get_summary_reports(
    tenant_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """Get summary statistics across complaints, work orders, invoices, and equipment.

    All queries are run in parallel for performance.
    """
    import asyncio

    complaints_task = _count_by_status(
        COMPLAINT_TABLE, tenant_id, "status", start_date, end_date
    )
    work_orders_task = _count_by_status(
        WORK_ORDER_TABLE, tenant_id, "status", start_date, end_date
    )
    invoices_task = _count_by_status(
        INVOICE_TABLE, tenant_id, "status", start_date, end_date
    )
    equipment_task = _count_by_status(
        EQUIPMENT_TABLE, tenant_id, "status", start_date, end_date
    )

    results = await asyncio.gather(
        complaints_task,
        work_orders_task,
        invoices_task,
        equipment_task,
    )

    return {
        "success": True,
        "data": {
            "complaints": results[0],
            "workOrders": results[1],
            "invoices": results[2],
            "equipment": results[3],
            "dateRange": {
                "startDate": start_date,
                "endDate": end_date,
            },
        },
    }