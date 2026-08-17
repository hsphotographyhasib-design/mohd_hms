"""
Invoice business logic — financial calculations are SERVER-AUTHORITATIVE.

MOHD.HMS ENTERPRISE

Implements:
  - Backend-authoritative financial calculations (NEVER trust frontend totals)
  - Invoice lifecycle: DRAFT→REVIEW→APPROVED→SENT→PAID
  - RBAC data-scope filtering
  - Status transition validation
  - Invoice number generation (INV/TENANT_CODE/MM/NNNN)
  - Email and WhatsApp integration
  - PDF data generation
  - Payment recording with automatic status updates
  - Smart search for customers and inventory
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
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.rbac.data_scope import NEVER_MATCH, build_data_scope
from app.rbac.permissions import require_permission
from app.utils.helpers import utcnow

log = get_logger(__name__)

# ── Table constants ───────────────────────────────────────────

INVOICE_TABLE = MODEL_TO_TABLE.get("invoice", "Invoice")
INVOICE_PAYMENT_TABLE = MODEL_TO_TABLE.get("invoicePayment", "InvoicePayment")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")
TENANT_TABLE = MODEL_TO_TABLE.get("tenant", "Tenant")
WORK_ORDER_TABLE = MODEL_TO_TABLE.get("workOrder", "WorkOrder")
QUOTATION_TABLE = MODEL_TO_TABLE.get("quotation", "Quotation")
INVENTORY_TABLE = MODEL_TO_TABLE.get("inventoryItem", "InventoryItem")

# ── Status transitions ───────────────────────────────────────────

INVOICE_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "DRAFT": {"REVIEW", "SENT", "CANCELLED"},
    "REVIEW": {"APPROVED", "DRAFT"},
    "APPROVED": {"SENT", "DRAFT"},
    "SENT": {"VIEWED", "PARTIALLY_PAID", "PAID", "CANCELLED"},
    "VIEWED": {"PARTIALLY_PAID", "PAID", "CANCELLED"},
    "PARTIALLY_PAID": {"PAID", "CANCELLED"},
    "PAID": {"CLOSED"},
    "OVERDUE": {"PAID", "CANCELLED"},
    "CANCELLED": set(),
    "CLOSED": set(),
}


# ── FINANCIAL CALCULATIONS (AUTHORITATIVE) ───────────────────────────


def _round2(v: float) -> float:
    return round(v, 2)


def calculate_line_item(item: dict[str, Any]) -> dict[str, Any]:
    qty = float(item.get("quantity") or 0)
    price = float(item.get("unitPrice") or item.get("rate") or 0)
    item_discount = float(item.get("discount") or 0)
    item_tax_rate = float(item.get("taxRate") or 0)

    line_subtotal = _round2(qty * price)
    line_discount_amount = _round2(line_subtotal * (item_discount / 100))
    line_tax_amount = _round2((line_subtotal - line_discount_amount) * (item_tax_rate / 100))
    line_total = _round2(line_subtotal - line_discount_amount + line_tax_amount)

    enriched = dict(item)
    enriched["lineSubtotal"] = line_subtotal
    enriched["lineDiscountAmount"] = line_discount_amount
    enriched["lineTaxAmount"] = line_tax_amount
    enriched["lineTotal"] = line_total
    if "amount" not in enriched or not enriched.get("amount"):
        enriched["amount"] = line_total
    return enriched


def calculate_invoice_totals(
    items: list[dict[str, Any]],
    header_tax_rate: float = 0,
    header_discount: float = 0,
    header_shipping: float = 0,
) -> dict[str, float]:
    subtotal = 0.0
    labour_cost = 0.0
    material_cost = 0.0

    for item in items:
        enriched = calculate_line_item(item)
        item_type = (item.get("itemType") or "custom").lower()
        line_total = enriched["lineTotal"]
        line_subtotal = enriched["lineSubtotal"]
        subtotal += line_subtotal
        if item_type == "labour":
            labour_cost += line_total
        elif item_type == "inventory":
            material_cost += line_total

    subtotal = _round2(subtotal)
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
        "tax": tax_amount,
    }


def _prepare_items_for_db(items: list[dict[str, Any]]) -> str:
    enriched = [calculate_line_item(item) for item in items]
    return json.dumps(enriched)


# ── Invoice number generation ───────────────────────────────────────


async def _generate_invoice_number(tenant_id: str) -> str:
    """Generate invoice number: INV/TENANT_CODE/MM/NNNN."""
    now = datetime.now(timezone.utc)
    month = now.strftime("%m")

    tenant_result = await query_table(
        TENANT_TABLE,
        where={"id": tenant_id},
        select="name",
        limit=1,
    )
    tenants = tenant_result.get("data", [])
    tenant_code = tenants[0]["name"][:4].upper() if tenants else "HMS"

    count = await count_records(INVOICE_TABLE, where={"tenantId": tenant_id})
    sequential = str(count + 1).zfill(4)
    return f"INV/{tenant_code}/{month}/{sequential}"


# ── List invoices ───────────────────────────────────────────


async def list_invoices(
    tenant_id: str,
    user: AuthUser,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    status: str = "",
    customer_id: str = "",
    stats: bool = False,
) -> dict[str, Any]:
    cust_id = None
    if user.role == "customer":
        cust_r = await query_table(
            CUSTOMER_TABLE,
            where={"userId": user.userId, "tenantId": tenant_id},
            select="id",
            limit=1,
        )
        cust_records = cust_r.get("data", [])
        cust_id = cust_records[0]["id"] if cust_records else None

    data_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="invoice",
        customer_id=cust_id,
    )
    if data_scope is NEVER_MATCH:
        raise ForbiddenException(message="No access to invoices")

    where: dict[str, Any] = {**data_scope}

    if stats:
        rbac_where = {**data_scope}
        if customer_id:
            rbac_where["customerId"] = customer_id

        total_count = await count_records(INVOICE_TABLE, where=rbac_where)
        draft_count = await count_records(INVOICE_TABLE, where={**rbac_where, "status": "DRAFT"})
        review_count = await count_records(INVOICE_TABLE, where={**rbac_where, "status": "REVIEW"})
        sent_count = await count_records(
            INVOICE_TABLE,
            where={**rbac_where, "status": {"in": ["SENT", "VIEWED", "APPROVED"]}},
        )
        paid_count = await count_records(INVOICE_TABLE, where={**rbac_where, "status": "PAID"})
        overdue_count = await count_records(INVOICE_TABLE, where={**rbac_where, "status": "OVERDUE"})

        return {
            "stats": {
                "totalCount": total_count,
                "totalValue": 0,
                "draftCount": draft_count,
                "reviewCount": review_count,
                "sentCount": sent_count,
                "paidCount": paid_count,
                "overdueCount": overdue_count,
            }
        }

    if search:
        where["OR"] = [
            {"title": {"contains": search}},
            {"invoiceNumber": {"contains": search}},
            {"description": {"contains": search}},
        ]
    if status:
        where["status"] = status
    if customer_id:
        where["customerId"] = customer_id

    offset = (page - 1) * page_size
    result = await query_table(
        INVOICE_TABLE,
        select=(
            "*,customer:Customer(name,phone,email,address,companyName,pic),"
            "quotation:Quotation(quotationNo),workOrder:WorkOrder(id,title),"
            "preparedByUser:User!preparedBy(name),createdByUser:User!createdBy(name),"
            "payments:InvoicePayment(amount,method,referenceNo,transactionId,notes,paidAt)"
        ),
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=None,
    )

    rows = result.get("data", [])
    total = int(result.get("count", 0) or 0)

    data = []
    for inv in rows:
        customer = inv.pop("customer", None)
        if isinstance(customer, dict):
            inv["customerName"] = customer.get("name")
            inv["customerPhone"] = customer.get("phone")
            inv["customerEmail"] = customer.get("email")
            inv["customerAddress"] = customer.get("address")
            inv["customerCompany"] = customer.get("companyName")
            inv["customerPic"] = customer.get("pic")

        quotation = inv.pop("quotation", None)
        if isinstance(quotation, dict):
            inv["quotationNo"] = quotation.get("quotationNo")

        work_order = inv.pop("workOrder", None)
        if isinstance(work_order, dict):
            inv["workOrderTitle"] = work_order.get("title")

        prep_user = inv.pop("preparedByUser", None)
        if isinstance(prep_user, dict):
            inv["preparedByName"] = prep_user.get("name")

        creator = inv.pop("createdByUser", None)
        if isinstance(creator, dict):
            inv["creatorName"] = creator.get("name")

        payments = inv.pop("payments", None) or []
        amount_paid = sum(float(p.get("amount", 0)) for p in payments)
        inv["amountPaid"] = amount_paid
        inv["balanceDue"] = float(inv.get("total", 0)) - amount_paid
        inv["payments"] = payments

        data.append(inv)

    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


# ── Create invoice ───────────────────────────────────────────


async def create_invoice(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    require_permission("invoice.create", user.role)

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

    totals = calculate_invoice_totals(items, tax_rate, discount, shipping)
    invoice_number = await _generate_invoice_number(tenant_id)

    now_iso = utcnow().isoformat()
    record: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "customerId": customer_id,
        "workOrderId": data.get("workOrderId") or None,
        "quotationId": data.get("quotationId") or None,
        "invoiceNumber": invoice_number,
        "title": title,
        "description": data.get("description") or None,
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
        "referenceNo": data.get("referenceNo") or None,
        "poReference": data.get("poReference") or None,
        "paymentTerms": data.get("paymentTerms") or None,
        "dueDate": data.get("dueDate") or None,
        "notes": data.get("notes") or None,
        "shipToName": data.get("shipToName") or None,
        "shipToAddress": data.get("shipToAddress") or None,
        "shipToPhone": data.get("shipToPhone") or None,
        "shipToContact": data.get("shipToContact") or None,
        "preparedBy": data.get("preparedBy") or user.userId,
        "createdBy": user.userId,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    created = await insert_record(INVOICE_TABLE, record)
    detail = await _enrich_invoice(created, tenant_id)
    return detail


# ── Get invoice ────────────────────────────────────────────


async def get_invoice(
    invoice_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    require_permission("invoice.view", user.role)

    result = await query_table(
        INVOICE_TABLE,
        select=(
            "*,customer:Customer(name,phone,email,address,companyName,pic),"
            "workOrder:WorkOrder(id,title),quotation:Quotation(quotationNo),"
            "preparer:User!preparedBy(name),creator:User!createdBy(name)"
        ),
        where={"id": invoice_id, "tenantId": tenant_id},
        limit=1,
        tenant_id=None,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Invoice", message="Invoice not found")

    return _format_invoice_detail(rows[0])


# ── Update invoice ────────────────────────────────────────────


async def update_invoice(
    invoice_id: str,
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    require_permission("invoice.update", user.role)

    existing = await _fetch_invoice(invoice_id, tenant_id)
    if not existing:
        raise NotFoundException(resource="Invoice")

    update_data: dict[str, Any] = {"updatedAt": utcnow().isoformat()}

    simple_fields = [
        "title", "description", "currency", "referenceNo", "poReference",
        "paymentTerms", "pdfUrl", "notes", "shipToName", "shipToAddress",
        "shipToPhone", "shipToContact", "preparedBy", "bankName",
        "bankAccountName", "bankAccountNo", "transactionId",
    ]
    for field in simple_fields:
        if field in data:
            update_data[field] = data[field] if data[field] else None

    if "dueDate" in data:
        update_data["dueDate"] = data["dueDate"] or None
    if "terms" in data:
        update_data["terms"] = json.dumps(data["terms"]) if data["terms"] else None

    needs_recalc = "items" in data or "taxRate" in data or "discount" in data or "shipping" in data

    if needs_recalc:
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

        totals = calculate_invoice_totals(items, tax_rate, discount, shipping)
        update_data["subtotal"] = totals["subtotal"]
        update_data["tax"] = totals["tax"]
        update_data["total"] = totals["total"]

    updated = await update_record(INVOICE_TABLE, invoice_id, update_data)
    detail = await _enrich_invoice(updated, tenant_id)
    return detail


# ── Delete invoice ────────────────────────────────────────────


async def delete_invoice(
    invoice_id: str,
    tenant_id: str,
    user: AuthUser,
) -> None:
    require_permission("invoice.delete", user.role)

    existing = await _fetch_invoice(invoice_id, tenant_id)
    if not existing:
        raise NotFoundException(resource="Invoice")

    await delete_record(INVOICE_TABLE, invoice_id)


# ── Update status ─────────────────────────────────────────────


async def update_status(
    invoice_id: str,
    tenant_id: str,
    user: AuthUser,
    status: str,
    reason: str | None = None,
) -> dict[str, Any]:
    require_permission("invoice.approve", user.role)

    existing = await _fetch_invoice(invoice_id, tenant_id)
    if not existing:
        raise NotFoundException(resource="Invoice")

    current = existing.get("status", "DRAFT")
    allowed = INVOICE_STATUS_TRANSITIONS.get(current, set())

    if status not in allowed:
        raise ValidationException(
            message=f"Invalid status transition from {current} to {status}. Allowed: {', '.join(sorted(allowed)) or 'none'}"
        )

    update_data: dict[str, Any] = {"status": status, "updatedAt": utcnow().isoformat()}

    if reason is not None:
        update_data["notes"] = reason or existing.get("notes")

    now_iso = utcnow().isoformat()
    if status == "APPROVED":
        update_data["approvedAt"] = now_iso
        update_data["approvedBy"] = user.userId
    elif status == "SENT":
        update_data["sentAt"] = now_iso
    elif status == "VIEWED":
        update_data["viewedAt"] = now_iso
    elif status == "PAID":
        update_data["paidAt"] = now_iso
    elif status == "CLOSED":
        update_data["closedAt"] = now_iso

    updated = await update_record(INVOICE_TABLE, invoice_id, update_data)
    detail = await _enrich_invoice(updated, tenant_id)
    return detail


# ── Generate PDF data ──────────────────────────────────────────


async def generate_pdf_data(
    invoice_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    require_permission("invoice.generate_pdf", user.role)

    invoice = await _fetch_invoice(invoice_id, tenant_id, with_customer=True, with_user=True)
    if not invoice:
        raise NotFoundException(resource="Invoice")

    customer = invoice.get("customer") or {}
    prep_user = invoice.get("preparedByUser") or {}
    creator = invoice.get("createdByUser") or {}

    return {
        "id": invoice["id"],
        "invoiceNumber": invoice.get("invoiceNumber"),
        "title": invoice.get("title"),
        "description": invoice.get("description"),
        "items": invoice.get("items"),
        "terms": invoice.get("terms"),
        "currency": invoice.get("currency", "BND"),
        "subtotal": float(invoice.get("subtotal") or 0),
        "taxRate": float(invoice.get("taxRate") or 0),
        "tax": float(invoice.get("tax") or 0),
        "discount": float(invoice.get("discount") or 0),
        "shipping": float(invoice.get("shipping") or 0),
        "total": float(invoice.get("total") or 0),
        "status": invoice.get("status"),
        "referenceNo": invoice.get("referenceNo"),
        "poReference": invoice.get("poReference"),
        "paymentTerms": invoice.get("paymentTerms"),
        "dueDate": invoice.get("dueDate"),
        "notes": invoice.get("notes"),
        "preparedByName": prep_user.get("name") or creator.get("name"),
        "shipToName": invoice.get("shipToName"),
        "shipToAddress": invoice.get("shipToAddress"),
        "shipToPhone": invoice.get("shipToPhone"),
        "shipToContact": invoice.get("shipToContact"),
        "bankName": invoice.get("bankName"),
        "bankAccountName": invoice.get("bankAccountName"),
        "bankAccountNo": invoice.get("bankAccountNo"),
        "createdAt": invoice.get("createdAt"),
        "customer": {
            "name": customer.get("name"),
            "phone": customer.get("phone"),
            "email": customer.get("email"),
            "address": customer.get("address"),
            "companyName": customer.get("companyName"),
            "pic": customer.get("pic"),
        } if customer else None,
    }


# ── Send email ──────────────────────────────────────────────


async def send_email_invoice(
    invoice_id: str,
    tenant_id: str,
    user: AuthUser,
    to: str | None = None,
    subject: str | None = None,
    body: str | None = None,
    cc: str | None = None,
) -> dict[str, Any]:
    require_permission("invoice.send_email", user.role)

    invoice = await _fetch_invoice(invoice_id, tenant_id, with_customer=True, with_user=True)
    if not invoice:
        raise NotFoundException(resource="Invoice")

    customer = invoice.get("customer") or {}
    recipient = to or customer.get("email") or ""
    if not recipient:
        raise ValidationException(message="No recipient email available")

    default_subject = f"Invoice {invoice.get('invoiceNumber') or invoice['id']} - {invoice.get('title')}"
    default_body = (f"Please find attached the invoice for {invoice.get('title')}"
                     f" with total amount of {invoice.get('currency', 'BND')} "
                     f"{float(invoice.get('total') or 0):,.2f}.")

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
        log.error(f"Failed to send invoice email: {exc}")
        raise

    update_data: dict[str, Any] = {"sentAt": utcnow().isoformat()}
    current_status = invoice.get("status")
    if current_status in ("DRAFT", "APPROVED"):
        update_data["status"] = "SENT"
    await update_record(INVOICE_TABLE, invoice_id, update_data)

    return {"success": sent, "message": "Email sent successfully" if sent else "Email sending failed", "to": recipient}


# ── Send WhatsApp ───────────────────────────────────────────


async def send_whatsapp_invoice(
    invoice_id: str,
    tenant_id: str,
    user: AuthUser,
    generate_pdf: bool = False,
) -> dict[str, Any]:
    require_permission("invoice.send_whatsapp", user.role)

    invoice = await _fetch_invoice(invoice_id, tenant_id, with_customer=True)
    if not invoice:
        raise NotFoundException(resource="Invoice")

    customer = invoice.get("customer") or {}
    raw_phone = customer.get("phone") or ""
    digits_only = "".join(c for c in str(raw_phone) if c.isdigit())

    if not digits_only:
        raise ValidationException(message="Customer phone number is not available")

    customer_name = customer.get("companyName") or customer.get("name") or "Valued Customer"
    inv_no = invoice.get("invoiceNumber") or invoice["id"]
    total = float(invoice.get("total") or 0)
    currency = invoice.get("currency") or "BND"
    due_date = invoice.get("dueDate")
    title = invoice.get("title") or ""

    formatted_total = f"{currency} {total:,.2f}"
    formatted_date = "N/A"
    if due_date:
        try:
            parsed = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            formatted_date = parsed.strftime("%B %d, %Y")
        except Exception:
            pass

    message = (
        f"Dear {customer_name},\n\n"
        f"Please find below the summary of your invoice:\n\n"
        f"\U0001f4cb *Invoice Details*\n"
        f"━━━━━━━━━━━━━━━━━\n"
        f"\U0001f4c4 Invoice No: *{inv_no}*\n"
        f"\U0001f4dd Description: {title}\n"
        f"\U0001f4b0 Total Amount: *{formatted_total}*\n"
        f"\U0001f4c5 Due Date: {formatted_date}\n"
        f"━━━━━━━━━━━━━━━━\n\n"
        f"The detailed invoice PDF will be shared separately.\n\n"
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
        result["pdfUrl"] = f"/api/v1/invoices/{invoice_id}/generate-pdf"

    return result


# ── Record payment ────────────────────────────────────────────


async def record_payment(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    require_permission("invoice.record_payment", user.role)

    invoice_id = data.get("invoiceId")
    amount = data.get("amount")
    method = data.get("method")

    if not invoice_id or not amount or not method:
        raise ValidationException(message="invoiceId, amount, and method are required")

    payment_amount = float(amount)
    if payment_amount <= 0:
        raise ValidationException(message="Amount must be a positive number")

    invoice = await _fetch_invoice(invoice_id, tenant_id)
    if not invoice:
        raise NotFoundException(resource="Invoice")

    now_iso = utcnow().isoformat()
    payment_record: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "invoiceId": invoice_id,
        "amount": payment_amount,
        "method": method,
        "referenceNo": data.get("referenceNo") or None,
        "transactionId": data.get("transactionId") or None,
        "receiptUrl": data.get("receiptUrl") or None,
        "notes": data.get("notes") or None,
        "paidAt": now_iso,
        "createdBy": user.userId,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    payment = await insert_record(INVOICE_PAYMENT_TABLE, payment_record)

    # Recalculate total paid
    payments_result = await query_table(
        INVOICE_PAYMENT_TABLE,
        select="amount",
        where={"invoiceId": invoice_id, "tenantId": tenant_id},
        tenant_id=None,
    )
    all_payments = payments_result.get("data", [])
    total_paid = sum(float(p.get("amount", 0)) for p in all_payments)

    invoice_total = float(invoice.get("total") or 0)
    invoice_update: dict[str, Any] = {"updatedAt": now_iso}
    new_status = invoice.get("status")

    if total_paid >= invoice_total:
        new_status = "PAID"
        invoice_update["paidAt"] = now_iso
        invoice_update["status"] = "PAID"
    elif total_paid > 0:
        allowed = ["DRAFT", "REVIEW", "APPROVED", "SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"]
        if invoice.get("status") in allowed:
            new_status = "PARTIALLY_PAID"
            invoice_update["status"] = "PARTIALLY_PAID"

    await update_record(INVOICE_TABLE, invoice_id, invoice_update)

    return {
        "id": payment["id"],
        "tenantId": payment["tenantId"],
        "invoiceId": payment["invoiceId"],
        "amount": float(payment["amount"]),
        "method": payment["method"],
        "referenceNo": payment.get("referenceNo"),
        "transactionId": payment.get("transactionId"),
        "notes": payment.get("notes"),
        "paidAt": payment.get("paidAt"),
        "createdBy": payment["createdBy"],
        "createdAt": payment["createdAt"],
        "invoiceStatus": new_status,
        "amountPaid": total_paid,
        "amountRemaining": max(0, invoice_total - total_paid),
    }


# ── Get next number ───────────────────────────────────────────


async def get_next_number(tenant_id: str) -> dict[str, str]:
    invoice_number = await _generate_invoice_number(tenant_id)
    return {"invoiceNumber": invoice_number}


# ── Smart search customer ─────────────────────────────────────────


async def smart_search_customer(
    tenant_id: str,
    q: str,
    limit: int = 8,
) -> dict[str, Any]:
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
    return {"results": result.get("data", [])}


# ── Smart search inventory ──────────────────────────────────────────


async def smart_search_inventory(
    tenant_id: str,
    q: str,
    limit: int = 10,
    item_type: str = "",
) -> dict[str, Any]:
    if len(q) < 2:
        return {"results": []}

    items = []

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

    return {"results": items}


# ── Internal helpers ─────────────────────────────────────────────


async def _fetch_invoice(
    invoice_id: str,
    tenant_id: str,
    with_customer: bool = False,
    with_user: bool = False,
) -> dict[str, Any] | None:
    select = "*"
    if with_customer and with_user:
        select = ("*,customer:Customer(name,phone,email,address,companyName,pic),"
                "preparer:User!preparedBy(name),creator:User!createdBy(name)")
    elif with_customer:
        select = "*,customer:Customer(name,phone,email,address,companyName,pic)"
    elif with_user:
        select = "*,preparer:User!preparedBy(name),creator:User!createdBy(name)"

    result = await query_table(
        INVOICE_TABLE,
        select=select,
        where={"id": invoice_id, "tenantId": tenant_id},
        limit=1,
        tenant_id=None,
    )
    rows = result.get("data", [])
    return rows[0] if rows else None


async def _enrich_invoice(invoice: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    try:
        cust_r = await query_table(
            CUSTOMER_TABLE,
            select="name,phone,email,address,companyName,pic",
            where={"id": invoice.get("customerId")},
            limit=1,
            tenant_id=None,
        )
        customers = cust_r.get("data", [])
        if customers:
            invoice["customer"] = customers[0]
            invoice["customerName"] = customers[0].get("name")
    except Exception:
        pass
    return invoice


def _format_invoice_detail(inv: dict[str, Any]) -> dict[str, Any]:
    customer = inv.pop("customer", None)
    prep_user = inv.pop("preparer", None)
    creator = inv.pop("creator", None)
    work_order = inv.pop("workOrder", None)
    quotation = inv.pop("quotation", None)

    if customer and isinstance(customer, dict):
        inv["customerName"] = customer.get("name")
        inv["customerPhone"] = customer.get("phone")
        inv["customerEmail"] = customer.get("email")
        inv["customerAddress"] = customer.get("address")
        inv["customerCompany"] = customer.get("companyName")
        inv["customerPic"] = customer.get("pic")
        inv["customer"] = customer

    if prep_user and isinstance(prep_user, dict):
        inv["preparedByName"] = prep_user.get("name")
    if creator and isinstance(creator, dict):
        inv["creatorName"] = creator.get("name")
    if work_order and isinstance(work_order, dict):
        inv["workOrderTitle"] = work_order.get("title")
    if quotation and isinstance(quotation, dict):
        inv["quotationNo"] = quotation.get("quotationNo")

    return inv
