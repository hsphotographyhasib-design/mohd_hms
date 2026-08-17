from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_permission, require_role
from app.features.whatsapp import service
from app.features.whatsapp.schemas import (
    WhatsAppAISettingsUpdate,
    WhatsAppCampaignCreate,
    WhatsAppCampaignUpdate,
    WhatsAppConfigUpdate,
    WhatsAppMessageSend,
    WhatsAppSessionUpdate,
    WhatsAppTemplateCreate,
    WhatsAppTemplateUpdate,
    WhatsAppThreadCreate,
    WhatsAppThreadUpdate,
)

router = APIRouter(tags=["whatsapp"])


# ============================================================================
# INFO / DASHBOARD
# ============================================================================


@router.get("")
async def get_whatsapp_info(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/whatsapp — WhatsApp dashboard stats."""
    return await service.get_whatsapp_info(user.tenantId, user)


# ============================================================================
# CONFIG
# ============================================================================


@router.get("/config")
async def get_config(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/whatsapp/config — get WhatsApp config."""
    return await service.get_config(user.tenantId, user)


@router.put("/config")
async def update_config(
    body: WhatsAppConfigUpdate,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """PUT /api/v1/whatsapp/config — update WhatsApp config."""
    return await service.update_config(user.tenantId, user, body.model_dump(exclude_none=True))


# ============================================================================
# CONNECTION
# ============================================================================


@router.get("/connection")
async def get_connection(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/whatsapp/connection — connection status."""
    return await service.get_connection_status(user.tenantId, user)


@router.post("/connection")
async def connect(
    body: dict[str, Any] = {},
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """POST /api/v1/whatsapp/connection — initiate connection."""
    return await service.connect_whatsapp(user.tenantId, user, body)


# ============================================================================
# SEND MESSAGE
# ============================================================================


@router.post("/send")
async def send_message(
    body: WhatsAppMessageSend,
    user: AuthUser = Depends(require_permission("whatsapp_module.send")),
):
    """POST /api/v1/whatsapp/send — send a message."""
    return await service.send_message(user.tenantId, user, body.model_dump())


# ============================================================================
# SESSIONS
# ============================================================================


@router.get("/sessions")
async def list_sessions(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
    state: str = Query(default=""),
):
    """GET /api/v1/whatsapp/sessions — list WhatsApp sessions."""
    return await service.list_sessions(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search,
        "status": status, "state": state,
    })


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/whatsapp/sessions/{id} — get session detail."""
    return await service.get_session(session_id, user.tenantId, user)


@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    body: WhatsAppSessionUpdate,
    user: AuthUser = Depends(require_permission("whatsapp_module.view")),
):
    """PUT /api/v1/whatsapp/sessions/{id} — update session."""
    return await service.update_session(session_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/whatsapp/sessions/{id} — delete session."""
    return await service.delete_session(session_id, user.tenantId, user)


# ============================================================================
# SESSION MESSAGES
# ============================================================================


@router.get("/sessions/{session_id}/messages")
async def list_session_messages(
    session_id: str,
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=50, ge=1, le=100),
):
    """GET /api/v1/whatsapp/sessions/{id}/messages — list messages in a session."""
    return await service.list_session_messages(session_id, user.tenantId, user, {
        "page": page, "pageSize": pageSize,
    })


@router.post("/sessions/{session_id}/messages")
async def create_session_message(
    session_id: str,
    body: WhatsAppMessageSend,
    user: AuthUser = Depends(require_permission("whatsapp_module.send")),
):
    """POST /api/v1/whatsapp/sessions/{id}/messages — send message in session."""
    return await service.create_session_message(session_id, user.tenantId, user, body.model_dump())


# ============================================================================
# THREADS
# ============================================================================


@router.get("/threads")
async def list_threads(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/whatsapp/threads — list conversation threads."""
    return await service.list_threads(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/threads")
async def create_thread(
    body: WhatsAppThreadCreate,
    user: AuthUser = Depends(require_permission("whatsapp_module.view")),
):
    """POST /api/v1/whatsapp/threads — create a thread."""
    return await service.create_thread(user.tenantId, user, body.model_dump())


@router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/whatsapp/threads/{id} — get thread detail."""
    return await service.get_thread(thread_id, user.tenantId, user)


@router.put("/threads/{thread_id}")
async def update_thread(
    thread_id: str,
    body: WhatsAppThreadUpdate,
    user: AuthUser = Depends(require_permission("whatsapp_module.view")),
):
    """PUT /api/v1/whatsapp/threads/{id} — update thread."""
    return await service.update_thread(thread_id, user.tenantId, user, body.model_dump(exclude_none=True))


# ============================================================================
# TEMPLATES
# ============================================================================


@router.get("/templates")
async def list_templates(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/whatsapp/templates — list templates."""
    return await service.list_templates(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/templates")
async def create_template(
    body: WhatsAppTemplateCreate,
    user: AuthUser = Depends(require_permission("whatsapp_module.manage_templates")),
):
    """POST /api/v1/whatsapp/templates — create a template."""
    return await service.create_template(user.tenantId, user, body.model_dump())


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/whatsapp/templates/{id} — get template detail."""
    return await service.get_template(template_id, user.tenantId, user)


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    body: WhatsAppTemplateUpdate,
    user: AuthUser = Depends(require_permission("whatsapp_module.manage_templates")),
):
    """PUT /api/v1/whatsapp/templates/{id} — update template."""
    return await service.update_template(template_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/whatsapp/templates/{id} — delete template."""
    return await service.delete_template(template_id, user.tenantId, user)


# ============================================================================
# CAMPAIGNS
# ============================================================================


@router.get("/campaigns")
async def list_campaigns(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    status: str = Query(default=""),
):
    """GET /api/v1/whatsapp/campaigns — list campaigns."""
    return await service.list_campaigns(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "status": status,
    })


@router.post("/campaigns")
async def create_campaign(
    body: WhatsAppCampaignCreate,
    user: AuthUser = Depends(require_permission("whatsapp_module.manage_campaigns")),
):
    """POST /api/v1/whatsapp/campaigns — create a campaign."""
    return await service.create_campaign(user.tenantId, user, body.model_dump())


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/whatsapp/campaigns/{id} — get campaign detail."""
    return await service.get_campaign(campaign_id, user.tenantId, user)


@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    body: WhatsAppCampaignUpdate,
    user: AuthUser = Depends(require_permission("whatsapp_module.manage_campaigns")),
):
    """PUT /api/v1/whatsapp/campaigns/{id} — update campaign."""
    return await service.update_campaign(campaign_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/whatsapp/campaigns/{id} — delete campaign."""
    return await service.delete_campaign(campaign_id, user.tenantId, user)


# ============================================================================
# WEBHOOK
# ============================================================================


@router.get("/webhook")
async def get_webhook(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/whatsapp/webhook — get webhook config."""
    return await service.get_webhook_config(user.tenantId, user)


@router.post("/webhook")
async def update_webhook(
    body: dict[str, Any] = {},
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """POST /api/v1/whatsapp/webhook — update webhook config."""
    return await service.update_webhook_config(user.tenantId, user, body)


# ============================================================================
# REPORTS
# ============================================================================


@router.get("/reports")
async def get_reports(
    user: AuthUser = Depends(get_current_user),
    dateFrom: str | None = Query(default=None),
    dateTo: str | None = Query(default=None),
):
    """GET /api/v1/whatsapp/reports — WhatsApp reports."""
    return await service.get_reports(user.tenantId, user, {
        "dateFrom": dateFrom, "dateTo": dateTo,
    })


# ============================================================================
# FEEDBACK
# ============================================================================


@router.get("/feedback")
async def get_feedback(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
):
    """GET /api/v1/whatsapp/feedback — WhatsApp feedback."""
    return await service.get_feedback(user.tenantId, user, {
        "page": page, "pageSize": pageSize,
    })


# ============================================================================
# AI SETTINGS
# ============================================================================


@router.get("/ai-settings")
async def get_ai_settings(
    user: AuthUser = Depends(require_permission("whatsapp_module.manage_ai")),
):
    """GET /api/v1/whatsapp/ai-settings — get AI settings."""
    return await service.get_ai_settings(user.tenantId, user)


@router.patch("/ai-settings")
async def update_ai_settings(
    body: WhatsAppAISettingsUpdate,
    user: AuthUser = Depends(require_permission("whatsapp_module.manage_ai")),
):
    """PATCH /api/v1/whatsapp/ai-settings — update AI settings."""
    return await service.update_ai_settings(user.tenantId, user, body.model_dump(exclude_none=True))


# ============================================================================
# AI DASHBOARD
# ============================================================================


@router.get("/ai-dashboard")
async def get_ai_dashboard(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/whatsapp/ai-dashboard — AI dashboard stats."""
    return await service.get_ai_dashboard(user.tenantId, user)


# ============================================================================
# AI CONVERSATIONS
# ============================================================================


@router.get("/ai-conversations")
async def list_ai_conversations(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
):
    """GET /api/v1/whatsapp/ai-conversations — list AI conversations."""
    return await service.list_ai_conversations(user.tenantId, user, {
        "page": page, "pageSize": pageSize,
    })


@router.get("/ai-conversations/{conversation_id}")
async def get_ai_conversation(
    conversation_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/whatsapp/ai-conversations/{id} — get AI conversation detail."""
    return await service.get_ai_conversation(conversation_id, user.tenantId, user)
