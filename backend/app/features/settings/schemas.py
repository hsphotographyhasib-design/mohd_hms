from typing import Any

from pydantic import BaseModel, Field


class SystemInfoResponse(BaseModel):
    """Response schema for system info endpoint."""
    appVersion: str
    environment: str
    featureFlags: dict[str, bool] = Field(default_factory=dict)
