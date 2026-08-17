from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    """Schema for creating a notification."""
    title: str = Field(..., min_length=1, max_length=500)
    message: str = Field(..., min_length=1, max_length=5000)
    userId: str | None = Field(default=None)
    role: str | None = Field(default=None, description="Target role (alternative to userId)")
    data: dict[str, Any] | None = Field(default=None)
    priority: str = Field(default="normal")
    type: str | None = Field(default=None)
    category: str | None = Field(default=None)
    relatedEntityType: str | None = Field(default=None)
    relatedEntityId: str | None = Field(default=None)
    actionUrl: str | None = Field(default=None)
    actionLabel: str | None = Field(default=None)
    sendPush: bool = Field(default=True)


class NotificationUpdate(BaseModel):
    """Schema for updating a notification."""
    isRead: bool | None = Field(default=None)
    isArchived: bool | None = Field(default=None)


class DeviceTokenRegister(BaseModel):
    """Schema for registering a device token."""
    token: str = Field(..., min_length=1)
    platform: str = Field(..., min_length=1, description="ios, android, or web")
    browser: str | None = Field(default=None)
    os: str | None = Field(default=None)
    deviceName: str | None = Field(default=None)
    userAgent: str | None = Field(default=None)


class DeviceTokenUnregister(BaseModel):
    """Schema for unregistering a device token."""
    token: str = Field(..., min_length=1)


class TestNotificationRequest(BaseModel):
    """Schema for sending a test notification."""
    userId: str | None = Field(default=None, description="Target user ID (defaults to self)")
    message: str | None = Field(default="Real-time notification is working correctly.")
