from typing import Any

from pydantic import BaseModel, Field


# -- Document Update Schemas ------------------------------------------------


class DocumentUpdate(BaseModel):
    originalName: str | None = Field(default=None)
    fileName: str | None = Field(default=None)
    folder: str | None = Field(default=None)
    tags: list[str] | None = Field(default=None)
    description: str | None = Field(default=None)
    isArchived: bool | None = Field(default=None)
    isActive: bool | None = Field(default=None)


class DocumentVersionCreate(BaseModel):
    file: str = Field(..., description="Base64-encoded file content or storage path")
    fileName: str = Field(..., min_length=1)
    mimeType: str | None = Field(default=None)
    size: int | None = Field(default=None)
    changelog: str | None = Field(default=None)
