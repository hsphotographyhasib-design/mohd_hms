"""
Quotation business logic — financial calculations are SERVER-AUTHORITATIVE.

MOHD.HMS ENTERPRISE

Implements:
  - Backend-authoritative financial calculations (NEVER trust frontend totals)
  - Line item types: inventory, labour, service, custom
  - Quotation lifecycle: DRAFT→REVIEW→APPROVED→SENT→ACCEPTED→CONVERTED
  - RBAC data-scope filtering
  - Status transition validation
  - Quotation number generation (QTN/TENANT_CODE/MM/NNNN)
  - Convert to Work Order and Invoice
  - Email and WhatsApp integration
  - PDF data generation
  - Smart search for customers and inventory
  - Item suggestions from historical data
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    count_records,
    delete_record,
    insert_record,
    query_table,
    resolve_includes,
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
from app.utils.helpers import utcnow

log = get_logger(__name__)

# ── Table constants ──────────────────────────────────────────────────────────

QUOTATION_TABLE = MODEL_TO_TABLE.get("quotation", "Quotation")
WORK_ORDER_TABLE = MODEL_TO_TABLE.get("workOrder", "WorkOrder")
INVOICE_TABLE = MODEL_TO_TABLE.get("invoice", "Invoice")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")
TENANT_TABLE = MODEL_TO_TABLE.get("tenant", "Tenant")
INVENTORY_TABLE = MODEL_TO_TABLE.get("inventoryItem", "InventoryItem")

# ── Status transitions ───────────────────────────────────────────────────────

QUOTATION_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "DRAFT": {"REVIEW", "REJECTED"},
    "REVIEW": {"APPROVED", "REJECTED", "DRAFT"},
    "APPROVED": {"SENT", "DRAFT"},
    "SENT": {"ACCEPTED", "EXPIRED"},
    "ACCEPTED": {"CONVERTED_WO", "CONVERTED_INVOICE", "CLOSED"},
    "REJECTED": {"DRAFT"},
    "EXPIRED": {"DRAFT"},
    "CONVERTED_WO": {"CLOSED", "PAID"},
    "CONVERTED_INVOICE": {"PAID", "CLOSED"},
    "PAID": {"CLOSED"},
    "CLOSED": set(),
}


# ── FINANCIAL CALCULATIONS (AUTHORITATIVE) ────────────────────────────────────
#
# CRITICAL: These calculations are the single source of truth.
# Frontend-submitted totals are IGNORED.


def _round2(v: float) -> float:
    """Round to 2 decimal places."""
    return round(v, 2)


def calculate_line_item(item: dict[str, Any]) -> dict[str, Any]:
    """Calculate computed fields for a single line item.

    Formula:
      line_subtotal = quantity * unitPrice
      line_discount_amount = line_subtotal * (discount / 100)
      line_tax_amount = (line_subtotal - line_discount_amount) * (taxRate / 100)
      line_total = line_subtotal - line_discount_amount + line_tax_amount
    """
    qty = float(item.get("quantity") or 0)
    price = float(item.get("unitPrice") or item.get("rate") or 0)
    item_discount = float(item.get("discount") or 0)
    item_tax_rate = float(item.get("taxRate") or 0)

    line_subtotal = _round2(qty * price)
    line_discount_amount = _round2(line_subtotal * (item_discount / 100))
    line_tax_amount = _round2((line_subtotal - line_discount_amount) * (item_tax_rate / 100))
    line_total = _round2(line_subtotal - line_discount_amount + line_tax_amount)

    # Build the enriched item preserving all original fields
    enriched = dict(item)
    enriched["lineSubtotal"] = line_subtotal
    enriched["lineDiscountAmount"] = line_discount_amount
    enriched["lineTaxAmount"] = line_tax_amount
    enriched["lineTotal"] = line_total
    # Legacy amount field for frontend compat
    if "amount" not in enriched or not enriched.get("amount"):
        enriched["amount"] = line_total
    return enriched


def calculate_quotation_totals(
    items: list[dict[str, Any]],
    header_tax_rate: float = 0,
    header_discount: float = 0,
    header_shipping: float = 0,
) -> dict[str, float]:
    """Calculate ALL financial totals from line items.

    This is the AUTHORITATIVE calculation. Frontend totals are ignored.

    Returns dict with: subtotal, labour_cost, material_cost,
    discount_amount, tax_amount, shipping_amount, total
    """
    subtotal = 0.0
    labour_cost = 0.0
    material_cost = 0.0

    enriched_items = []
    for item in items:
        enriched = calculate_line_item(item)
        enriched_items.append(enriched)
        item_type = (item.get("itemType") or "custom").lower()
        line_total = enriched["lineTotal"]
        line_subtotal = enriched["lineSubtotal"]
        subtotal += line_subtotal
        if item_type == "labour":
            labour_cost += line_total
        elif item_type == "inventory":
            material_cost += line_total

    subtotal = _round2(subtotal)
    labour_cost = _round2(labour_cost)
    material_cost = _round2(material_cost)

    discount_amount = _round2(subtotal * (header_discount / 100))
    tax_amount = _round2((subtotal - discount_amount) * (header_tax_rate / 100))
    shipping_amount = _round2(header_shipping)
    total = _round2(subtotal - discount_amount + tax_amount + shipping_amount)

    return {
        "subtotal": subtotal,
        "labour_cost": labour_cost,
        "material_cost": material_cost,
        "discount_amount": discount_amount,
        "tax_amount": tax_amount,
        "shipping_amount": shipping_amount,
        "total": total,
        "tax": tax_amount,  # DB column name is 'tax'
    }


def _prepare_items_for_db(items: list[dict[str, Any]]) -> str:
    """Serialize items to JSON string for database storage."""
    enriched = [calculate_line_item(item) for item in items]
    return json.dumps(enriched)


# ── Quotation number generation ─────────────────────────────────────────────


async def _generate_quotation_number(tenant_id: str) -> str:
    """Generate quotation number: QTN/TENANT_CODE/MM/NNNN.

    Tenant code = first 4 chars of tenant name (uppercased).
    Sequential = count of quotations this month + 1, zero-padded to 4.
    """
    now = datetime.now(timezone.utc)
    month = now.strftime("%m")
    year = now.year
    month_start = datetime(year, now.month, 1, tzinfo=timezone.utc).isoformat()
    month_end = datetime(year, now.month + 1, 1, tzinfo=timezone.utc).isoformat() if now.month < 12 else datetime(year + 1, 1, 1, tzinfo=timezone.utc).isoformat()

    tenant_result = await query_table(
        TENANT_TABLE,
        where={"id": tenant_id},
        select="name",
        limit=1,
    )
    tenants = tenant_result.get("data", [])
    tenant_code = tenants[0]["name"][:4].upper() if tenants else "HMS"

    count = await count_records(
        QUOTATION_TABLE,
        where={
            "tenantId": tenant_id,
            "createdAt": {"gte": month_start, "lte": month_end},
        },
    )
    sequential = str(count + 1).zfill(4)
    return f"QTN/{tenant_code}/{month}/{sequential}"


# ── List quotations ─────────────────────────────────────────────────────────


async def list_quotations(
    tenant_id: str,
    user: AuthUser,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    status: str = "",
    customer_id: str = "",
    stats: bool = False,
) -> dict[str, Any]:
    """List quotations with RBAC scoping, search, and optional stats."""
    # Resolve customer_id for customer role
    cust_id = None
    if user.role == "customer":
        cust_result = await query_table(
            CUSTOMER_TABLE,
            where={"userId": user.userId, "tenantId": tenant_id},
            select="id",
            limit=1,
        )
        cust_records = cust_result.get("data", [])
        cust_id = cust_records[0]["id"] if cust_records else None

    data_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="quotation",
        customer_id=cust_id,
    )
    if data_scope is NEVER_MATCH:
        raise ForbiddenException(message="No access to quotations")

    where: dict[str, Any] = {**data_scope}

    if search:
        where["OR"] = [
            {"title": {"contains": search}},
            {"description": {"contains": search}},
            {"quotationNo": {"contains": search}},
            {"referenceNo": {"contains": search}},
        ]
    if status:
        where["status"] = status
    if customer_id:
        where["customerId"] = customer_id

    # Stats mode
    if stats:
        rbac_where = {**data_scope}
        if customer_id:
            rbac_where["customerId"] = customer_id

        total_count = await count_records(QUOTATION_TABLE, where=rbac_where)
        draft_count = await count_records(QUOTATION_TABLE, where={**rbac_where, "status": "DRAFT"})
        pending_count = await count_records(
            QUOTATION_TABLE,
            where={**rbac_where, "status": {"in": ["REVIEW", "SENT", "APPROVED"]}},
        )
        accepted_count = await count_records(QUOTATION_TABLE, where={**rbac_where, "status": "ACCEPTED"})
        paid_count = await count_records(QUOTATION_TABLE, where={**rbac_where, "status": "PAID"})

        return {
            "total": total_count,
            "totalValue": 0,  # Would need aggregate; lightweight stats
            "draft": draft_count,
            "pendingAction": pending_count,
            "accepted": accepted_count,
            "paid": paid_count,
        }

    # List mode
    offset = (page - 1) * page_size
    result = await query_table(
        QUOTATION_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=None,  # Already in data_scope
    )

    rows = await resolve_includes(result.get("data", []), "*,customer:Customer(name,phone,email)")
    total = int(result.get("count", 0) or 0)

    data = []
    for q in rows:
        customer = q.get("customer")
        if isinstance(customer, dict):
            customer_name = customer.get("name")
            # Remove the nested object from top level
            q.pop("customer", None)
        else:
            customer_name = None

        q["customerName"] = customer_name
        data.append(q)

    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


# ── Create quotation ─────────────────────────────────────────────────────────


async def create_quotation(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new quotation with server-authoritative financial calculations."""
    require_permission("quotation.create", user.role)

    customer_id = data.get("customerId")
    title = data.get("title")
    if not customer_id or not title:
        raise ValidationException(message="Customer and title are required")

    items = data.get("items", [])
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except (json.JSONDecodeError, TypeError):
            items = []
    if not isinstance(items, list):
        items = []

    tax_rate = float(data.get("taxRate") or 0)
    discount = float(data.get("discount") or 0)
    shipping = float(data.get("shipping") or 0)

    # AUTHORITATIVE: Calculate all totals from line items
    totals = calculate_quotation_totals(items, tax_rate, discount, shipping)

    quotation_no = await _generate_quotation_number(tenant_id)

    now_iso = utcnow().isoformat()
    record: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "customerId": customer_id,
        "quotationNo": quotation_no,
        "title": title,
        "description": data.get("description") or None,
        "referenceNo": data.get("referenceNo") or None,
        "projectName": data.get("projectName") or None,
        "site": data.get("site") or None,
        "preparedBy": user.userId,
        "items": _prepare_items_for_db(items),
        "terms": json.dumps(data["terms"]) if data.get("terms") else None,
        "currency": data.get("currency") or "BND",
        "subtotal": totals["subtotal"],
        "taxRate": tax_rate,
        "tax": totals["tax"],
        "discount": discount,
        "shipping": shipping,
        "total": totals["total"],
        "status": "DRAFT",
        "validUntil": data.get("validUntil") or None,
        "notes": data.get("notes") or None,
        "complaintId": data.get("complaintId") or None,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    created = await insert_record(QUOTATION_TABLE, record)

    # Fetch with customer name
    detail = await _enrich_quotation(created, tenant_id)
    return detail


# ── Get quotation ─────────────────────────────────────────────────────────────


async def get_quotation(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get a single quotation by ID with RBAC check."""
    require_permission("quotation.view", user.role)

    result = await query_table(
        QUOTATION_TABLE,
        select="*",
        where={"id": quotation_id, "tenantId": tenant_id},
        limit=1,
        tenant_id=None,
    )
    rows = await resolve_includes(result.get("data", []), "*,customer:Customer(name,phone,email,address,companyName,pic),preparedByUser:User!preparedBy(name)")
    if not rows:
        raise NotFoundException(resource="Quotation", message="Quotation not found")

    return _format_quotation_detail(rows[0])


# ── Update quotation ─────────────────────────────────────────────────────────


async def update_quotation(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update a quotation with server-authoritative recalculation."""
    require_permission("quotation.update", user.role)

    # Fetch existing
    existing = await _fetch_quotation(quotation_id, tenant_id)
    if not existing:
        raise NotFoundException(resource="Quotation")

    update_data: dict[str, Any] = {"updatedAt": utcnow().isoformat()}

    field_map = {
        "title": "title", "description": "description",
        "referenceNo": "referenceNo", "projectName": "projectName",
        "site": "site", "preparedBy": "preparedBy",
        "complaintId": "complaintId", "currency": "currency",
        "validUntil": "validUntil", "pdfUrl": "pdfUrl",
        "notes": "notes",
    }
    for req_key, db_key in field_map.items():
        if req_key in data:
            update_data[db_key] = data[req_key] if data[req_key] else None

    if "terms" in data:
        update_data["terms"] = json.dumps(data["terms"]) if data["terms"] else None

    # Check if recalculation is needed
    needs_recalc = (
        "items" in data
        or "taxRate" in data
        or "discount" in data
        or "shipping" in data
    )

    if needs_recalc:
        # Get items (new or existing)
        if "items" in data:
            items = data["items"]
            if isinstance(items, str):
                try:
                    items = json.loads(items)
                except (json.JSONDecodeError, TypeError):
                    items = []
            update_data["items"] = _prepare_items_for_db(items if isinstance(items, list) else [])
        else:
            try:
                items = json.loads(existing.get("items") or "[]")
            except (json.JSONDecodeError, TypeError):
                items = []

        tax_rate = float(data.get("taxRate", existing.get("taxRate") or 0))
        discount = float(data.get("discount", existing.get("discount") or 0))
        shipping = float(data.get("shipping", existing.get("shipping") or 0))

        if "taxRate" in data:
            update_data["taxRate"] = tax_rate
        if "discount" in data:
            update_data["discount"] = discount
        if "shipping" in data:
            update_data["shipping"] = shipping

        totals = calculate_quotation_totals(items, tax_rate, discount, shipping)
        update_data["subtotal"] = totals["subtotal"]
        update_data["tax"] = totals["tax"]
        update_data["total"] = totals["total"]

    updated = await update_record(QUOTATION_TABLE, quotation_id, update_data)
    detail = await _enrich_quotation(updated, tenant_id)
    return detail


# ── Delete quotation ─────────────────────────────────────────────────────────


async def delete_quotation(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
) -> None:
    """Delete a quotation (admin only, draft only)."""
    require_permission("quotation.delete", user.role)

    existing = await _fetch_quotation(quotation_id, tenant_id)
    if not existing:
        raise NotFoundException(resource="Quotation")

    if existing.get("status") != "DRAFT":
        raise ValidationException(message="Only draft quotations can be deleted")

    await delete_record(QUOTATION_TABLE, quotation_id)


# ── Update status ─────────────────────────────────────────────────────────────


async def update_status(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
    status: str,
    notes: str | None = None,
) -> dict[str, Any]:
    """Update quotation status with transition validation."""
    require_permission("quotation.send", user.role)

    existing = await _fetch_quotation(quotation_id, tenant_id)
    if not existing:
        raise NotFoundException(resource="Quotation")

    current_status = existing.get("status", "DRAFT")
    allowed = QUOTATION_STATUS_TRANSITIONS.get(current_status, set())

    if status not in allowed:
        raise ValidationException(
            message=f"Invalid status transition from {current_status} to {status}. Allowed: {', '.join(sorted(allowed)) or 'none'}"
        )

    update_data: dict[str, Any] = {"status": status, "updatedAt": utcnow().isoformat()}

    if notes is not None:
        update_data["notes"] = notes or None

    now_iso = utcnow().isoformat()
    if status == "SENT":
        update_data["sentAt"] = now_iso
    elif status == "ACCEPTED":
        update_data["acceptedAt"] = now_iso
    elif status == "APPROVED":
        update_data["approvedAt"] = now_iso
        update_data["approvedBy"] = user.userId

    updated = await update_record(QUOTATION_TABLE, quotation_id, update_data)
    detail = await _enrich_quotation(updated, tenant_id)
    return detail


# ── Generate PDF data ─────────────────────────────────────────────────────────


async def generate_pdf_data(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Return data needed for PDF generation (no actual PDF — that's a frontend concern)."""
    require_permission("quotation.generate_pdf", user.role)

    quotation = await _fetch_quotation(quotation_id, tenant_id, with_customer=True, with_user=True)
    if not quotation:
        raise NotFoundException(resource="Quotation")

    customer = quotation.get("customer") or {}
    prep_user = quotation.get("preparedByUser") or {}

    return {
        "id": quotation["id"],
        "quotationNo": quotation.get("quotationNo"),
        "title": quotation.get("title"),
        "description": quotation.get("description"),
        "referenceNo": quotation.get("referenceNo"),
        "projectName": quotation.get("projectName"),
        "site": quotation.get("site"),
        "preparedByName": prep_user.get("name") or quotation.get("preparedBy"),
        "salesPerson": prep_user.get("name"),
        "items": quotation.get("items"),
        "terms": quotation.get("terms"),
        "currency": quotation.get("currency", "BND"),
        "subtotal": float(quotation.get("subtotal") or 0),
        "taxRate": float(quotation.get("taxRate") or 0),
        "tax": float(quotation.get("tax") or 0),
        "discount": float(quotation.get("discount") or 0),
        "shipping": float(quotation.get("shipping") or 0),
        "total": float(quotation.get("total") or 0),
        "status": quotation.get("status"),
        "validUntil": quotation.get("validUntil"),
        "notes": quotation.get("notes"),
        "createdAt": quotation.get("createdAt"),
        "customer": {
            "name": customer.get("name"),
            "phone": customer.get("phone"),
            "email": customer.get("email"),
            "address": customer.get("address"),
            "companyName": customer.get("companyName"),
            "pic": customer.get("pic"),
        } if customer else None,
    }


# ── Send email ────────────────────────────────────────────────────────────────


async def send_email_quotation(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
    to: str | None = None,
    subject: str | None = None,
    body: str | None = None,
    cc: str | None = None,
) -> dict[str, Any]:
    """Send quotation via email. Returns success status."""
    require_permission("quotation.send_email", user.role)

    quotation = await _fetch_quotation(quotation_id, tenant_id, with_customer=True, with_user=True)
    if not quotation:
        raise NotFoundException(resource="Quotation")

    customer = quotation.get("customer") or {}
    recipient = to or customer.get("email") or ""
    if not recipient:
        raise ValidationException(message="No recipient email available. Please provide a 'to' address.")

    customer_name = customer.get("companyName") or customer.get("name") or "Valued Customer"
    default_subject = f"Quotation {quotation.get('quotationNo') or quotation['id']} - {quotation.get('title')}"
    default_body = (f"We are pleased to provide you with our quotation for the services/items "
                    f"as detailed below. We have carefully prepared this proposal to meet your "
                    f"requirements and look forward to the opportunity to work with you.")

    try:
        from app.integrations.email import get_email_service
        email_svc = get_email_service()
        sent = await email_svc.send_email(
            to=recipient,
            subject=subject or default_subject,
            body=body or default_body,
            cc=cc.split(",") if cc else None,
            tenant_id=tenant_id,
            user_id=user.userId,
        )
    except Exception as exc:
        log.error(f"Failed to send quotation email: {exc}")
        raise

    # Update sentAt and optionally status
    update_data: dict[str, Any] = {"sentAt": utcnow().isoformat()}
    current_status = quotation.get("status")
    if current_status in ("DRAFT", "APPROVED"):
        update_data["status"] = "SENT"
    await update_record(QUOTATION_TABLE, quotation_id, update_data)

    # Invalidate cache
    try:
        from app.integrations.redis import get_redis
        redis = get_redis()
        await redis.invalidate_pattern(f"*quotations*{tenant_id}*")
    except Exception:
        pass

    return {"success": sent, "message": "Email sent successfully" if sent else "Email sending failed", "to": recipient}


# ── Send WhatsApp ─────────────────────────────────────────────────────────────


async def send_whatsapp_quotation(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
    generate_pdf: bool = False,
) -> dict[str, Any]:
    """Generate WhatsApp link for quotation. Returns link and message."""
    require_permission("quotation.send_whatsapp", user.role)

    quotation = await _fetch_quotation(quotation_id, tenant_id, with_customer=True)
    if not quotation:
        raise NotFoundException(resource="Quotation")

    customer = quotation.get("customer") or {}
    raw_phone = customer.get("phone") or ""
    digits_only = "".join(c for c in str(raw_phone) if c.isdigit())

    if not digits_only:
        raise ValidationException(message="Customer phone number is not available. Cannot generate WhatsApp link.")

    customer_name = customer.get("companyName") or customer.get("name") or "Valued Customer"
    quo_no = quotation.get("quotationNo") or quotation["id"]
    total = float(quotation.get("total") or 0)
    currency = quotation.get("currency") or "BND"
    valid_until = quotation.get("validUntil")
    title = quotation.get("title") or ""

    formatted_total = f"{currency} {total:,.2f}"
    formatted_date = "N/A"
    if valid_until:
        try:
            from datetime import datetime as dt
            parsed = dt.fromisoformat(valid_until.replace("Z", "+00:00"))
            formatted_date = parsed.strftime("%B %d, %Y")
        except Exception:
            pass

    message = (
        f"Dear {customer_name},\n\n"
        f"Thank you for your interest in our services. Please find below the summary of your quotation:\n\n"
        f"📋 *Quotation Details*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📄 Quotation No: *{quo_no}*\n"
        f"📝 Description: {title}\n"
        f"💰 Total Amount: *{formatted_total}*\n"
        f"📅 Valid Until: {formatted_date}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"The detailed quotation PDF will be shared separately for your review.\n\n"
        f"If you have any questions or require further clarification, please feel free to reach out to us.\n\n"
        f"Best regards,\n"
        f"*MOHD.HMS ENTERPRISE*\n"
    )

    import urllib.parse
    encoded_msg = urllib.parse.quote(message)
    whatsapp_link = f"https://wa.me/{digits_only}?text={encoded_msg}"

    result: dict[str, Any] = {
        "success": True,
        "whatsappLink": whatsapp_link,
        "message": message,
        "phone": digits_only,
    }
    if generate_pdf:
        result["pdfUrl"] = f"/api/v1/quotations/{quotation_id}/generate-pdf"

    return result


# ── Convert to Work Order ────────────────────────────────────────────────────


async def convert_to_work_order(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Convert a quotation to a Work Order."""
    require_permission("quotation.convert_to_wo", user.role)

    quotation = await _fetch_quotation(quotation_id, tenant_id)
    if not quotation:
        raise NotFoundException(resource="Quotation")

    status = quotation.get("status", "")
    if status not in ("DRAFT", "APPROVED", "SENT", "ACCEPTED"):
        raise ValidationException(message=f"Cannot convert quotation in {status} status to Work Order")

    # Parse items for description
    items_description = ""
    try:
        items = json.loads(quotation.get("items") or "[]")
        if isinstance(items, list):
            lines = []
            for i, item in enumerate(items, 1):
                desc = item.get("title") or item.get("description") or "Item"
                qty = item.get("quantity") or 0
                rate = item.get("rate") or item.get("unitPrice") or 0
                lines.append(f"{i}. {desc} — Qty: {qty} × {rate}")
            items_description = "\n".join(lines)
    except (json.JSONDecodeError, TypeError):
        items_description = quotation.get("title") or "Quotation work items"

    # Generate WO number
    from app.utils.helpers import generate_work_order_number
    wo_number = generate_work_order_number(tenant_id)

    wo_desc = f"{quotation.get('description') or quotation.get('title') or ''}\n\nItems:\n{items_description}"
    total = float(quotation.get("total") or 0)
    currency = quotation.get("currency") or "BND"

    wo_record: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "customerId": quotation["customerId"],
        "title": f"WO from Quotation {quotation.get('quotationNo')}",
        "description": wo_desc,
        "status": "PENDING",
        "priority": "medium",
        "type": "corrective",
        "createdBy": user.userId,
        "notes": f"Converted from Quotation {quotation.get('quotationNo')}. Total: {currency} {total:.2f}",
        "createdAt": utcnow().isoformat(),
        "updatedAt": utcnow().isoformat(),
    }

    wo = await insert_record(WORK_ORDER_TABLE, wo_record)

    # Update quotation status
    await update_record(QUOTATION_TABLE, quotation_id, {
        "status": "CONVERTED_WO",
        "updatedAt": utcnow().isoformat(),
    })

    return {
        "workOrderId": wo["id"],
        "workOrderNumber": wo_number,
        "quotationId": quotation_id,
        "quotationNo": quotation.get("quotationNo"),
        "message": f"Work Order {wo_number} created successfully from Quotation {quotation.get('quotationNo')}",
    }


# ── Convert to Invoice ────────────────────────────────────────────────────────


async def convert_to_invoice(
    quotation_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Convert a quotation to an Invoice."""
    require_permission("quotation.convert_to_invoice", user.role)

    quotation = await _fetch_quotation(quotation_id, tenant_id, with_customer=True)
    if not quotation:
        raise NotFoundException(resource="Quotation")

    status = quotation.get("status", "")
    if status not in ("DRAFT", "APPROVED", "SENT", "ACCEPTED"):
        raise ValidationException(message=f"Cannot convert quotation in {status} status to Invoice")

    # Parse items and map to invoice format
    try:
        parsed_items = json.loads(quotation.get("items") or "[]")
        if not isinstance(parsed_items, list):
            parsed_items = []
    except (json.JSONDecodeError, TypeError):
        parsed_items = []

    invoice_items = []
    for item in parsed_items:
        invoice_items.append({
            "title": item.get("title") or item.get("description") or "Item",
            "description": item.get("description") or "",
            "unit": item.get("unit") or "Nos",
            "quantity": item.get("quantity") or 0,
            "unitPrice": item.get("rate") or item.get("unitPrice") or 0,
            "amount": item.get("amount") or 0,
        })

    from app.utils.helpers import generate_invoice_number
    from datetime import timedelta
    due_date = (utcnow() + timedelta(days=30)).isoformat()

    customer = quotation.get("customer") or {}

    invoice_record: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "customerId": quotation["customerId"],
        "quotationId": quotation_id,
        "invoiceNumber": generate_invoice_number(tenant_id),
        "title": f"Invoice for {quotation.get('title') or quotation.get('projectName') or 'Services'}",
        "description": quotation.get("description"),
        "items": json.dumps(invoice_items),
        "subtotal": float(quotation.get("subtotal") or 0),
        "taxRate": float(quotation.get("taxRate") or 0),
        "tax": float(quotation.get("tax") or 0),
        "discount": float(quotation.get("discount") or 0),
        "shipping": float(quotation.get("shipping") or 0),
        "total": float(quotation.get("total") or 0),
        "status": "DRAFT",
        "currency": quotation.get("currency") or "BND",
        "referenceNo": quotation.get("referenceNo"),
        "dueDate": due_date,
        "notes": f"Converted from Quotation {quotation.get('quotationNo')}",
        "terms": quotation.get("terms"),
        "shipToName": customer.get("companyName") or customer.get("name"),
        "shipToAddress": quotation.get("site") or customer.get("address"),
        "shipToPhone": customer.get("phone"),
        "shipToContact": customer.get("pic"),
        "preparedBy": quotation.get("preparedBy"),
        "createdBy": user.userId,
        "createdAt": utcnow().isoformat(),
        "updatedAt": utcnow().isoformat(),
    }

    invoice = await insert_record(INVOICE_TABLE, invoice_record)

    # Update quotation status
    await update_record(QUOTATION_TABLE, quotation_id, {
        "status": "CONVERTED_INVOICE",
        "updatedAt": utcnow().isoformat(),
    })

    return {
        "invoiceId": invoice["id"],
        "invoiceNumber": invoice.get("invoiceNumber"),
        "quotationId": quotation_id,
        "quotationNo": quotation.get("quotationNo"),
        "message": f"Invoice {invoice.get('invoiceNumber')} created successfully from Quotation {quotation.get('quotationNo')}",
    }


# ── Get next number ───────────────────────────────────────────────────────────


async def get_next_number(tenant_id: str) -> dict[str, str]:
    """Get the next quotation number without creating a quotation."""
    quotation_no = await _generate_quotation_number(tenant_id)
    return {"quotationNo": quotation_no}


# ── Smart search customer ─────────────────────────────────────────────────────


async def smart_search_customer(
    tenant_id: str,
    q: str,
    limit: int = 8,
) -> dict[str, Any]:
    """Search customers by name, email, phone, company."""
    if len(q) < 1:
        return {"results": []}

    where = {
        "tenantId": tenant_id,
        "isActive": True,
        "OR": [
            {"name": {"contains": q}},
            {"companyName": {"contains": q}},
            {"email": {"contains": q}},
            {"phone": {"contains": q}},
            {"customerNumber": {"contains": q}},
        ],
    }

    result = await query_table(
        CUSTOMER_TABLE,
        select="id,name,companyName,email,phone,address,customerNumber,pic,country,district,taxRate,paymentTerms",
        where=where,
        order="companyName.asc,name.asc",
        limit=limit,
        tenant_id=None,
    )

    customers = result.get("data", [])
    return {"results": customers}


# ── Smart search inventory ─────────────────────────────────────────────────────


async def smart_search_inventory(
    tenant_id: str,
    q: str,
    limit: int = 10,
    item_type: str = "",
) -> dict[str, Any]:
    """Search inventory items and historical quotation items."""
    if len(q) < 2:
        return {"results": []}

    items = []

    # Search inventory items
    if not item_type or item_type == "inventory":
        inv_where = {
            "tenantId": tenant_id,
            "isActive": True,
            "OR": [
                {"name": {"contains": q}},
                {"sku": {"contains": q}},
                {"category": {"contains": q}},
                {"description": {"contains": q}},
                {"supplier": {"contains": q}},
            ],
        }
        result = await query_table(
            INVENTORY_TABLE,
            select="id,name,sku,category,description,unit,quantity,unitCost,supplier",
            where=inv_where,
            order="name.asc",
            limit=limit,
            tenant_id=None,
        )
        inv_items = result.get("data", [])
        items.extend([
            {
                **inv,
                "stockAvailable": inv.get("quantity"),
                "unitPrice": float(inv.get("unitCost") or 0),
                "itemType": "inventory",
                "useCount": 0,
            }
            for inv in inv_items
        ])

    # Fallback: search historical quotation items
    if len(items) < 3:
        try:
            q_result = await query_table(
                QUOTATION_TABLE,
                select="items",
                where={"tenantId": tenant_id, "items": {"isNotNull": True}},
                order="createdAt.desc",
                limit=100,
                tenant_id=None,
            )
            quotations = q_result.get("data", [])
            item_map: dict[str, dict] = {}
            q_low = q.lower()

            for qt in quotations:
                qt_items_raw = qt.get("items")
                if not qt_items_raw:
                    continue
                try:
                    parsed = json.loads(qt_items_raw) if isinstance(qt_items_raw, str) else qt_items_raw
                except (json.JSONDecodeError, TypeError):
                    continue
                if not isinstance(parsed, list):
                    continue
                for item in parsed:
                    title = (item.get("title") or "").lower()
                    if title and q_low in title:
                        key = item.get("title") or ""
                        existing = item_map.get(key)
                        if existing:
                            existing["useCount"] += 1
                        else:
                            item_map[key] = {
                                "title": item.get("title"),
                                "description": item.get("description"),
                                "unit": item.get("unit") or "Nos",
                                "rate": float(item.get("rate") or 0),
                                "category": item.get("category"),
                                "warranty": item.get("warranty"),
                                "itemType": "history",
                                "useCount": 1,
                            }

            fallback = sorted(item_map.values(), key=lambda x: -x["useCount"])
            items.extend(fallback[: max(0, limit - len(items))])
        except Exception:
            pass

    return {"results": items}


# ── Item suggestions ──────────────────────────────────────────────────────────


async def get_item_suggestions(
    tenant_id: str,
    q: str,
    limit: int = 10,
) -> dict[str, Any]:
    """Suggest items from historical quotation data."""
    if not q.strip() or len(q) < 2:
        return {"suggestions": []}

    q_low = q.lower()
    result = await query_table(
        QUOTATION_TABLE,
        select="items",
        where={"tenantId": tenant_id},
        order="createdAt.desc",
        limit=500,
        tenant_id=None,
    )

    quotations = result.get("data", [])
    item_map: dict[str, dict[str, Any]] = {}

    for qt in quotations:
        qt_items_raw = qt.get("items")
        if not qt_items_raw:
            continue
        try:
            parsed = json.loads(qt_items_raw) if isinstance(qt_items_raw, str) else qt_items_raw
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(parsed, list):
            continue

        for item in parsed:
            title = (item.get("title") or "").strip()
            if not title:
                continue
            key = title.lower()
            if key in item_map:
                item_map[key]["count"] += 1
                if item.get("description"):
                    item_map[key]["description"] = item["description"]
                if item.get("category"):
                    item_map[key]["category"] = item["category"]
                if item.get("warranty"):
                    item_map[key]["warranty"] = item["warranty"]
            else:
                item_map[key] = {
                    "title": title,
                    "description": item.get("description"),
                    "unit": item.get("unit") or "pcs",
                    "rate": float(item.get("rate") or 0),
                    "category": item.get("category"),
                    "warranty": item.get("warranty"),
                    "count": 1,
                }

    filtered = [
        v for v in item_map.values()
        if q_low in v["title"].lower() or (v.get("description") and q_low in v["description"].lower())
    ]
    filtered.sort(key=lambda x: (-x["count"], x["title"]))

    return {"suggestions": filtered[:limit]}


# ── Internal helpers ──────────────────────────────────────────────────────────


async def _fetch_quotation(
    quotation_id: str,
    tenant_id: str,
    with_customer: bool = False,
    with_user: bool = False,
) -> dict[str, Any] | None:
    """Fetch a single quotation from DB, returning raw dict or None."""
    includes = ""
    if with_customer and with_user:
        includes = "*,customer:Customer(name,phone,email,address,companyName,pic,district,country),preparedByUser:User!preparedBy(name)"
    elif with_customer:
        includes = "*,customer:Customer(name,phone,email,address,companyName,pic,district,country)"
    elif with_user:
        includes = "*,preparedByUser:User!preparedBy(name)"

    result = await query_table(
        QUOTATION_TABLE,
        select="*",
        where={"id": quotation_id, "tenantId": tenant_id},
        limit=1,
        tenant_id=None,
    )
    rows = await resolve_includes(result.get("data", []), includes) if includes else result.get("data", [])
    return rows[0] if rows else None


async def _enrich_quotation(quotation: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    """Add customer name to a quotation dict."""
    try:
        cust_result = await query_table(
            CUSTOMER_TABLE,
            select="name,phone,email,address,companyName,pic",
            where={"id": quotation.get("customerId")},
            limit=1,
            tenant_id=None,
        )
        customers = cust_result.get("data", [])
        if customers:
            quotation["customer"] = customers[0]
            quotation["customerName"] = customers[0].get("name")
    except Exception:
        pass

    return quotation


def _format_quotation_detail(q: dict[str, Any]) -> dict[str, Any]:
    """Format a quotation record for the detail response."""
    customer = q.pop("customer", None)
    prep_user = q.pop("preparedByUser", None)

    q["customerName"] = customer.get("name") if isinstance(customer, dict) else None
    q["preparedByName"] = prep_user.get("name") if isinstance(prep_user, dict) else None

    if customer and isinstance(customer, dict):
        q["customer"] = customer

    return q
