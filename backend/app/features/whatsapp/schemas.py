from typing import Any

from pydantic import BaseModel, Field


# -- WhatsApp Config Schemas -----------------------------------------------


class WhatsAppConfigUpdate(BaseModel):
    provider: str | None = Field(default=None)
    isEnabled: bool | None = Field(default=None)
    phoneNumber: str | None = Field(default=None)
    businessName: str | None = Field(default=None)
    openwaBaseUrl: str | None = Field(default=None)
    openwaSession: str | None = Field(default=None)
    openwaApiKey: str | None = Field(default=None)
    openwaQrCode: str | None = Field(default=None)
    openwaStatus: str | None = Field(default=None)
    metaAccessToken: str | None = Field(default=None)
    metaPhoneNumberId: str | None = Field(default=None)
    metaVerifyToken: str | None = Field(default=None)
    metaWebhookSecret: str | None = Field(default=None)
    metaBusinessAccountId: str | None = Field(default=None)
    twilioAccountSid: str | None = Field(default=None)
    twilioAuthToken: str | None = Field(default=None)
    twilioPhoneNumber: str | None = Field(default=None)
    autoReplyEnabled: bool | None = Field(default=None)
    welcomeMessage: str | None = Field(default=None)
    emergencyNumbers: list[str] | None = Field(default=None)
    defaultPriority: str | None = Field(default=None)


# -- WhatsApp Session Schemas -----------------------------------------------


class WhatsAppSessionUpdate(BaseModel):
    state: str | None = Field(default=None)
    isActive: bool | None = Field(default=None)
    isBlocked: bool | None = Field(default=None)


# -- WhatsApp Message Schemas -----------------------------------------------


class WhatsAppMessageSend(BaseModel):
    sessionId: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    messageType: str = Field(default="text")


# -- WhatsApp Thread Schemas -----------------------------------------------


class WhatsAppThreadCreate(BaseModel):
    sessionId: str = Field(..., min_length=1)
    subject: str | None = Field(default=None)
    status: str = Field(default="active")


class WhatsAppThreadUpdate(BaseModel):
    subject: str | None = Field(default=None)
    status: str | None = Field(default=None)
    assignedToId: str | None = Field(default=None)
    priority: str | None = Field(default=None)


# -- WhatsApp Template Schemas ----------------------------------------------


class WhatsAppTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(default="utility")
    language: str = Field(default="en")
    body: str = Field(..., min_length=1)
    variables: list[dict[str, Any]] | None = Field(default=None)
    header: str | None = Field(default=None)
    footer: str | None = Field(default=None)
    buttons: list[dict[str, Any]] | None = Field(default=None)
    status: str = Field(default="draft")


class WhatsAppTemplateUpdate(BaseModel):
    name: str | None = Field(default=None)
    category: str | None = Field(default=None)
    language: str | None = Field(default=None)
    body: str | None = Field(default=None)
    variables: list[dict[str, Any]] | None = Field(default=None)
    header: str | None = Field(default=None)
    footer: str | None = Field(default=None)
    buttons: list[dict[str, Any]] | None = Field(default=None)
    status: str | None = Field(default=None)


# -- WhatsApp Campaign Schemas ----------------------------------------------


class WhatsAppCampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    templateId: str | None = Field(default=None)
    recipientType: str = Field(default="all_customers")
    recipientIds: list[str] | None = Field(default=None)
    message: str | None = Field(default=None)
    scheduledAt: str | None = Field(default=None)
    status: str = Field(default="draft")


class WhatsAppCampaignUpdate(BaseModel):
    name: str | None = Field(default=None)
    templateId: str | None = Field(default=None)
    recipientType: str | None = Field(default=None)
    recipientIds: list[str] | None = Field(default=None)
    message: str | None = Field(default=None)
    scheduledAt: str | None = Field(default=None)
    status: str | None = Field(default=None)


# -- WhatsApp Webhook Schemas -----------------------------------------------


class WhatsAppWebhookConfig(BaseModel):
    webhookUrl: str | None = Field(default=None)
    webhookSecret: str | None = Field(default=None)
    isEnabled: bool | None = Field(default=None)


# -- WhatsApp Report Schemas -----------------------------------------------


class WhatsAppReportConfig(BaseModel):
    dateFrom: str | None = Field(default=None)
    dateTo: str | None = Field(default=None)


# -- WhatsApp AI Schemas ----------------------------------------------------


class WhatsAppAISettingsUpdate(BaseModel):
    isEnabled: bool | None = Field(default=None)
    provider: str | None = Field(default=None)
    model: str | None = Field(default=None)
    systemPrompt: str | None = Field(default=None)
    maxTokens: int | None = Field(default=None)
    temperature: float | None = Field(default=None)
    autoReplyEnabled: bool | None = Field(default=None)
    handoffTimeout: int | None = Field(default=None)
    allowedIntents: list[str] | None = Field(default=None)
