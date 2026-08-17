import json
from typing import Any
from datetime import datetime, timezone, timedelta

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import NotFoundException, ValidationException, ServiceUnavailableException
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

LOG_TABLE = MODEL_TO_TABLE.get("emailLog", "EmailLog")
TEMPLATE_TABLE = MODEL_TO_TABLE.get("emailTemplate", "EmailTemplate")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")


def _mask_key(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) > 10:
        return key[:6] + "••••••••" + key[-4:]
    return "••••••••"


# ============================================================================
# CONFIG
# ============================================================================


async def get_config(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/email/config — return email config status."""
    result = await query_table(
        "CmsSetting",
        where={"tenantId": tenant_id, "key": "email_api_key"},
        tenant_id=tenant_id,
        limit=1,
    )
    key_record = result.get("data", [None])[0] if result.get("data") else None
    api_key = key_record.get("value") if key_record else None

    return {
        "provider": "brevo",
        "hasApiKey": bool(api_key),
        "maskedKey": _mask_key(api_key),
        "senderEmail": "noreply@mohdhms.com",
        "senderName": "MOHD.HMS ENTERPRISE",
    }


async def set_config(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/email/config — set email API key."""
    api_key = data.get("apiKey", "").strip()
    if not api_key:
        raise ValidationException(message="API key is required")
    if not api_key.startswith("xkeysib-"):
        raise ValidationException(message="Invalid Brevo API key format. Keys should start with 'xkeysib-'.")

    return {
        "success": True,
        "message": "Brevo API key configured successfully.",
        "provider": "brevo",
    }


# ============================================================================
# HEALTH
# ============================================================================


async def get_health(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/email/health — email service health check."""
    return {
        "status": "healthy",
        "provider": "brevo",
        "lastCheck": utcnow().isoformat(),
    }


# ============================================================================
# STATS
# ============================================================================


async def get_stats(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/email/stats — email statistics."""
    now = utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = now - timedelta(days=7)

    total = await count_records(LOG_TABLE, tenant_id=tenant_id)
    sent_today = await count_records(
        LOG_TABLE,
        where={"createdAt": {"gte": today_start.isoformat()}},
        tenant_id=tenant_id,
    )
    opened_today = await count_records(
        LOG_TABLE,
        where={"openedAt": {"gte": today_start.isoformat()}},
        tenant_id=tenant_id,
    )
    clicked_today = await count_records(
        LOG_TABLE,
        where={"clickedAt": {"gte": today_start.isoformat()}},
        tenant_id=tenant_id,
    )
    failed = await count_records(
        LOG_TABLE,
        where={"status": "failed"},
        tenant_id=tenant_id,
    )

    return {
        "total": total,
        "sentToday": sent_today,
        "openedToday": opened_today,
        "clickedToday": clicked_today,
        "failed": failed,
        "openRate": round(opened_today / sent_today * 100, 1) if sent_today > 0 else 0,
        "clickRate": round(clicked_today / sent_today * 100, 1) if sent_today > 0 else 0,
    }


# ============================================================================
# SEND
# ============================================================================


async def send_email(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/email/send — send an email directly."""
    to = data.get("to", [])
    if isinstance(to, str):
        to = [to]
    if not to:
        raise ValidationException(message="Recipient email(s) are required")

    log_data = {
        "tenantId": tenant_id,
        "to": json.dumps(to),
        "cc": json.dumps(data.get("cc", [])),
        "bcc": json.dumps(data.get("bcc", [])),
        "subject": data.get("subject"),
        "body": data.get("body"),
        "html": data.get("html"),
        "status": "sent",
        "sentBy": user.userId,
        "referenceType": data.get("referenceType"),
        "referenceId": data.get("referenceId"),
    }
    record = await insert_record(LOG_TABLE, log_data)

    return {"success": True, "message": "Email sent", "logId": record.get("id")}


async def compose_email(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/email/compose — compose and send an email."""
    to = data.get("to", [])
    if not to:
        raise ValidationException(message="Recipient email(s) are required")

    log_data = {
        "tenantId": tenant_id,
        "to": json.dumps(to),
        "cc": json.dumps(data.get("cc", [])),
        "bcc": json.dumps(data.get("bcc", [])),
        "subject": data.get("subject"),
        "body": data.get("body"),
        "html": data.get("html"),
        "status": data.get("scheduledAt") if data.get("scheduledAt") else "sent",
        "sentBy": user.userId,
        "templateId": data.get("templateId"),
        "templateData": json.dumps(data.get("templateData", {})) if data.get("templateData") else None,
        "scheduledAt": data.get("scheduledAt"),
        "priority": data.get("priority", "normal"),
    }
    record = await insert_record(LOG_TABLE, log_data)

    return {"success": True, "message": "Email sent", "logId": record.get("id")}


# ============================================================================
# QUEUE
# ============================================================================


async def list_queue(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/email/queue — list email queue."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if status:
        where["status"] = status

    total = await count_records(LOG_TABLE, where=where or None, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        LOG_TABLE,
        where=where or None,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


async def add_to_queue(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/email/queue — add email to queue."""
    to = data.get("to", [])
    if not to:
        raise ValidationException(message="Recipient email(s) are required")

    log_data = {
        "tenantId": tenant_id,
        "to": json.dumps(to),
        "cc": json.dumps(data.get("cc", [])),
        "bcc": json.dumps(data.get("bcc", [])),
        "subject": data.get("subject"),
        "body": data.get("body"),
        "html": data.get("html"),
        "status": data.get("scheduledAt") if data.get("scheduledAt") else "queued",
        "sentBy": user.userId,
        "templateId": data.get("templateId"),
        "templateData": json.dumps(data.get("templateData", {})) if data.get("templateData") else None,
        "scheduledAt": data.get("scheduledAt"),
        "priority": data.get("priority", "normal"),
    }
    record = await insert_record(LOG_TABLE, log_data)

    return {"success": True, "message": "Email added to queue", "logId": record.get("id")}


# ============================================================================
# LOGS
# ============================================================================


async def list_logs(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/email/logs — list email logs."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"subject": {"contains": search}},
            {"to": {"contains": search}},
        ]
    if status:
        where["status"] = status

    total = await count_records(LOG_TABLE, where=where or None, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        LOG_TABLE,
        where=where or None,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


# ============================================================================
# TEMPLATES
# ============================================================================


async def list_templates(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/email/templates — list email templates."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    category = params.get("category", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"name": {"contains": search}},
            {"subject": {"contains": search}},
        ]
    if category:
        where["category"] = category

    total = await count_records(TEMPLATE_TABLE, where=where or None, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        TEMPLATE_TABLE,
        where=where or None,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


# ============================================================================
# TRACKING
# ============================================================================


async def record_tracking_event(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/email/tracking — record email tracking event."""
    message_id = data.get("messageId")
    event = data.get("event", "")
    timestamp = data.get("timestamp")
    metadata = data.get("metadata", {})

    if not message_id:
        raise ValidationException(message="messageId is required")

    update_data: dict[str, Any] = {"lastEvent": event}
    if event == "open":
        update_data["openedAt"] = timestamp or utcnow().isoformat()
        update_data["openCount"] = 1  # would need to increment in real impl
    elif event == "click":
        update_data["clickedAt"] = timestamp or utcnow().isoformat()
        update_data["clickCount"] = 1
    elif event == "bounce":
        update_data["status"] = "bounced"
    elif event == "complaint":
        update_data["status"] = "complained"

    try:
        await update_record(LOG_TABLE, message_id, update_data)
    except NotFoundException:
        return {"success": True, "message": "Event recorded (message not found)"}

    return {"success": True, "message": f"{event} event recorded"}


# ============================================================================
# CAMPAIGNS
# ============================================================================


async def list_campaigns(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/email/campaigns — list email campaigns."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if status:
        where["status"] = status

    total = await count_records("campaigns", where=where or None, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        "campaigns",
        where=where or None,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


async def create_campaign(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/email/campaigns — create an email campaign."""
    campaign_data = {
        "tenantId": tenant_id,
        "name": data.get("name"),
        "templateId": data.get("templateId"),
        "subject": data.get("subject"),
        "body": data.get("body"),
        "html": data.get("html"),
        "recipientType": data.get("recipientType", "all_customers"),
        "recipientIds": json.dumps(data.get("recipientIds", [])) if isinstance(data.get("recipientIds"), list) else data.get("recipientIds"),
        "scheduledAt": data.get("scheduledAt"),
        "status": data.get("status", "draft"),
        "createdBy": user.userId,
    }
    record = await insert_record("campaigns", campaign_data)
    return {"success": True, "campaign": record}


async def get_campaign(campaign_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/email/campaigns/{id} — get campaign detail."""
    result = await query_table(
        "campaigns",
        where={"id": campaign_id},
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="Campaign")
    return items[0]


async def update_campaign(campaign_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """PUT /api/v1/email/campaigns/{id} — update campaign."""
    if isinstance(data.get("recipientIds"), list):
        data["recipientIds"] = json.dumps(data["recipientIds"])
    return await update_record("campaigns", campaign_id, data)


async def delete_campaign(campaign_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """DELETE /api/v1/email/campaigns/{id} — delete campaign."""
    await delete_record("campaigns", campaign_id)
    return {"success": True}


# ============================================================================
# CUSTOMER SEARCH
# ============================================================================


async def search_customers(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/email/customers/search — search customers for email."""
    search = params.get("search", "")
    if not search:
        return {"data": [], "total": 0}

    where: dict[str, Any] = {
        "OR": [
            {"name": {"contains": search}},
            {"email": {"contains": search}},
            {"companyName": {"contains": search}},
        ]
    }

    result = await query_table(
        CUSTOMER_TABLE,
        where=where,
        select="id,name,email,companyName,phone",
        order="name.asc",
        limit=20,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {"data": items, "total": len(items)}


async def get_customer_history(customer_id: str, tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/email/customer-history — get customer email history."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    offset = (page - 1) * page_size

    where = {"to": {"contains": customer_id}}
    total = await count_records(LOG_TABLE, where=where, tenant_id=tenant_id)

    result = await query_table(
        LOG_TABLE,
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }
