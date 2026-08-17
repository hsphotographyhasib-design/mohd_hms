"""
Department schemas.

MOHD.HMS ENTERPRISE

Matches the frontend API contract from:
  - /api/departments/route.ts (simple list: { data: [...] })
  - /api/hr/departments/route.ts (full list with employee counts: { data: [...], users: [...] })
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class DepartmentCreateRequest(BaseModel):
    """Request body for creating a department.

    Matches: POST /api/hr/departments
    """

    name: str = Field(..., description="Department name (required)")
    description: str | None = Field(default="", description="Department description")
    headId: str | None = Field(default=None, description="Department head user ID")
    isActive: bool = Field(default=True)


class DepartmentUpdateRequest(BaseModel):
    """Request body for updating a department.

    Matches: PUT /api/departments/{id}
    """

    name: str | None = None
    description: str | None = None
    headId: str | None = None
    isActive: bool | None = None
