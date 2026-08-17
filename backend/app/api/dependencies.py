"""
FastAPI dependency injection functions.

MOHD.HMS ENTERPRISE

All dependencies are importable and composable. Example usage::

    @router.get("/complaints")
    async def list_complaints(
        user: AuthUser = Depends(get_current_user),
        db: httpx.AsyncClient = Depends(get_db),
    ): ...
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx
import logging

from fastapi import Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.database import get_supabase_client
from app.core.exceptions import ForbiddenException, UnauthorizedException, ValidationException
from app.core.logging import get_logger
from app.core.security import verify_jwt_token
from app.rbac.permissions import (
    has_action_permission,
    has_feature_access,
    has_min_role_level,
    ROLE_HIERARCHY,
)

log = get_logger(__name__)

# ── Bearer token scheme ────────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(slots=True)
class AuthUser:
    """Authenticated user extracted from the JWT token.

    Attributes match the JWT payload shape used across the platform.
    """
    userId: str
    tenantId: str
    role: str
    email: str | None = None
    name: str | None = None


@lru_cache(maxsize=1)
def _get_settings_cached() -> Settings:
    return get_settings()


# ── Settings dependency ───────────────────────────────────────────────────────


async def dep_get_settings() -> Settings:
    """Inject application settings."""
    return _get_settings_cached()


# ── Database dependency ───────────────────────────────────────────────────────


async def get_db() -> httpx.AsyncClient:
    """Inject the Supabase PostgREST httpx.AsyncClient."""
    return get_supabase_client()


# ── Request ID dependency ─────────────────────────────────────────────────────


async def get_request_id(request: Request) -> str:
    """Extract the X-Request-ID from the request state."""
    return getattr(request.state, "request_id", "-")


# ── Logger dependency ─────────────────────────────────────────────────────────


async def get_logger_dep(request: Request) -> logging.Logger:
    """Inject a request-scoped logger.

    The returned logger has the request_id injected into the
    LogRecord, so all messages from this request are correlated.
    """
    import logging as _logging
    logger = _logging.getLogger(f"app.api.{request.url.path}")
    return logger


# ── Auth dependency ───────────────────────────────────────────────────────────


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    settings: Settings = Depends(dep_get_settings),
) -> AuthUser:
    """Extract and verify the JWT Bearer token.

    Raises UnauthorizedException if the token is missing, invalid, or expired.
    The resulting AuthUser is available in route handlers.

    Also stores the AuthUser on ``request.state.auth_user`` for middleware access.
    """
    if not credentials:
        raise UnauthorizedException(code="AUTH_REQUIRED", message="Authorization header with Bearer token is required")

    try:
        payload = verify_jwt_token(credentials.credentials, settings.jwt_secret)
    except UnauthorizedException:
        raise
    except Exception as exc:
        raise UnauthorizedException(code="AUTH_INVALID", message=f"Token verification failed: {exc}")

    auth_user = AuthUser(
        userId=payload.userId,
        tenantId=payload.tenantId,
        role=payload.role,
        email=payload.email,
        name=payload.raw.get("name"),
    )

    # Store on request state for downstream use
    request.state.auth_user = auth_user

    return auth_user


# ── Optional auth (returns None if no token) ──────────────────────────────────


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    settings: Settings = Depends(dep_get_settings),
) -> AuthUser | None:
    """Like get_current_user but returns None instead of raising 401.

    Useful for endpoints that work for both authenticated and anonymous users.
    """
    if not credentials:
        return None
    try:
        payload = verify_jwt_token(credentials.credentials, settings.jwt_secret)
        auth_user = AuthUser(
            userId=payload.userId,
            tenantId=payload.tenantId,
            role=payload.role,
            email=payload.email,
            name=payload.raw.get("name"),
        )
        request.state.auth_user = auth_user
        return auth_user
    except Exception:
        return None


# ── RBAC dependency factories ─────────────────────────────────────────────────


def require_role(*roles: str):
    """Dependency factory: require the user to have one of the given roles.

    Usage::

        @router.delete("/complaints/{id}")
        async def delete_complaint(
            user: AuthUser = Depends(require_role("super_admin", "admin")),
        ): ...
    """
    async def checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        normalized = [r.strip().lower() for r in roles]
        if user.role not in normalized:
            raise ForbiddenException(
                message=f"Role '{user.role}' is not authorized. Required: {', '.join(roles)}",
                details={"required_roles": roles, "user_role": user.role},
            )
        return user
    return checker


def require_min_role(role: str):
    """Dependency factory: require the user to have at least the given role level.

    Uses the role hierarchy (super_admin=100 > admin=90 > ... > guest=0).

    Usage::

        @router.get("/reports")
        async def get_reports(
            user: AuthUser = Depends(require_min_role("manager")),
        ): ...
    """
    async def checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if not has_min_role_level(user.role, role):
            raise ForbiddenException(
                message=f"Role '{user.role}' does not meet minimum level '{role}'",
                details={"required_min_role": role, "user_role": user.role, "user_level": ROLE_HIERARCHY.get(user.role), "required_level": ROLE_HIERARCHY.get(role)},
            )
        return user
    return checker


def require_permission(permission: str):
    """Dependency factory: require a specific feature or action permission.

    Args:
        permission: Either a feature name ("complaints") or
                    an entity.action string ("complaint.create").

    Usage::

        @router.post("/complaints")
        async def create_complaint(
            user: AuthUser = Depends(require_permission("complaint.create")),
        ): ...
    """
    async def checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if "." in permission:
            entity, action = permission.split(".", 1)
            if not has_action_permission(user.role, entity, action):
                raise ForbiddenException(
                    message=f"No permission for {permission}",
                    details={"permission": permission, "user_role": user.role},
                )
        else:
            if not has_feature_access(user.role, permission):
                raise ForbiddenException(
                    message=f"No access to feature '{permission}'",
                    details={"feature": permission, "user_role": user.role},
                )
        return user
    return checker
