from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role, require_permission
from app.api.dependencies import get_optional_user
from app.features.email import service
from app.features.email.schemas import (
    EmailCampaignCreate,
    EmailCampaignUpdate,
    EmailCompose,
    EmailConfigSet,
    EmailQueueSend,
    EmailSend,
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailTrackingEvent,
)

router = APIRouter(tags=["email"])


# ============================================================================
# CONFIG
# ============================================================================


@router.get("/config")
async def get_config(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/email/config — return email config status."""
    return await service.get_config(user.tenantId, user)


@router.post("/config")
async def set_config(
    body: EmailConfigSet,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """POST /api/v1/email/config — set email API key."""
    return await service.set_config(user.tenantId, user, body.model_dump())


# ============================================================================
# HEALTH
# ============================================================================


@router.get("/health")
async def get_health(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/email/health — email service health check."""
    return await service.get_health(user.tenantId, user)


# ============================================================================
# STATS
# ============================================================================


@router.get("/stats")
async def get_stats(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/email/stats — email statistics."""
    return await service.get_stats(user.tenantId, user)


# ============================================================================
# SEND
# ============================================================================


@router.post("/send")
async def send_email(
    body: EmailSend,
    user: AuthUser = Depends(require_permission("email_module.send")),
):
    """POST /api/v1/email/send — send an email directly."""
    return await service.send_email(user.tenantId, user, body.model_dump())


@router.post("/compose")
async def compose_email(
    body: EmailCompose,
    user: AuthUser = Depends(require_permission("email_module.send")),
):
    """POST /api/v1/email/compose — compose and send an email."""
    return await service.compose_email(user.tenantId, user, body.model_dump())


# ============================================================================
# QUEUE
# ============================================================================


@router.get("/queue")
async def list_queue(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    status: str = Query(default=""),
):
    """GET /api/v1/email/queue — list email queue."""
    return await service.list_queue(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "status": status,
    })


@router.post("/queue")
async def add_to_queue(
    body: EmailQueueSend,
    user: AuthUser = Depends(require_permission("email_module.send")),
):
    """POST /api/v1/email/queue — add email to queue."""
    return await service.add_to_queue(user.tenantId, user, body.model_dump())


# ============================================================================
# LOGS
# ============================================================================


@router.get("/logs")
async def list_logs(
    user: AuthUser = Depends(require_permission("email_module.view_logs")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/email/logs — list email logs."""
    return await service.list_logs(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


# ============================================================================
# TEMPLATES
# ============================================================================


@router.get("/templates")
async def list_templates(
    user: AuthUser = Depends(require_permission("email_module.manage_templates")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    category: str = Query(default=""),
):
    """GET /api/v1/email/templates — list email templates."""
    return await service.list_templates(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "category": category,
    })


# ============================================================================
# TRACKING
# ============================================================================


@router.post("/tracking")
async def record_tracking(
    body: EmailTrackingEvent,
    user: AuthUser | None = Depends(get_optional_user),
):
    """POST /api/v1/email/tracking — record email tracking event."""
    tenant_id = user.tenantId if user else ""
    return await service.record_tracking_event(tenant_id, body.model_dump())


# ============================================================================
# CAMPAIGNS
# ============================================================================


@router.get("/campaigns")
async def list_campaigns(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    status: str = Query(default=""),
):
    """GET /api/v1/email/campaigns — list email campaigns."""
    return await service.list_campaigns(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "status": status,
    })


@router.post("/campaigns")
async def create_campaign(
    body: EmailCampaignCreate,
    user: AuthUser = Depends(require_permission("email_module.manage_campaigns")),
):
    """POST /api/v1/email/campaigns — create an email campaign."""
    return await service.create_campaign(user.tenantId, user, body.model_dump())


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """GET /api/v1/email/campaigns/{id} — get campaign detail."""
    return await service.get_campaign(campaign_id, user.tenantId, user)


@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    body: EmailCampaignUpdate,
    user: AuthUser = Depends(require_permission("email_module.manage_campaigns")),
):
    """PUT /api/v1/email/campaigns/{id} — update campaign."""
    return await service.update_campaign(campaign_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/email/campaigns/{id} — delete campaign."""
    return await service.delete_campaign(campaign_id, user.tenantId, user)


# ============================================================================
# CUSTOMER SEARCH
# ============================================================================


@router.get("/customers/search")
async def search_customers(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
    search: str = Query(default=""),
):
    """GET /api/v1/email/customers/search — search customers for email."""
    return await service.search_customers(user.tenantId, user, {"search": search})


@router.get("/customer-history")
async def get_customer_history(
    user: AuthUser = Depends(require_role("super_admin", "admin")),
    customerId: str = Query(..., min_length=1),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
):
    """GET /api/v1/email/customer-history — get customer email history."""
    return await service.get_customer_history(customerId, user.tenantId, user, {
        "page": page, "pageSize": pageSize,
    })