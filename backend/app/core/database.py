import re
from typing import Any, Literal

import httpx

from app.core.config import get_settings
from app.core.exceptions import InternalException, NotFoundException
from app.core.logging import get_logger

log = get_logger(__name__)

# ── Table name mapping: camelCase Prisma model → PascalCase Supabase table ─────

MODEL_TO_TABLE: dict[str, str] = {
    "user": "User",
    "tenant": "Tenant",
    "otpCode": "OtpCode",
    "passwordResetOtp": "PasswordResetOtp",
    "passwordResetToken": "PasswordResetToken",
    "loginSession": "LoginSession",
    "authAuditLog": "AuthAuditLog",
    "termsAcceptance": "TermsAcceptance",
    "device": "Device",
    "deviceToken": "DeviceToken",
    "complaint": "Complaint",
    "complaintTimeline": "ComplaintTimeline",
    "workOrder": "WorkOrder",
    "workOrderMaterial": "WorkOrderMaterial",
    "equipment": "Equipment",
    "equipmentQrCode": "EquipmentQrCode",
    "customer": "Customer",
    "customerFeedback": "CustomerFeedback",
    "customerReport": "CustomerReport",
    "invoice": "Invoice",
    "invoicePayment": "InvoicePayment",
    "paymentVerification": "PaymentVerification",
    "quotation": "Quotation",
    "inventoryItem": "InventoryItem",
    "inventoryCategory": "InventoryCategory",
    "inventorySubcategory": "InventorySubcategory",
    "warehouse": "Warehouse",
    "warehouseStock": "WarehouseStock",
    "stockMovement": "StockMovement",
    "itemSupplier": "ItemSupplier",
    "priceBook": "PriceBook",
    "priceBookEntry": "PriceBookEntry",
    "labourRate": "LabourRate",
    "serviceItem": "ServiceItem",
    "serviceCategory": "ServiceCategory",
    "serviceItemEquipment": "ServiceItemEquipment",
    "serviceItemMaterial": "ServiceItemMaterial",
    "servicePackage": "ServicePackage",
    "servicePackageItem": "ServicePackageItem",
    "purchaseOrder": "PurchaseOrder",
    "vehicle": "Vehicle",
    "vehicleLog": "VehicleLog",
    "department": "Department",
    "hrEmployee": "HrEmployee",
    "hrEmployeeDocument": "HrEmployeeDocument",
    "hrAssetAssignment": "HrAssetAssignment",
    "hrCandidate": "HrCandidate",
    "hrDisciplinaryAction": "HrDisciplinaryAction",
    "hrExpenseClaim": "HrExpenseClaim",
    "hrHoliday": "HrHoliday",
    "hrJobPosition": "HrJobPosition",
    "hrLeaveBalance": "HrLeaveBalance",
    "hrLeaveRequest": "HrLeaveRequest",
    "hrLeaveType": "HrLeaveType",
    "hrMedicalRecord": "HrMedicalRecord",
    "hrOvertimeRequest": "HrOvertimeRequest",
    "hrPayroll": "HrPayroll",
    "hrPerformanceReview": "HrPerformanceReview",
    "hrShift": "HrShift",
    "hrShiftSchedule": "HrShiftSchedule",
    "hrTraining": "HrTraining",
    "hrTrainingRecord": "HrTrainingRecord",
    "hrTravelRequest": "HrTravelRequest",
    "hrVisitor": "HrVisitor",
    "hrAnnouncement": "HrAnnouncement",
    "attendance": "Attendance",
    "leaveRequest": "LeaveRequest",
    "pmSchedule": "PmSchedule",
    "irmProject": "IrmProject",
    "irmReport": "IrmReport",
    "irmRevision": "IrmRevision",
    "irmActivity": "IrmActivity",
    "irmApproval": "IrmApproval",
    "irmPhoto": "IrmPhoto",
    "irmUser": "IrmUser",
    "inspection": "Inspection",
    "inspectionTemplate": "InspectionTemplate",
    "inspectionResult": "InspectionResult",
    "inspectionChecklistItem": "InspectionChecklistItem",
    "checklistTemplate": "ChecklistTemplate",
    "notification": "Notification",
    "notificationLog": "NotificationLog",
    "broadcastLog": "BroadcastLog",
    "whatsappConfig": "WhatsAppConfig",
    "whatsappMessage": "WhatsAppMessage",
    "whatsappSession": "WhatsAppSession",
    "whatsappTemplate": "WhatsAppTemplate",
    "whatsappDeliveryLog": "WhatsAppDeliveryLog",
    "conversationThread": "ConversationThread",
    "emailLog": "EmailLog",
    "emailTemplate": "EmailTemplate",
    "document": "Document",
    "documentVersion": "DocumentVersion",
    "documentAuditLog": "DocumentAuditLog",
    "cmsSetting": "CmsSetting",
    "cmsPage": "CmsPage",
    "cmsPageTemplate": "CmsPageTemplate",
    "cmsBlog": "CmsBlog",
    "cmsBlogCategory": "CmsBlogCategory",
    "cmsService": "CmsService",
    "cmsProject": "CmsProject",
    "cmsIndustry": "CmsIndustry",
    "cmsTestimonial": "CmsTestimonial",
    "cmsHero": "CmsHero",
    "cmsFooter": "CmsFooter",
    "cmsSeo": "CmsSeo",
    "cmsMedia": "CmsMedia",
    "cmsPopup": "CmsPopup",
    "cmsAnnouncement": "CmsAnnouncement",
    "cmsForm": "CmsForm",
    "cmsContactMessage": "CmsContactMessage",
    "cmsCareerJob": "CmsCareerJob",
    "cmsCareerApplication": "CmsCareerApplication",
    "cmsRevision": "CmsRevision",
    "cmsActivityLog": "CmsActivityLog",
    "brandingAsset": "BrandingAsset",
    "aiConversationLog": "AiConversationLog",
    "savedLocation": "SavedLocation",
    "scanLog": "ScanLog",
    "auditLog": "AuditLog",
    "errorLog": "ErrorLog",
}


# ── PostgREST filter builder ───────────────────────────────────────────────────


def where_to_postgrest_filters(
    where: dict[str, Any],
    prefix: str = "",
) -> list[tuple[str, str]]:
    """Convert a Prisma-style where dict to PostgREST query params.

    Returns a list of (key, value) tuples suitable for passing to httpx params.
    PostgREST expects filters as query params like:
      ?email=eq.test@example.com&status=eq.active
      ?or=(email.eq.test@example.com,phone.eq.123)

    Supported operators:
      eq, ne/neq, in, notIn, contains, startsWith, endsWith,
      gt, gte, lt, lte, isNull, isNotNull, OR, AND, NOT
    """
    params: list[tuple[str, str]] = []

    for key, value in where.items():
        full_key = f"{prefix}{key}" if prefix else key

        # ── Logical operators ───────────────────────────────────────────
        if key.upper() == "OR" and isinstance(value, list):
            or_parts: list[str] = []
            for sub in value:
                if isinstance(sub, dict):
                    sub_params = where_to_postgrest_filters(sub, prefix)
                    for pk, pv in sub_params:
                        or_parts.append(f"{pk}.{pv}")
            if or_parts:
                params.append(("or", f"({','.join(or_parts)})"))
            continue

        if key.upper() == "AND" and isinstance(value, list):
            and_parts: list[str] = []
            for sub in value:
                if isinstance(sub, dict):
                    sub_params = where_to_postgrest_filters(sub, prefix)
                    for pk, pv in sub_params:
                        and_parts.append(f"{pk}.{pv}")
            if and_parts:
                params.append(("and", f"({','.join(and_parts)})"))
            continue

        if key.upper() == "NOT" and isinstance(value, dict):
            not_params = where_to_postgrest_filters(value, prefix)
            for pk, pv in not_params:
                params.append(("not", f"({pk}.{pv})"))
            continue

        # ── Operator objects ─────────────────────────────────────────────
        if isinstance(value, dict):
            for op, op_val in value.items():
                match op:
                    case "eq":
                        params.append((full_key, f"eq.{_escape(op_val)}"))
                    case "ne" | "neq":
                        params.append((full_key, f"neq.{_escape(op_val)}"))
                    case "in":
                        items = ",".join(_escape(v) for v in op_val)
                        params.append((full_key, f"in.({items})"))
                    case "notIn":
                        items = ",".join(_escape(v) for v in op_val)
                        params.append((full_key, f"not.in.({items})"))
                    case "contains":
                        params.append((full_key, f"ilike.*{_escape(op_val)}*"))
                    case "startsWith":
                        params.append((full_key, f"ilike.{_escape(op_val)}*"))
                    case "endsWith":
                        params.append((full_key, f"ilike.*{_escape(op_val)}"))
                    case "gt":
                        params.append((full_key, f"gt.{_escape(op_val)}"))
                    case "gte":
                        params.append((full_key, f"gte.{_escape(op_val)}"))
                    case "lt":
                        params.append((full_key, f"lt.{_escape(op_val)}"))
                    case "lte":
                        params.append((full_key, f"lte.{_escape(op_val)}"))
                    case "isNull":
                        if op_val:
                            params.append((full_key, "is.null"))
                        else:
                            params.append((full_key, "not.is.null"))
                    case "isNotNull":
                        if op_val:
                            params.append((full_key, "not.is.null"))
                    case _:
                        log.warning(f"Unsupported PostgREST operator: {op}")
            continue

        # ── Direct equality (non-dict value) ─────────────────────────────
        params.append((full_key, f"eq.{_escape(value)}"))

    return params


def _escape(value: Any) -> str:
    """Escape a value for PostgREST query strings.

    Strings are URL-safe. None/null becomes 'null'.
    Booleans become 'true'/'false'.
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    # String: escape commas and parens that break PostgREST syntax.
    # Dots, @, and other chars are safe in filter values.
    escaped = str(value).replace(",", r"\2C").replace("(", r"\28").replace(")", r"\29")
    return escaped


# ── Database client ───────────────────────────────────────────────────────────

_client: httpx.AsyncClient | None = None


def _get_table_name(model_or_table: str) -> str:
    """Resolve a model name (camelCase) or table name (PascalCase) to the
    actual Supabase/PostgREST table name.
    """
    if model_or_table in MODEL_TO_TABLE:
        return MODEL_TO_TABLE[model_or_table]
    return model_or_table


def get_supabase_client() -> httpx.AsyncClient:
    """Return the singleton httpx.AsyncClient for Supabase PostgREST."""
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise InternalException(
            message="Supabase URL and service role key are required",
            details={"setting": "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"},
        )

    _client = httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        timeout=httpx.Timeout(30.0, connect=10.0),
    )
    return _client


async def close_supabase_client() -> None:
    """Close the httpx client. Call on app shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


# ── CRUD helpers ──────────────────────────────────────────────────────────────


def _build_query_params(
    select: str,
    where: dict[str, Any] | None,
    order: str | None,
    limit: int | None,
    offset: int | None,
    tenant_id: str | None,
) -> list[tuple[str, str]]:
    """Build the complete list of PostgREST query parameters.

    Returns list of (key, value) tuples for httpx params.
    """
    params: list[tuple[str, str]] = []

    # select is always first
    params.append(("select", select))

    # Build where clause (with optional tenant isolation)
    effective_where: dict[str, Any] = {}
    if tenant_id:
        effective_where["tenantId"] = tenant_id
    if where:
        effective_where.update(where)

    if effective_where:
        filter_params = where_to_postgrest_filters(effective_where)
        params.extend(filter_params)

    if order:
        params.append(("order", order))
    if limit is not None:
        params.append(("limit", str(limit)))
    if offset is not None:
        params.append(("offset", str(offset)))

    return params


async def query_table(
    table: str,
    *,
    select: str = "*",
    where: dict[str, Any] | None = None,
    order: str | None = None,
    limit: int | None = None,
    offset: int | None = None,
    count: Literal["exact", "planned", "estimated"] | None = None,
    tenant_id: str | None = None,
) -> dict[str, Any]:
    """Query a Supabase table via PostgREST.

    Args:
        table:    Prisma model name (camelCase) or direct table name.
        select:   PostgREST select string (default "*").
        where:    Prisma-style where clause. If tenant_id is given,
                  a tenantId filter is automatically injected.
        order:    PostgREST order string, e.g. "createdAt.desc".
        limit:    Max rows to return.
        offset:   Rows to skip.
        count:    Include Prefer: count=<value> header.
        tenant_id: If provided, injects tenantId=eq.<id> into where.

    Returns:
        Dict with keys: data, count (if count param set), range.
    """
    client = get_supabase_client()
    table_name = _get_table_name(table)

    # Build ALL query params including filters
    params = _build_query_params(select, where, order, limit, offset, tenant_id)

    # Build headers (Prefer for count, auth headers)
    headers: dict[str, str] = {
        "apikey": client.headers.get("apikey", ""),
        "Authorization": client.headers.get("Authorization", ""),
    }
    if count:
        headers["Prefer"] = f"count={count},return=representation"
    else:
        headers["Prefer"] = "return=representation"

    url_path = f"/rest/v1/{table_name}"

    try:
        response = await client.get(url_path, params=params, headers=headers)
    except httpx.HTTPError as exc:
        log.error(f"PostgREST query failed: {exc}")
        raise InternalException(message="Database query failed") from exc

    if response.status_code >= 400:
        log.error(f"PostgREST {response.status_code}: {response.text}")
        raise InternalException(message=f"Database error: {response.status_code}")

    result: dict[str, Any] = {"data": response.json()}

    # Extract count from Content-Range header
    content_range = response.headers.get("content-range", "")
    if content_range and count:
        parts = content_range.split("/")
        if len(parts) == 2:
            result["count"] = parts[1]

    result["range"] = content_range
    return result


async def insert_record(table: str, data: dict[str, Any]) -> dict[str, Any]:
    """Insert a single record into a Supabase table.

    Returns the inserted record (with return=representation).
    """
    client = get_supabase_client()
    table_name = _get_table_name(table)

    try:
        response = await client.post(
            f"/rest/v1/{table_name}",
            json=data,
            headers={
                "Prefer": "return=representation",
                "apikey": client.headers.get("apikey", ""),
                "Authorization": client.headers.get("Authorization", ""),
            },
        )
    except httpx.HTTPError as exc:
        log.error(f"PostgREST insert failed: {exc}")
        raise InternalException(message="Database insert failed") from exc

    if response.status_code in (200, 201):
        result = response.json()
        return result[0] if isinstance(result, list) else result

    log.error(f"PostgREST insert {response.status_code}: {response.text}")
    raise InternalException(message=f"Database insert error: {response.status_code}")


async def update_record(table: str, record_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a record by ID in a Supabase table.

    Returns the updated record.
    """
    client = get_supabase_client()
    table_name = _get_table_name(table)

    try:
        response = await client.patch(
            f"/rest/v1/{table_name}",
            params={"id": f"eq.{record_id}"},
            json=data,
            headers={
                "Prefer": "return=representation",
                "apikey": client.headers.get("apikey", ""),
                "Authorization": client.headers.get("Authorization", ""),
            },
        )
    except httpx.HTTPError as exc:
        log.error(f"PostgREST update failed: {exc}")
        raise InternalException(message="Database update failed") from exc

    if response.status_code in (200, 204):
        if response.status_code == 204:
            return {"id": record_id}
        result = response.json()
        return result[0] if isinstance(result, list) else result

    if response.status_code == 404:
        raise NotFoundException(resource=table_name)

    log.error(f"PostgREST update {response.status_code}: {response.text}")
    raise InternalException(message=f"Database update error: {response.status_code}")


async def delete_record(table: str, record_id: str) -> None:
    """Delete a record by ID from a Supabase table."""
    client = get_supabase_client()
    table_name = _get_table_name(table)

    try:
        response = await client.delete(
            f"/rest/v1/{table_name}",
            params={"id": f"eq.{record_id}"},
            headers={
                "apikey": client.headers.get("apikey", ""),
                "Authorization": client.headers.get("Authorization", ""),
            },
        )
    except httpx.HTTPError as exc:
        log.error(f"PostgREST delete failed: {exc}")
        raise InternalException(message="Database delete failed") from exc

    if response.status_code in (200, 204):
        return

    if response.status_code == 404:
        raise NotFoundException(resource=table_name)

    log.error(f"PostgREST delete {response.status_code}: {response.text}")
    raise InternalException(message=f"Database delete error: {response.status_code}")


async def count_records(table: str, where: dict[str, Any] | None = None, *, tenant_id: str | None = None) -> int:
    """Count records in a Supabase table."""
    result = await query_table(table, select="id", where=where, tenant_id=tenant_id, count="exact", limit=1)
    count_str = result.get("count", "0")
    if count_str == "*":
        return len(result.get("data", []))
    try:
        return int(count_str)
    except (ValueError, TypeError):
        return 0


# ── Application-layer join resolution ─────────────────────────────────────────
#
# PostgREST requires foreign-key constraints for embedded-resource selects like
# `Tenant(name, domain)`.  This schema has NO foreign keys — all relationships
# are maintained at the application layer.  The helpers below parse a PostgREST
# select string, discover the embedded resources, batch-fetch them in separate
# queries, and stitch the results into each record.
# ────────────────────────────────────────────────────────────────────────────────

# Mapping of lowercase aliases / abbreviations → actual Supabase table names.
_ALIAS_TO_TABLE: dict[str, str] = {
    "tenant": "Tenant",
    "department": "Department",
    "user": "User",
    "customer": "Customer",
    "warehouse": "Warehouse",
    "inventoryitem": "InventoryItem",
    "item": "InventoryItem",
    "servicepackageitem": "ServicePackageItem",
    "items": "ServicePackageItem",
    "inventorycategory": "InventoryCategory",
    "inventorysubcategory": "InventorySubcategory",
    "itemsupplier": "ItemSupplier",
    "warehousestock": "WarehouseStock",
    "invoicepayment": "InvoicePayment",
    "quotation": "Quotation",
    "workorder": "WorkOrder",
    "hremployee": "HrEmployee",
}

# Has-many relationship config: alias → (table, fk-field-in-related-table).
_HAS_MANY_CONFIG: dict[str, tuple[str, str]] = {
    "items": ("ServicePackageItem", "packageId"),
    "payments": ("InvoicePayment", "invoiceId"),
    "ItemSupplier": ("ItemSupplier", "itemId"),
    "WarehouseStock": ("WarehouseStock", "itemId"),
}

# Regex: optional_alias : TableName !hint (columns)
_EMBED_RE = re.compile(r"(?:(\w+):)?(\w+)(?:!\w+)?\(([^)]*)\)")


def strip_joins_from_select(select: str) -> str:
    """Remove embedded-resource patterns from a PostgREST select string.

    Examples
    --------
    '*, Tenant(name, domain)'                          → '*'
    '*, customer:Customer(name), User!hint(id)'         → '*'
    'id, name, Department(id, name)'                    → 'id, name'
    """
    cleaned = _EMBED_RE.sub("", select)
    # Collapse double commas, trim whitespace
    cleaned = re.sub(r"\s*,\s*,\s*", ", ", cleaned)
    cleaned = cleaned.strip()
    cleaned = re.sub(r"^,\s*", "", cleaned)
    cleaned = re.sub(r",\s*$", "", cleaned)
    return cleaned or "*"


def _resolve_table_name(name: str) -> str:
    """Resolve a relation name to the actual Supabase table name."""
    key = name.lower()
    if key in _ALIAS_TO_TABLE:
        return _ALIAS_TO_TABLE[key]
    if key in MODEL_TO_TABLE:
        return MODEL_TO_TABLE[key]
    if name[0].isupper():
        return name
    return name[0].upper() + name[1:]


def _get_fk_candidates(alias: str) -> list[str]:
    """Return plausible foreign-key field names for a given alias."""
    camel = alias[0].lower() + alias[1:] if alias and alias[0].isupper() else (alias or "")
    candidates = [f"{camel}Id", alias, f"{camel}_id"]
    # Specific known overrides
    if alias.lower() == "preparedbyuser":
        candidates = ["preparedBy", "preparedByUserId"]
    elif alias.lower() == "preparer":
        candidates = ["preparedBy"]
    elif alias.lower() == "creator":
        candidates = ["createdBy"]
    elif alias.lower() == "createdbyuser":
        candidates = ["createdBy", "createdByUserId"]
    elif alias.lower() == "inventorycategory":
        candidates = ["categoryId"]
    elif alias.lower() == "inventorysubcategory":
        candidates = ["subcategoryId"]
    elif alias.lower() == "items":
        candidates = ["packageId"]
    return candidates


async def resolve_includes(records: list, select: str) -> list:
    """Resolve embedded resources in a PostgREST select string.

    Parses *select* for patterns such as ``Tenant(name, domain)``,
    ``customer:Customer(name,phone)``, ``preparedByUser:User!hint(id)``,
    ``item(id,name)``, or ``items(*)``.  For each discovered relation the
    function:

    1. Finds the foreign-key field in each record (e.g. ``tenantId``).
    2. Batch-queries the related table for **all** distinct FK values.
    3. Injects the related row(s) into each record as a nested dict (has-one)
       or list of dicts (has-many).

    This replaces PostgREST's built-in embedded-resource joins which require
    foreign-key constraints that do not exist in this schema.

    Parameters
    ----------
    records:
        List of dicts returned by ``query_table`` (the ``data`` key).
    select:
        The original PostgREST select string **containing** the join parts.

    Returns
    -------
    The same list of dicts, mutated in-place with nested relation data.
    """
    if not records or not select:
        return records

    relations = []
    for m in _EMBED_RE.finditer(select):
        alias = m.group(1)
        table_name = m.group(2)
        columns = m.group(3).strip()
        if alias is None:
            alias = table_name
        relations.append((alias, table_name, columns))

    if not relations:
        return records

    for alias, table_name, columns in relations:
        # ── has-many path ──────────────────────────────────────────────
        if alias in _HAS_MANY_CONFIG:
            related_table, fk_field = _HAS_MANY_CONFIG[alias]
            record_ids = [r["id"] for r in records if r.get("id") is not None]
            if not record_ids:
                for r in records:
                    r[alias] = []
                continue
            try:
                # Strip nested joins from columns for the initial query
                clean_columns = strip_joins_from_select(columns)
                result = await query_table(
                    related_table,
                    select=clean_columns,
                    where={fk_field: {"in": record_ids}},
                )
                related_records = result.get("data", [])
                # Recursively resolve nested joins in related records
                if clean_columns != columns and related_records:
                    related_records = await resolve_includes(related_records, columns)
                grouped: dict = {}
                for row in related_records:
                    grouped.setdefault(row.get(fk_field), []).append(row)
                for r in records:
                    r[alias] = grouped.get(r.get("id"), [])
            except Exception as exc:
                log.warning(f"resolve_includes (has-many {alias}): {exc}")
                for r in records:
                    r[alias] = []
            continue

        # ── has-one path ────────────────────────────────────────────────
        resolved_table = _resolve_table_name(table_name)
        fk_candidates = _get_fk_candidates(alias)

        fk_field = None
        for candidate in fk_candidates:
            if any(r.get(candidate) is not None for r in records):
                fk_field = candidate
                break

        if fk_field is None:
            log.warning(
                "resolve_includes: no FK field found for %r "
                "(candidates: %s)",
                alias,
                fk_candidates,
            )
            for r in records:
                r[alias] = None
            continue

        fk_values = list(
            {r[fk_field] for r in records if r.get(fk_field) is not None}
        )
        if not fk_values:
            for r in records:
                r[alias] = None
            continue

        try:
            result = await query_table(
                resolved_table,
                select=columns,
                where={"id": {"in": fk_values}},
            )
            lookup = {r["id"]: r for r in result.get("data", [])}
            for r in records:
                r[alias] = lookup.get(r.get(fk_field))
        except Exception as exc:
            log.warning(f"resolve_includes ({alias}): {exc}")
            for r in records:
                r[alias] = None

    return records
