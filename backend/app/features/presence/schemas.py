from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class PresenceState(StrEnum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    AWAY = "AWAY"


class PresenceUpdate(BaseModel):
    state: PresenceState = Field(..., description="ONLINE, OFFLINE, or AWAY")
    deviceInfo: dict[str, Any] | None = Field(default=None, description="Device metadata (browser, OS, etc.)")


class PresenceResponse(BaseModel):
    userId: str
    state: str
    lastSeen: str | None = None
    deviceInfo: dict[str, Any] | None = None


class OnlineUserResponse(BaseModel):
    userId: str
    state: str
    lastSeen: str | None = None
    deviceInfo: dict[str, Any] | None = None
    name: str | None = None
    role: str | None = None
    department: str | None = None
