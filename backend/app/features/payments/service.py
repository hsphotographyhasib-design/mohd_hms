"""
Payment business logic — recording payments and managing verifications.

MOHD.HMS ENTERPRISE

Implements:
  - Invoice payment recording (delegates to invoices.service.record_payment)
  - Payment verification listing and approval/rejection
  - On approval: auto-close related invoice as PAID
"""

from __future__ import annotations

from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    query_table,
    update_record,
    MODEL_TO_TABLE,
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

# ── Table constants ──────────────────────────────────────────

INVOICE_TABLE = MODEL_TO_TABLE.get("invoice", "Invoice")
INVOICE_PAYMENT_TABLE = MODEL_TO_TABLE.get("invoicePayment", "InvoicePayment")
PAYMENT_VERIFICATION_TABLE = MODEL_TO_TABLE.get("paymentVerification", "PaymentVerification")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")


# ── Record payment (delegates to invoices module) ────────────────────


async def record_payment(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Record a payment on an invoice.

    Delegates to invoices.service.record_payment which handles
    all financial logic (total recalculation, status updates).
    """
    from app.features.invoices.service import record_payment as _record

    return await _record(tenant_id=tenant_id, user=user, data=data)


# ── Payment verification ──────────────────────────────────────


async def list_verifications(
    tenant_id: str,
    user: AuthUser,
    status: str = "pending",
) -> list[dict[str, Any]]:
    """List payment verifications with customer and invoice info."""
    where: dict[str, Any] = {"tenantId": tenant_id}
    if status and status != "all":
        where["status"] = status

    result = await query_table(
        PAYMENT_VERIFICATION_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=50,
        tenant_id=None,
    )

    verifications = result.get("data", [])
    if not verifications:
        return []

    # Batch-fetch customer names and invoice numbers
    customer_ids = list({v.get("customerId") for v in verifications if v.get("customerId")})
    invoice_ids = list({v.get("invoiceId") for v in verifications if v.get("invoiceId")})

    customer_map: dict[str, str] = {}
    invoice_map: dict[str, str] = {}

    if customer_ids:
        cust_r = await query_table(
            CUSTOMER_TABLE,
            select="id,name",
            where={"id": {"in": customer_ids}},
            tenant_id=None,
        )
        for c in cust_r.get("data", []):
            customer_map[c["id"]] = c.get("name")

    if invoice_ids:
        inv_r = await query_table(
            INVOICE_TABLE,
            select="id,invoiceNumber",
            where={"id": {"in": invoice_ids}},
            tenant_id=None,
        )
        for i in inv_r.get("data", []):
            invoice_map[i["id"]] = i.get("invoiceNumber")

    output = []
    for v in verifications:
        output.append({
            "id": v["id"],
            "customerName": customer_map.get(v.get("customerId")),
            "invoiceNumber": invoice_map.get(v.get("invoiceId")),
            "extractedAmount": v.get("extractedAmount"),
            "extractedBank": v.get("extractedBank"),
            "extractedDate": v.get("extractedDate"),
            "extractedTxnId": v.get("extractedTxnId"),
            "extractedSender": v.get("extractedSender"),
            "extractedRef": v.get("extractedRef"),
            "imageUrl": v.get("imageUrl"),
            "status": v.get("status"),
            "createdAt": v.get("createdAt"),
        })

    return output


async def update_verification(
    tenant_id: str,
    user: AuthUser,
    verification_id: str,
    status: str,
    notes: str | None = None,
) -> dict[str, Any]:
    """Approve or reject a payment verification.

    On approval with a linked invoice, the invoice is automatically
    marked as PAID.
    """
    if status not in ("approved", "rejected"):
        raise ValidationException(message="status must be approved or rejected")

    result = await query_table(
        PAYMENT_VERIFICATION_TABLE,
        select="*",
        where={"id": verification_id, "tenantId": tenant_id},
        limit=1,
        tenant_id=None,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="PaymentVerification")

    verification = rows[0]

    if verification.get("status") != "pending":
        raise ValidationException(message=f"Already {verification['status']}")

    now_iso = utcnow().isoformat()
    update_data: dict[str, Any] = {
        "status": status,
        "verifiedById": user.userId,
        "verifiedAt": now_iso,
        "verificationNotes": notes or None,
        "rejectionReason": notes if status == "rejected" else None,
        "invoiceClosed": status == "approved" and bool(verification.get("invoiceId")),
    }

    updated = await update_record(PAYMENT_VERIFICATION_TABLE, verification_id, update_data)

    # On approval: close related invoice
    if status == "approved" and verification.get("invoiceId"):
        inv_update: dict[str, Any] = {
            "status": "PAID",
            "paidAt": now_iso,
            "paymentMethod": "bank_transfer",
            "paymentRef": verification.get("extractedTxnId") or verification.get("extractedRef"),
            "bankName": verification.get("extractedBank"),
            "transactionId": verification.get("extractedTxnId") or verification.get("extractedRef"),
            "updatedAt": now_iso,
        }
        await update_record(INVOICE_TABLE, verification["invoiceId"], inv_update)

    return {
        "id": updated.get("id", verification_id),
        "status": status,
        "verifiedAt": now_iso,
    }
