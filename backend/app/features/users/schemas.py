"""
User management schemas.

MOHD.HMS ENTERPRISE

Matches the frontend API contract from:
  - /api/admin/users/route.ts (list, update)
  - /api/admin/users/[id]/role/route.ts (role change)

Response formats:
  - List: { data: [...], total, page, pageSize, totalPages }
  - Detail: { id, email, name, ... }
  - Role change: { success, user, previousRole, newRole, sessionsRevoked, changedBy, message }
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class UserListParams(BaseModel):
    """Query parameters for listing users."""

    search: str = Field(default="", description="Search by name or email")
    role: str = Field(default="", description="Filter by role")
    department: str = Field(default="", description="Filter by department ID")
    isActive: str = Field(default="", description="Filter by active status (true/false)")
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=20, ge=1, le=100)


class UserResponse(BaseModel):
    """User response matching the frontend shape."""

    id: str
    email: str | None = None
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    googleId: str | None = None
    role: str
    employeeNumber: str | None = None
    isActive: bool = True
    isOnline: bool = False
    lastLogin: str | None = None
    profileCompleted: bool = False
    createdAt: str | None = None
    department: dict | None = None  # { id, name } or null


class UserUpdateRequest(BaseModel):
    """Request body for updating a user (admin PATCH /api/admin/users)."""

    userId: str
    role: str | None = None
    isActive: bool | None = None
    name: str | None = None
    phone: str | None = None


class RoleChangeRequest(BaseModel):
    """Request body for changing a user's role.

    Matches /api/admin/users/[id]/role PATCH body.
    """

    role: str = Field(..., description="New role to assign")
    reason: str | None = Field(default=None, description="Optional reason for role change")
