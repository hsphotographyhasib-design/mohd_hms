from typing import Any

from pydantic import BaseModel, Field


# -- Email Config Schemas -------------------------------------------------


class EmailConfigSet(BaseModel):
    apiKey: str = Field(..., min_length=1, description="Brevo API key (starts with xkeysib-)")
    provider: str | None = Field(default="brevo")
    senderEmail: str | None = Field(default=None)
    senderName: str | None = Field(default=None)


# -- Email Send Schemas ----------------------------------------------------


class EmailSend(BaseModel):
    to: str | list[str] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    html: str | None = Field(default=None)
    cc: list[str] | None = Field(default=None)
    bcc: list[str] | None = Field(default=None)
    replyTo: str | None = Field(default=None)
    attachments: list[dict[str, Any]] | None = Field(default=None)
    referenceType: str | None = Field(default=None)
    referenceId: str | None = Field(default=None)


class EmailCompose(BaseModel):
    to: list[str] = Field(..., min_length=1)
    cc: list[str] | None = Field(default=None)
    bcc: list[str] | None = Field(default=None)
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    html: str | None = Field(default=None)
    templateId: str | None = Field(default=None)
    templateData: dict[str, Any] | None = Field(default=None)
    attachments: list[dict[str, Any]] | None = Field(default=None)
    scheduledAt: str | None = Field(default=None)
    priority: str = Field(default="normal")


# -- Email Queue Schemas ---------------------------------------------------


class EmailQueueSend(BaseModel):
    to: list[str] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    html: str | None = Field(default=None)
    cc: list[str] | None = Field(default=None)
    bcc: list[str] | None = Field(default=None)
    templateId: str | None = Field(default=None)
    templateData: dict[str, Any] | None = Field(default=None)
    attachments: list[dict[str, Any]] | None = Field(default=None)
    scheduledAt: str | None = Field(default=None)
    priority: str = Field(default="normal")


# -- Email Template Schemas ------------------------------------------------


class EmailTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    html: str | None = Field(default=None)
    category: str | None = Field(default=None)
    variables: list[dict[str, Any]] | None = Field(default=None)
    isSystem: bool = Field(default=False)
    description: str | None = Field(default=None)


class EmailTemplateUpdate(BaseModel):
    name: str | None = Field(default=None)
    subject: str | None = Field(default=None)
    body: str | None = Field(default=None)
    html: str | None = Field(default=None)
    category: str | None = Field(default=None)
    variables: list[dict[str, Any]] | None = Field(default=None)
    isSystem: bool | None = Field(default=None)
    description: str | None = Field(default=None)


# -- Email Campaign Schemas ------------------------------------------------


class EmailCampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    templateId: str | None = Field(default=None)
    subject: str | None = Field(default=None)
    body: str | None = Field(default=None)
    html: str | None = Field(default=None)
    recipientType: str = Field(default="all_customers")
    recipientIds: list[str] | None = Field(default=None)
    scheduledAt: str | None = Field(default=None)
    status: str = Field(default="draft")


class EmailCampaignUpdate(BaseModel):
    name: str | None = Field(default=None)
    templateId: str | None = Field(default=None)
    subject: str | None = Field(default=None)
    body: str | None = Field(default=None)
    html: str | None = Field(default=None)
    recipientType: str | None = Field(default=None)
    recipientIds: list[str] | None = Field(default=None)
    scheduledAt: str | None = Field(default=None)
    status: str | None = Field(default=None)


# -- Email Tracking Schemas ------------------------------------------------


class EmailTrackingEvent(BaseModel):
    messageId: str = Field(..., min_length=1)
    event: str = Field(..., min_length=1)
    timestamp: str | None = Field(default=None)
    metadata: dict[str, Any] | None = Field(default=None)
