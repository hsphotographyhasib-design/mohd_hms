import re
from typing import Any, Literal

import httpx

from app.core.config import get_settings
from app.core.exceptions import InternalException, NotFoundException
from app.core.logging import get_logger

log = get_logger(__name__)

# ── Table name mapping: camelCase Prisma model → PascalCase Supabase table ─────
#
# Supabase/PostgREST uses the table names as-is in the REST URL.
# The Prisma schema uses camelCase model names, but the actual Supabase
# tables use PascalCase. This map translates between the two.

MODEL_TO_TABLE: dict[str, str] = {
    # ─── Core Auth & Tenancy ────────────────────────────────────────────
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
    # ─── Complaints ─────────────────────────────────────────────────────
    "complaint": "Complaint",
    "complaintTimeline": "ComplaintTimeline",
    # ─── Work Orders ────────────────────────────────────────────────────
    "workOrder": "WorkOrder",
    "workOrderMaterial": "WorkOrderMaterial",
    # ─── Equipment ──────────────────────────────────────────────────────
    "equipment": "Equipment",
    "equipmentQrCode": "EquipmentQrCode",
    # ─── Customers ──────────────────────────────────────────────────────
    "customer": "Customer",
    "customerFeedback": "CustomerFeedback",
    "customerReport": "CustomerReport",
    # ─── Invoices ───────────────────────────────────────────────────────
    "invoice": "Invoice",
    "invoicePayment": "InvoicePayment",
    "paymentVerification": "PaymentVerification",
    # ─── Quotations ─────────────────────────────────────────────────────
    "quotation": "Quotation",
    # ─── Inventory ──────────────────────────────────────────────────────
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
    # ─── Purchases ──────────────────────────────────────────────────────
    "purchaseOrder": "PurchaseOrder",
    # ─── Vehicles ───────────────────────────────────────────────────────
    "vehicle": "Vehicle",
    "vehicleLog": "VehicleLog",
    # ─── Employees / HR ────────────────────────────────────────────────
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
    # ─── PM Schedules ───────────────────────────────────────────────────
    "pmSchedule": "PmSchedule",
    # ─── IRMS / Inspections ────────────────────────────────────────────
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
    # ─── Notifications ──────────────────────────────────────────────────
    "notification": "Notification",
    "notificationLog": "NotificationLog",
    "broadcastLog": "BroadcastLog",
    # ─── WhatsApp ───────────────────────────────────────────────────────
    "whatsappConfig": "WhatsAppConfig",
    "whatsappMessage": "WhatsAppMessage",
    "whatsappSession": "WhatsAppSession",
    "whatsappTemplate": "WhatsAppTemplate",
    "whatsappDeliveryLog": "WhatsAppDeliveryLog",
    "conversationThread": "ConversationThread",
    # ─── Email ──────────────────────────────────────────────────────────
    "emailLog": "EmailLog",
    "emailTemplate": "EmailTemplate",
    # ─── Documents ──────────────────────────────────────────────────────
    "document": "Document",
    "documentVersion": "DocumentVersion",
    "documentAuditLog": "DocumentAuditLog",
    # ─── CMS ────────────────────────────────────────────────────────────
    "cmsSetting": "CmsSetting",
    "cmsPage": "CmsPage",
    "cmsPageTemplate": "CmsPageTemplate",
    "cmsBlog": "CmsBlog",
    "cmsBlogCategory": "CmsBlogCategory",
    "cmsBlog": "CmsBlog",
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
    # ─── AI ─────────────────────────────────────────────────────────────
    "aiConversationLog": "AiConversationLog",
    # ─── Locations ──────────────────────────────────────────────────────
    "savedLocation": "SavedLocation",
    "scanLog": "ScanLog",
    # ─── Audit & Errors ─────────────────────────────────────────────────
    "auditLog": "AuditLog",
    "errorLog": "ErrorLog",
}


# ── PostgREST filter builder ───────────────────────────────────────────────────


def where_to_postgrest_filters(
    where: dict[str, Any],
    prefix: str = "",
) -> str:
    """Convert a Prisma-style where dict to a PostgREST query string filter.

    Supported operators (mapped from Prisma conventions):
      - Direct equality:  {"status": "open"}          → status=eq.open
      - In:               {"status": {"in": [...]}}  → status=in.(a,b,c)
      - Not in:           {"status": {"notIn": [...]}}→ status=not.in.(a,b,c)
      - Contains:         {"name": {"contains": "x"}}→ name=ilike.*x*
      - Starts with:      {"name": {"startsWith": "x"}}→ name=ilike.x*
      - Ends with:        {"name": {"endsWith": "x"}}→ name=ilike.*x
      - gt, gte, lt, lte: {"amount": {"gt": 100}}    → amount=gt.100
      - ne:               {"status": {"ne": "x"}}    → status=neq.x
      - isNull:           {"field": {"isNull": true}} → field=is.null
      - isNotNull:        {"field": {"isNotNull": true}} → field=not.is.null
      - OR:               {"OR": [...]}               → or=(and1, and2, ...)
      - AND:              {"AND": [...]}              → and=(cond1, cond2, ...)
      - NOT:              {"NOT": {...}}              → not=(cond)

    Args:
        where:  Prisma-style where clause dict.
        prefix: Key prefix for recursive calls (e.g. "complaint.").

    Returns:
        PostgREST query string (the part after the ``?`` that goes into the URL).
    """
    filters: list[str] = []

    for key, value in where.items():
        full_key = f"{prefix}{key}" if prefix else key

        # ── Logical operators ───────────────────────────────────────────
        if key.upper() == "OR" and isinstance(value, list):
            or_parts: list[str] = []
            for sub in value:
                if isinstance(sub, dict):
                    sub_filter = where_to_postgrest_filters(sub, prefix)
                    if sub_filter:
                        or_parts.append(f"and({sub_filter})")
            if or_parts:
                filters.append(f"or({','.join(or_parts)})")
            continue

        if key.upper() == "AND" and isinstance(value, list):
            and_parts: list[str] = []
            for sub in value:
                if isinstance(sub, dict):
                    sub_filter = where_to_postgrest_filters(sub, prefix)
                    if sub_filter:
                        and_parts.append(sub_filter)
            if and_parts:
                filters.append(f"and({','.join(and_parts)})")
            continue

        if key.upper() == "NOT" and isinstance(value, dict):
            not_filter = where_to_postgrest_filters(value, prefix)
            if not_filter:
                filters.append(f"not({not_filter})")
            continue

        # ── Operator objects ─────────────────────────────────────────────
        if isinstance(value, dict):
            for op, op_val in value.items():
                match op:
                    case "eq":
                        filters.append(f"{full_key}=eq.{_escape(op_val)}")
                    case "ne" | "neq":
                        filters.append(f"{full_key}=neq.{_escape(op_val)}")
                    case "in":
                        items = ",".join(_escape(v) for v in op_val)
                        filters.append(f"{full_key}=in.({items})")
                    case "notIn":
                        items = ",".join(_escape(v) for v in op_val)
                        filters.append(f"{full_key}=not.in.({items})")
                    case "contains":
                        filters.append(f"{full_key}=ilike.*{_escape(op_val)}*")
                    case "startsWith":
                        filters.append(f"{full_key}=ilike.{_escape(op_val)}*")
                    case "endsWith":
                        filters.append(f"{full_key}=ilike.*{_escape(op_val)}")
                    case "gt":
                        filters.append(f"{full_key}=gt.{_escape(op_val)}")
                    case "gte":
                        filters.append(f"{full_key}=gte.{_escape(op_val)}")
                    case "lt":
                        filters.append(f"{full_key}=lt.{_escape(op_val)}")
                    case "lte":
                        filters.append(f"{full_key}=lte.{_escape(op_val)}")
                    case "isNull":
                        if op_val:
                            filters.append(f"{full_key}=is.null")
                        else:
                            filters.append(f"{full_key}=not.is.null")
                    case "isNotNull":
                        if op_val:
                            filters.append(f"{full_key}=not.is.null")
                    case _:
                        log.warning(f"Unsupported PostgREST operator: {op}")
            continue

        # ── Direct equality (non-dict value) ─────────────────────────────
        filters.append(f"{full_key}=eq.{_escape(value)}")

    return ",".join(filters)


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
    # String: escape commas, parens, dots that would break PostgREST syntax
    escaped = str(value).replace(",", r"\2C").replace("(", r"\28").replace(")", r"\29").replace(".", r"\2E")
    return escaped


# ── Database client ───────────────────────────────────────────────────────────


_client: httpx.AsyncClient | None = None


def _get_table_name(model_or_table: str) -> str:
    """Resolve a model name (camelCase) or table name (PascalCase) to the
    actual Supabase/PostgREST table name.
    """
    if model_or_table in MODEL_TO_TABLE:
        return MODEL_TO_TABLE[model_or_table]
    # If it's already PascalCase or a direct table name, return as-is
    return model_or_table


def get_supabase_client() -> httpx.AsyncClient:
    """Return the singleton httpx.AsyncClient configured for Supabase PostgREST.

    Uses the service_role key for full admin access (bypasses RLS).
    For user-scoped queries, tenant isolation must be enforced in the where clause.
    """
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
                  a ``tenantId`` filter is automatically injected.
        order:    PostgREST order string, e.g. "createdAt.desc".
        limit:    Max rows to return.
        offset:   Rows to skip.
        count:    Include ``Prefer: count=<value>`` header.
        tenant_id: If provided, injects ``tenantId=eq.<id>`` into where.

    Returns:
        Dict with keys:
          - data: list of records
          - count: total count (if count param was set)
          - range: Content-Range header value
    """
    client = get_supabase_client()
    table_name = _get_table_name(table)

    # Build query params
    params: dict[str, str] = {"select": select}

    # Build where clause
    effective_where: dict[str, Any] = {}
    if tenant_id:
        effective_where["tenantId"] = tenant_id
    if where:
        # Merge, letting explicit where override tenant_id if needed
        effective_where.update(where)

    if effective_where:
        filter_str = where_to_postgrest_filters(effective_where)
        if filter_str:
            params["filter"] = filter_str  # Not a real PostgREST param — we inline into URL

    if order:
        params["order"] = order

    # Build headers
    headers: dict[str, str] = {
        "apikey": client.headers.get("apikey", ""),
        "Authorization": client.headers.get("Authorization", ""),
    }
    if count:
        headers["Prefer"] = f"count={count},return=representation"

    # Build URL with filters inlined (PostgREST uses column=value in query params)
    url_path = f"/rest/v1/{table_name}"
    query_parts: list[str] = []

    # Add filter params as PostgREST column filters
    if effective_where:
        filter_str = where_to_postgrest_filters(effective_where)
        if filter_str:
            # Each filter is a separate query param
            # For AND: just add them all
            # For OR/AND/NOT: need special handling
            _add_filters_to_query(filter_str, query_parts)

    for k, v in params.items():
        if k != "filter":
            query_parts.append(f"{k}={v}")

    # Pagination via Range header
    range_start = offset or 0
    range_end = (range_start + (limit or 1000)) - 1
    if limit:
        range_end = range_start + limit - 1
    headers["Range"] = f"{range_start}-{range_end}"

    url = f"{client.base_url}{url_path}?{'&'.join(query_parts)}"

    try:
        response = await client.get(url_path, params={k: v for k, v in params.items() if k != "filter"}, headers=headers)
    except httpx.HTTPError as exc:
        log.error(f"PostgREST query failed: {exc}")
        raise InternalException(message="Database query failed") from exc

    if response.status_code >= 400:
        log.error(f"PostgREST {response.status_code}: {response.text}")
        raise InternalException(message=f"Database error: {response.status_code}")

    result: dict[str, Any] = {"data": response.json()}

    # Extract count from header
    content_range = response.headers.get("content-range", "")
    if content_range and count:
        # Format: "0-24/100" where 100 is total
        parts = content_range.split("/")
        if len(parts) == 2:
            result["count"] = parts[1]

    result["range"] = content_range
    return result


def _add_filters_to_query(filter_str: str, query_parts: list[str]) -> None:
    """Parse the filter string and add individual PostgREST filter params.

    PostgREST expects column operators as separate query params:
      ?status=eq.open&priority=in.(high,medium)

    For complex logical operators (or, and, not), we use the special
    PostgREST syntax.
    """
    # Split by commas but respect parentheses
    parts: list[str] = []
    depth = 0
    current = ""
    for ch in filter_str:
        if ch == "(" :
            depth += 1
            current += ch
        elif ch == ")":
            depth -= 1
            current += ch
        elif ch == "," and depth == 0:
            if current.strip():
                parts.append(current.strip())
            current = ""
        else:
            current += ch
    if current.strip():
        parts.append(current.strip())

    for part in parts:
        # Check for logical operators (or(...), and(...), not(...))
        if part.startswith("or(") and part.endswith(")"):
            query_parts.append(part)
        elif part.startswith("and(") and part.endswith(")"):
            query_parts.append(part)
        elif part.startswith("not(") and part.endswith(")"):
            query_parts.append(part)
        else:
            # Regular column.operator.value filter
            # Split on first = to get the param key=value
            eq_pos = part.find("=")
            if eq_pos > 0:
                query_parts.append(part)
            else:
                query_parts.append(part)


async def insert_record(table: str, data: dict[str, Any]) -> dict[str, Any]:
    """Insert a single record into a Supabase table.

    Args:
        table: Prisma model name or direct table name.
        data:  Record data dict.

    Returns:
        The inserted record (as returned by PostgREST with return=representation).
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

    Args:
        table:     Prisma model name or direct table name.
        record_id: The record's ``id`` value.
        data:      Partial update data.

    Returns:
        The updated record.
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
    """Delete a record by ID from a Supabase table.

    Args:
        table:     Prisma model name or direct table name.
        record_id: The record's ``id`` value.
    """
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
    """Count records in a Supabase table.

    Args:
        table:     Prisma model name or direct table name.
        where:     Optional Prisma-style where clause.
        tenant_id: If provided, injects ``tenantId=eq.<id>`` into where.

    Returns:
        Total matching record count.
    """
    result = await query_table(table, select="id", where=where, tenant_id=tenant_id, count="exact", limit=1)
    count_str = result.get("count", "0")
    # Handle '*' (PostgREST returns '*' when count is not exact)
    if count_str == "*":
        return len(result.get("data", []))
    try:
        return int(count_str)
    except (ValueError, TypeError):
        return 0
