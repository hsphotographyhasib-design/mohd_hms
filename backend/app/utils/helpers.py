"""General-purpose helper functions.

MOHD.HMS ENTERPRISE

Includes:
  - ID/number generators (complaint, work order, invoice, quotation, etc.)
  - Phone formatting
  - Input sanitization
  - Cache key builder
  - UTC now helper
"""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone


# ── Number/ID generators ──────────────────────────────────────────────────────
#
# Format: PREFIX-TENANT_YEAR_MONTH-SEQUENTIAL
# Example: CMP-T001-2024-01-00001
#
# The sequential counter would normally come from a database sequence
# or Redis INCR. Here we use a random fallback for offline safety.


def _tenant_short(tenant_id: str) -> str:
    """Derive a short tenant identifier from the tenant UUID.

    Takes the first 8 hex chars and uppercases them.
    """
    return tenant_id[:8].upper().lstrip("0") or "0"


def _date_prefix() -> str:
    """Return current year-month string (e.g. '2024-01')."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def generate_complaint_number(tenant_id: str) -> str:
    """Generate a complaint reference number.

    Format: CMP-<tenant_short>-<YYYY-MM>-<5-digit-sequential>
    Example: CMP-A1B2C3D4-2024-07-00042
    """
    seq = secrets.randbelow(100000)  # Replace with DB sequence in production
    return f"CMP-{_tenant_short(tenant_id)}-{_date_prefix()}-{seq:05d}"


def generate_work_order_number(tenant_id: str) -> str:
    """Generate a work order reference number.

    Format: WO-<tenant_short>-<YYYY-MM>-<5-digit-sequential>
    """
    seq = secrets.randbelow(100000)
    return f"WO-{_tenant_short(tenant_id)}-{_date_prefix()}-{seq:05d}"


def generate_invoice_number(tenant_id: str) -> str:
    """Generate an invoice reference number.

    Format: INV-<tenant_short>-<YYYY-MM>-<5-digit-sequential>
    """
    seq = secrets.randbelow(100000)
    return f"INV-{_tenant_short(tenant_id)}-{_date_prefix()}-{seq:05d}"


def generate_quotation_number(tenant_id: str) -> str:
    """Generate a quotation reference number.

    Format: QUO-<tenant_short>-<YYYY-MM>-<5-digit-sequential>
    """
    seq = secrets.randbelow(100000)
    return f"QUO-{_tenant_short(tenant_id)}-{_date_prefix()}-{seq:05d}"


def generate_customer_number(tenant_id: str) -> str:
    """Generate a customer reference number.

    Format: CUS-<tenant_short>-<5-digit-sequential>
    """
    seq = secrets.randbelow(100000)
    return f"CUS-{_tenant_short(tenant_id)}-{seq:05d}"


def generate_employee_id(tenant_id: str) -> str:
    """Generate an employee ID.

    Format: EMP-<tenant_short>-<5-digit-sequential>
    """
    seq = secrets.randbelow(100000)
    return f"EMP-{_tenant_short(tenant_id)}-{seq:05d}"


# ── Phone formatting ──────────────────────────────────────────────────────────


def format_phone(phone: str) -> str:
    """Normalize a phone number string.

    Strips all non-digit characters except leading +.
    If the number starts with 0 and is 10 digits, prepends the country code.
    """
    if not phone:
        return ""

    digits = re.sub(r"[^\d+]", "", phone)

    # If it has a country code prefix (+X), return as-is
    if digits.startswith("+"):
        return digits

    # Strip leading zeros
    stripped = digits.lstrip("0")

    # If the result is 9-10 digits (Malaysian format), prepend +60
    if 9 <= len(stripped) <= 10:
        return f"+60{stripped}"

    # Fallback: return cleaned digits
    return digits


# ── Input sanitization ────────────────────────────────────────────────────────


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection.

    - Strips HTML tags
    - Normalizes whitespace
    - Trims
    """
    if not text:
        return ""
    # Remove HTML tags
    cleaned = re.sub(r"<[^>]+>", "", text)
    # Normalize whitespace (collapse multiple spaces/newlines)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


# ── Cache key builder ─────────────────────────────────────────────────────────


def build_cache_key(tenant_id: str, prefix: str, *parts: str) -> str:
    """Build a structured Redis cache key.

    Format: hms:<tenant_id>:<prefix>:<part1>:<part2>:...

    Example: build_cache_key("t123", "dashboard", "stats", "daily")
             → "hms:t123:dashboard:stats:daily"
    """
    all_parts = ["hms", tenant_id, prefix, *parts]
    return ":".join(str(p) for p in all_parts if p)


# ── UTC now ───────────────────────────────────────────────────────────────────


def utcnow() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)
