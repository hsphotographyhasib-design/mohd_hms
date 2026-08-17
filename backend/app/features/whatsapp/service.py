from typing import Any
from datetime import datetime, timezone, timedelta
import json

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

CONFIG_TABLE = MODEL_TO_TABLE.get("whatsappConfig", "WhatsAppConfig")
SESSION_TABLE = MODEL_TO_TABLE.get("whatsappSession", "WhatsAppSession")
MESSAGE_TABLE = MODEL_TO_TABLE.get("whatsappMessage", "WhatsAppMessage")
TEMPLATE_TABLE = MODEL_TO_TABLE.get("whatsappTemplate", "WhatsAppTemplate")
DELIVERY_LOG_TABLE = MODEL_TO_TABLE.get("whatsappDeliveryLog", "WhatsAppDeliveryLog")
THREAD_TABLE = MODEL_TO_TABLE.get("conversationThread", "ConversationThread")
AI_LOG_TABLE = MODEL_TO_TABLE.get("aiConversationLog", "AiConversationLog")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")


def _redact(val: str | None) -> str | None:
    return "***configured***" if val else None


# ============================================================================
# INFO / DASHBOARD
# ============================================================================


async def get_whatsapp_info(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp — dashboard stats."""
    now = utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = now - timedelta(days=7)

    total_sessions = await count_records(SESSION_TABLE, tenant_id=tenant_id)
    active_sessions = await count_records(
        SESSION_TABLE,
        where={"isActive": True, "isBlocked": False},
        tenant_id=tenant_id,
    )
    total_messages = await count_records(MESSAGE_TABLE, tenant_id=tenant_id)
    messages_today = await count_records(
        MESSAGE_TABLE,
        where={"createdAt": {"gte": today_start.isoformat()}},
        tenant_id=tenant_id,
    )
    inbound_today = await count_records(
        MESSAGE_TABLE,
        where={"direction": "inbound", "createdAt": {"gte": today_start.isoformat()}},
        tenant_id=tenant_id,
    )
    outbound_today = await count_records(
        MESSAGE_TABLE,
        where={"direction": "outbound", "createdAt": {"gte": today_start.isoformat()}},
        tenant_id=tenant_id,
    )
    unresolved_threads = await count_records(
        THREAD_TABLE,
        where={"status": "active"},
        tenant_id=tenant_id,
    )

    config_result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = config_result.get("data", [None])[0] if config_result.get("data") else None

    recent_sessions_result = await query_table(
        SESSION_TABLE,
        where={"tenantId": tenant_id},
        order="lastMessageAt.desc",
        limit=5,
        tenant_id=tenant_id,
    )
    recent_sessions = recent_sessions_result.get("data", [])

    recent_messages_result = await query_table(
        MESSAGE_TABLE,
        where={"tenantId": tenant_id},
        order="createdAt.desc",
        limit=10,
        tenant_id=tenant_id,
    )
    recent_messages = recent_messages_result.get("data", [])

    return {
        "totalSessions": total_sessions,
        "activeSessions": active_sessions,
        "totalMessages": total_messages,
        "messagesToday": messages_today,
        "inboundToday": inbound_today,
        "outboundToday": outbound_today,
        "unresolvedThreads": unresolved_threads,
        "connectionStatus": config.get("openwaStatus", "disconnected") if config else "disconnected",
        "provider": config.get("provider", "openwa") if config else "openwa",
        "recentSessions": recent_sessions,
        "recentMessages": recent_messages,
        "messageTrend": [],
        "complaintsViaWhatsapp": 0,
        "avgResponseTime": 0,
    }


# ============================================================================
# CONFIG
# ============================================================================


async def get_config(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/config — get WhatsApp config (redacted)."""
    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    if not config:
        return {
            "id": None,
            "tenantId": tenant_id,
            "provider": "openwa",
            "isEnabled": False,
            "openwaStatus": "disconnected",
            "autoReplyEnabled": True,
            "welcomeMessage": "Welcome! How can we help you today?",
            "defaultPriority": "medium",
        }

    config["openwaApiKey"] = _redact(config.get("openwaApiKey"))
    config["metaAccessToken"] = _redact(config.get("metaAccessToken"))
    config["metaVerifyToken"] = _redact(config.get("metaVerifyToken"))
    config["metaWebhookSecret"] = _redact(config.get("metaWebhookSecret"))
    config["twilioAccountSid"] = _redact(config.get("twilioAccountSid"))
    config["twilioAuthToken"] = _redact(config.get("twilioAuthToken"))
    return config


async def update_config(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """PUT /api/v1/whatsapp/config — update WhatsApp config."""
    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    if not config:
        raise NotFoundException(resource="WhatsAppConfig", message="Config not found. Please initialize first.")

    updated = await update_record(CONFIG_TABLE, config["id"], data)
    updated["openwaApiKey"] = _redact(updated.get("openwaApiKey"))
    updated["metaAccessToken"] = _redact(updated.get("metaAccessToken"))
    updated["metaVerifyToken"] = _redact(updated.get("metaVerifyToken"))
    updated["metaWebhookSecret"] = _redact(updated.get("metaWebhookSecret"))
    updated["twilioAccountSid"] = _redact(updated.get("twilioAccountSid"))
    updated["twilioAuthToken"] = _redact(updated.get("twilioAuthToken"))
    return updated


# ============================================================================
# CONNECTION
# ============================================================================


async def get_connection_status(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/connection — connection status."""
    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    return {
        "status": config.get("openwaStatus", "disconnected") if config else "disconnected",
        "provider": config.get("provider", "openwa") if config else "openwa",
        "qrCode": config.get("openwaQrCode") if config else None,
        "phoneNumber": config.get("phoneNumber") if config else None,
        "isEnabled": config.get("isEnabled", False) if config else False,
    }


async def connect_whatsapp(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/whatsapp/connection — initiate connection."""
    action = data.get("action", "connect")

    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    if action == "disconnect" and config:
        await update_record(CONFIG_TABLE, config["id"], {
            "openwaStatus": "disconnected",
            "openwaQrCode": None,
        })
        return {"status": "disconnected", "message": "WhatsApp disconnected"}

    if action == "reconnect" and config:
        await update_record(CONFIG_TABLE, config["id"], {
            "openwaStatus": "connecting",
            "openwaQrCode": None,
        })
        return {"status": "connecting", "message": "Reconnection initiated"}

    return {"status": "connecting", "message": "Connection initiated"}


# ============================================================================
# SEND MESSAGE
# ============================================================================


async def send_message(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/whatsapp/send — send a message."""
    session_id = data.get("sessionId")
    phone = data.get("phone")
    content = data.get("content", "")
    message_type = data.get("messageType", "text")

    if not content:
        raise ValidationException(message="Message content is required")

    if session_id:
        session_result = await query_table(
            SESSION_TABLE,
            where={"id": session_id, "tenantId": tenant_id},
            tenant_id=tenant_id,
            limit=1,
        )
        session = session_result.get("data", [None])[0] if session_result.get("data") else None
        if session:
            phone = session.get("phoneNumber", phone)

    if not phone:
        raise ValidationException(message="Phone number or session ID is required")

    message_data = {
        "tenantId": tenant_id,
        "sessionId": session_id,
        "direction": "outbound",
        "messageType": message_type,
        "content": content,
        "status": "sent",
        "isFromBot": False,
        "phoneNumber": phone,
    }

    record = await insert_record(MESSAGE_TABLE, message_data)
    return {"success": True, "message": record}


# ============================================================================
# SESSIONS
# ============================================================================


async def list_sessions(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/sessions — list WhatsApp sessions."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")
    state = params.get("state", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"phoneNumber": {"contains": search}},
            {"customerName": {"contains": search}},
        ]
    if status == "active":
        where["isActive"] = True
        where["isBlocked"] = False
    elif status == "blocked":
        where["isBlocked"] = True
    if state:
        where["state"] = state

    total = await count_records(SESSION_TABLE, where=where or None, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        SESSION_TABLE,
        where=where or None,
        order="lastMessageAt.desc",
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


async def get_session(session_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/sessions/{id} — get session detail."""
    result = await query_table(
        SESSION_TABLE,
        where={"id": session_id},
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="WhatsAppSession")
    return items[0]


async def update_session(session_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """PUT /api/v1/whatsapp/sessions/{id} — update session."""
    return await update_record(SESSION_TABLE, session_id, data)


async def delete_session(session_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """DELETE /api/v1/whatsapp/sessions/{id} — delete session."""
    await delete_record(SESSION_TABLE, session_id)
    return {"success": True}


# ============================================================================
# SESSION MESSAGES
# ============================================================================


async def list_session_messages(session_id: str, tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/sessions/{id}/messages — list messages in a session."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 50)

    where = {"sessionId": session_id, "tenantId": tenant_id}
    total = await count_records(MESSAGE_TABLE, where=where, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        MESSAGE_TABLE,
        where=where,
        order="createdAt.asc",
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


async def create_session_message(session_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/whatsapp/sessions/{id}/messages — send message in session."""
    content = data.get("content", "")
    if not content:
        raise ValidationException(message="Message content is required")

    message_data = {
        "tenantId": tenant_id,
        "sessionId": session_id,
        "direction": "outbound",
        "messageType": data.get("messageType", "text"),
        "content": content,
        "status": "sent",
        "isFromBot": False,
        "sentBy": user.userId,
    }
    record = await insert_record(MESSAGE_TABLE, message_data)
    return {"success": True, "message": record}


# ============================================================================
# THREADS
# ============================================================================


async def list_threads(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/threads — list conversation threads."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"subject": {"contains": search}},
            {"customerName": {"contains": search}},
        ]
    if status:
        where["status"] = status

    total = await count_records(THREAD_TABLE, where=where or None, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        THREAD_TABLE,
        where=where or None,
        order="lastMessageAt.desc",
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


async def create_thread(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/whatsapp/threads — create a thread."""
    thread_data = {
        "tenantId": tenant_id,
        "sessionId": data.get("sessionId"),
        "subject": data.get("subject"),
        "status": data.get("status", "active"),
        "createdBy": user.userId,
    }
    record = await insert_record(THREAD_TABLE, thread_data)
    return {"success": True, "thread": record}


async def get_thread(thread_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/threads/{id} — get thread detail."""
    result = await query_table(
        THREAD_TABLE,
        where={"id": thread_id},
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="ConversationThread")
    return items[0]


async def update_thread(thread_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """PUT /api/v1/whatsapp/threads/{id} — update thread."""
    return await update_record(THREAD_TABLE, thread_id, data)


# ============================================================================
# TEMPLATES
# ============================================================================


async def list_templates(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/templates — list templates."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"name": {"contains": search}},
            {"body": {"contains": search}},
        ]
    if status:
        where["status"] = status

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


async def create_template(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/whatsapp/templates — create a template."""
    template_data = {
        "tenantId": tenant_id,
        "name": data.get("name"),
        "category": data.get("category", "utility"),
        "language": data.get("language", "en"),
        "body": data.get("body"),
        "header": data.get("header"),
        "footer": data.get("footer"),
        "status": data.get("status", "draft"),
        "variables": json.dumps(data.get("variables", [])) if isinstance(data.get("variables"), list) else data.get("variables"),
        "buttons": json.dumps(data.get("buttons", [])) if isinstance(data.get("buttons"), list) else data.get("buttons"),
        "createdBy": user.userId,
    }
    record = await insert_record(TEMPLATE_TABLE, template_data)
    return {"success": True, "template": record}


async def get_template(template_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/templates/{id} — get template detail."""
    result = await query_table(
        TEMPLATE_TABLE,
        where={"id": template_id},
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="WhatsAppTemplate")
    return items[0]


async def update_template(template_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """PUT /api/v1/whatsapp/templates/{id} — update template."""
    if isinstance(data.get("variables"), list):
        data["variables"] = json.dumps(data["variables"])
    if isinstance(data.get("buttons"), list):
        data["buttons"] = json.dumps(data["buttons"])
    return await update_record(TEMPLATE_TABLE, template_id, data)


async def delete_template(template_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """DELETE /api/v1/whatsapp/templates/{id} — delete template."""
    await delete_record(TEMPLATE_TABLE, template_id)
    return {"success": True}


# ============================================================================
# CAMPAIGNS
# ============================================================================


async def list_campaigns(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/campaigns — list campaigns."""
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
    """POST /api/v1/whatsapp/campaigns — create a campaign."""
    campaign_data = {
        "tenantId": tenant_id,
        "name": data.get("name"),
        "templateId": data.get("templateId"),
        "recipientType": data.get("recipientType", "all_customers"),
        "recipientIds": json.dumps(data.get("recipientIds", [])) if isinstance(data.get("recipientIds"), list) else data.get("recipientIds"),
        "message": data.get("message"),
        "scheduledAt": data.get("scheduledAt"),
        "status": data.get("status", "draft"),
        "createdBy": user.userId,
    }
    record = await insert_record("campaigns", campaign_data)
    return {"success": True, "campaign": record}


async def get_campaign(campaign_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/campaigns/{id} — get campaign detail."""
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
    """PUT /api/v1/whatsapp/campaigns/{id} — update campaign."""
    if isinstance(data.get("recipientIds"), list):
        data["recipientIds"] = json.dumps(data["recipientIds"])
    return await update_record("campaigns", campaign_id, data)


async def delete_campaign(campaign_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """DELETE /api/v1/whatsapp/campaigns/{id} — delete campaign."""
    await delete_record("campaigns", campaign_id)
    return {"success": True}


# ============================================================================
# WEBHOOK
# ============================================================================


async def get_webhook_config(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/webhook — get webhook config."""
    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    return {
        "webhookUrl": config.get("webhookUrl") if config else None,
        "webhookSecret": _redact(config.get("webhookSecret")) if config else None,
        "isEnabled": config.get("webhookEnabled", False) if config else False,
        "provider": config.get("provider", "openwa") if config else "openwa",
    }


async def update_webhook_config(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/whatsapp/webhook — update webhook config."""
    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    if not config:
        raise NotFoundException(resource="WhatsAppConfig", message="Config not found")

    update_data: dict[str, Any] = {}
    if "webhookUrl" in data:
        update_data["webhookUrl"] = data["webhookUrl"]
    if "webhookSecret" in data:
        update_data["webhookSecret"] = data["webhookSecret"]
    if "isEnabled" in data:
        update_data["webhookEnabled"] = data["isEnabled"]

    updated = await update_record(CONFIG_TABLE, config["id"], update_data)
    return {
        "webhookUrl": updated.get("webhookUrl"),
        "webhookSecret": _redact(updated.get("webhookSecret")),
        "isEnabled": updated.get("webhookEnabled", False),
    }


# ============================================================================
# REPORTS
# ============================================================================


async def get_reports(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/reports — WhatsApp reports."""
    now = utcnow()
    date_from = params.get("dateFrom")
    date_to = params.get("dateTo")

    where: dict[str, Any] = {}
    if date_from:
        where["createdAt"] = {"gte": date_from}
    if date_to:
        where["createdAt"] = {"lte": date_to}

    total_sent = await count_records(
        MESSAGE_TABLE,
        where={"direction": "outbound", **where},
        tenant_id=tenant_id,
    )
    total_received = await count_records(
        MESSAGE_TABLE,
        where={"direction": "inbound", **where},
        tenant_id=tenant_id,
    )
    delivered = await count_records(
        DELIVERY_LOG_TABLE,
        where={"status": "delivered", **where},
        tenant_id=tenant_id,
    )
    failed = await count_records(
        DELIVERY_LOG_TABLE,
        where={"status": "failed", **where},
        tenant_id=tenant_id,
    )

    return {
        "totalSent": total_sent,
        "totalReceived": total_received,
        "delivered": delivered,
        "failed": failed,
        "deliveryRate": round(delivered / total_sent * 100, 1) if total_sent > 0 else 0,
        "failureRate": round(failed / total_sent * 100, 1) if total_sent > 0 else 0,
        "dateFrom": date_from,
        "dateTo": date_to,
    }


# ============================================================================
# FEEDBACK
# ============================================================================


async def get_feedback(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/feedback — WhatsApp feedback."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    offset = (page - 1) * page_size

    total = await count_records("customerFeedback", tenant_id=tenant_id)
    result = await query_table(
        "customerFeedback",
        where={"source": "whatsapp"},
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
# AI SETTINGS
# ============================================================================


async def get_ai_settings(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/ai-settings — get AI settings."""
    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    if not config:
        return {
            "isEnabled": False,
            "provider": "openai",
            "model": "gpt-4",
            "systemPrompt": None,
            "maxTokens": 500,
            "temperature": 0.7,
            "autoReplyEnabled": False,
            "handoffTimeout": 300,
            "allowedIntents": [],
        }

    return {
        "isEnabled": config.get("aiEnabled", False),
        "provider": config.get("aiProvider", "openai"),
        "model": config.get("aiModel", "gpt-4"),
        "systemPrompt": config.get("aiSystemPrompt"),
        "maxTokens": config.get("aiMaxTokens", 500),
        "temperature": config.get("aiTemperature", 0.7),
        "autoReplyEnabled": config.get("aiAutoReply", False),
        "handoffTimeout": config.get("aiHandoffTimeout", 300),
        "allowedIntents": config.get("aiAllowedIntents", []),
    }


async def update_ai_settings(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """PATCH /api/v1/whatsapp/ai-settings — update AI settings."""
    result = await query_table(
        CONFIG_TABLE,
        where={"tenantId": tenant_id},
        tenant_id=tenant_id,
        limit=1,
    )
    config = result.get("data", [None])[0] if result.get("data") else None

    if not config:
        raise NotFoundException(resource="WhatsAppConfig", message="Config not found")

    mapping = {
        "isEnabled": "aiEnabled",
        "provider": "aiProvider",
        "model": "aiModel",
        "systemPrompt": "aiSystemPrompt",
        "maxTokens": "aiMaxTokens",
        "temperature": "aiTemperature",
        "autoReplyEnabled": "aiAutoReply",
        "handoffTimeout": "aiHandoffTimeout",
        "allowedIntents": "aiAllowedIntents",
    }

    update_data: dict[str, Any] = {}
    for key, db_key in mapping.items():
        if key in data:
            val = data[key]
            if isinstance(val, list):
                val = json.dumps(val)
            update_data[db_key] = val

    if update_data:
        await update_record(CONFIG_TABLE, config["id"], update_data)

    return {"success": True}


# ============================================================================
# AI DASHBOARD
# ============================================================================


async def get_ai_dashboard(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/ai-dashboard — AI dashboard stats."""
    total_conversations = await count_records(AI_LOG_TABLE, tenant_id=tenant_id)
    resolved_by_ai = await count_records(
        AI_LOG_TABLE,
        where={"resolvedByAi": True},
        tenant_id=tenant_id,
    )
    escalated = await count_records(
        AI_LOG_TABLE,
        where={"wasEscalated": True},
        tenant_id=tenant_id,
    )

    return {
        "totalConversations": total_conversations,
        "resolvedByAi": resolved_by_ai,
        "escalatedToHuman": escalated,
        "resolutionRate": round(resolved_by_ai / total_conversations * 100, 1) if total_conversations > 0 else 0,
        "escalationRate": round(escalated / total_conversations * 100, 1) if total_conversations > 0 else 0,
    }


# ============================================================================
# AI CONVERSATIONS
# ============================================================================


async def list_ai_conversations(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/whatsapp/ai-conversations — list AI conversations."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    offset = (page - 1) * page_size

    total = await count_records(AI_LOG_TABLE, tenant_id=tenant_id)
    result = await query_table(
        AI_LOG_TABLE,
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


async def get_ai_conversation(conversation_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/whatsapp/ai-conversations/{id} — get AI conversation detail."""
    result = await query_table(
        AI_LOG_TABLE,
        where={"id": conversation_id},
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="AiConversationLog")
    return items[0]
