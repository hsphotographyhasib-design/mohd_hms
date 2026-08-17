"""Shared Pydantic models for integration services.

MOHD.HMS ENTERPRISE

These schemas are used across multiple integration modules
(notification, email, WhatsApp) for type-safe request/response handling.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class NotificationChannel(StrEnum):
    """Delivery channel for a notification."""
    PUSH = "push"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    IN_APP = "in_app"


class NotificationPriority(StrEnum):
    """Priority level for notifications."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class NotificationCreate(BaseModel):
    """Schema for creating a notification record."""

    user_id: str = Field(..., alias="userId", description="Target user ID")
    tenant_id: str = Field(..., alias="tenantId", description="Tenant ID")
    title: str = Field(..., min_length=1, max_length=255, description="Notification title")
    message: str = Field(..., min_length=1, max_length=2000, description="Notification body")
    channel: NotificationChannel = Field(default=NotificationChannel.IN_APP, description="Delivery channel")
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="Priority")
    data: dict[str, Any] = Field(default_factory=dict, description="Arbitrary payload data")
    entity_type: str | None = Field(default=None, alias="entityType", description="Related entity type")
    entity_id: str | None = Field(default=None, alias="entityId", description="Related entity ID")
    link: str | None = Field(default=None, description="Deep link for in-app navigation")

    model_config = {"populate_by_name": True}


class DeviceTokenRegister(BaseModel):
    """Schema for registering a device token for push notifications."""

    user_id: str = Field(..., alias="userId", description="User ID")
    token: str = Field(..., min_length=1, description="FCM device token")
    platform: str = Field(..., description="Platform: ios, android, web")
    app_version: str | None = Field(default=None, alias="appVersion", description="App version string")
    device_name: str | None = Field(default=None, alias="deviceName", description="Device name")

    model_config = {"populate_by_name": True}


class EmailSendRequest(BaseModel):
    """Schema for sending an email."""

    to: str | list[str] = Field(..., description="Recipient(s)")
    subject: str = Field(..., min_length=1, max_length=500, description="Email subject")
    body: str | None = Field(default=None, description="Plain text body")
    html: str | None = Field(default=None, description="HTML body")
    cc: str | list[str] | None = Field(default=None, description="CC recipient(s)")
    bcc: str | list[str] | None = Field(default=None, description="BCC recipient(s)")
    reply_to: str | None = Field(default=None, alias="replyTo", description="Reply-to address")
    tenant_id: str | None = Field(default=None, alias="tenantId", description="Tenant ID for logging")
    user_id: str | None = Field(default=None, alias="userId", description="Sender user ID for logging")

    model_config = {"populate_by_name": True}


class WhatsAppMessageRequest(BaseModel):
    """Schema for sending a WhatsApp message."""

    to_number: str = Field(..., alias="toNumber", description="Recipient phone number")
    message: str | None = Field(default=None, description="Plain text message")
    template_name: str | None = Field(default=None, alias="templateName", description="Template name")
    variables: dict[str, str] | None = Field(default=None, description="Template variables")
    media_url: str | None = Field(default=None, alias="mediaUrl", description="Media URL for media messages")
    caption: str | None = Field(default=None, description="Media caption")
    tenant_id: str | None = Field(default=None, alias="tenantId", description="Tenant ID for logging")
    user_id: str | None = Field(default=None, alias="userId", description="Sender user ID for logging")
    entity_type: str | None = Field(default=None, alias="entityType", description="Related entity type")
    entity_id: str | None = Field(default=None, alias="entityId", description="Related entity ID")

    model_config = {"populate_by_name": True}


class SendTemplateEmailRequest(BaseModel):
    """Schema for sending a template-based email."""

    template_id: str = Field(..., alias="templateId", description="EmailTemplate record ID")
    to: str | list[str] = Field(..., description="Recipient(s)")
    variables: dict[str, Any] = Field(default_factory=dict, description="Template variable substitutions")
    cc: str | list[str] | None = Field(default=None, description="CC recipient(s)")
    bcc: str | list[str] | None = Field(default=None, description="BCC recipient(s)")
    tenant_id: str | None = Field(default=None, alias="tenantId", description="Tenant ID for logging")
    user_id: str | None = Field(default=None, alias="userId", description="Sender user ID for logging")

    model_config = {"populate_by_name": True}
