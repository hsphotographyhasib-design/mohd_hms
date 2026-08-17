from typing import Any

from pydantic import BaseModel, Field


# -- Session Create Schemas ------------------------------------------------


class SessionCreate(BaseModel):
    deviceName: str | None = Field(default=None)
    deviceType: str | None = Field(default=None)
    browser: str | None = Field(default=None)
    os: str | None = Field(default=None)
    ipAddress: str | None = Field(default=None)
    userAgent: str | None = Field(default=None)
    authProvider: str = Field(default="email")
    rememberMe: bool = Field(default=False)


class SessionActivity(BaseModel):
    sessionId: str | None = Field(default=None)
    action: str = Field(..., min_length=1)
    page: str | None = Field(default=None)
    metadata: dict[str, Any] | None = Field(default=None)


class SessionSettings(BaseModel):
    maxConcurrentSessions: int | None = Field(default=None, ge=0)
    sessionTimeoutMinutes: int | None = Field(default=None, ge=1)
    idleTimeoutMinutes: int | None = Field(default=None, ge=1)
    rememberMeDays: int | None = Field(default=None, ge=1)
    enforceIpBinding: bool | None = Field(default=None)


class RevokeOthersRequest(BaseModel):
    keepSessionId: str | None = Field(default=None)
    reason: str | None = Field(default=None)