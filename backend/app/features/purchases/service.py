"""
Purchase order business logic.

MOHD.HMS ENTERPRISE
"""

import json
import secrets
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

PO_TABLE = MODEL_TO_TABLE.get("purchaseOrder", "PurchaseOrder")

VALID_STATUSES = ("DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "RECEIVED", "CANCELLED")


def _generate_po_number() -> str:
    """Generate a PO number: PO-YYYYMMDD-XXXXX."""
    now = datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m%d")
    seq = secrets.randbelow(100000)
    return f"PO-{date_part}-{seq:05d}"


async def list_purchase_orders(
    tenant_id: str,
    user: AuthUser,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List purchase orders with pagination, search, and status filter."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"supplier": {"contains": search}},
            {"poNumber": {"contains": search}},
        ]
    if status:
        where["status"] = status

    offset = (page - 1) * page_size

    result = await query_table(
        PO_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    orders = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(orders)

    return {
        "data": orders,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def create_purchase_order(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new purchase order with auto-generated PO number."""
    if not data.get("supplier"):
        raise ValidationException(message="Supplier is required")

    po_number = _generate_po_number()
    status = data.get("status", "DRAFT")
    if status not in VALID_STATUSES:
        status = "DRAFT"

    record = {
        "tenantId": tenant_id,
        "poNumber": po_number,
        "supplier": data["supplier"],
        "supplierContact": data.get("supplierContact"),
        "items": json.dumps(data["items"]) if data.get("items") else None,
        "subtotal": data.get("subtotal", 0),
        "tax": data.get("tax", 0),
        "total": data.get("total", 0),
        "status": status,
        "expectedDate": data.get("expectedDate"),
        "notes": data.get("notes"),
    }

    return await insert_record(PO_TABLE, record)
