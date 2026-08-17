"""
Centralized exception hierarchy and error response models.

MOHD.HMS ENTERPRISE — All API errors are raised as AppException subclasses
and converted to a consistent JSON response by the exception handler.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


# ── Error codes ───────────────────────────────────────────────────────────────


class ErrorCode(StrEnum):
    """Machine-readable error codes returned in every error response."""

    # Auth
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTH_INVALID = "AUTH_INVALID"
    AUTH_EXPIRED = "AUTH_EXPIRED"

    # RBAC
    FORBIDDEN = "FORBIDDEN"

    # Resources
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    TECHNICIAN_NOT_FOUND = "TECHNICIAN_NOT_FOUND"
    COMPLAINT_NOT_FOUND = "COMPLAINT_NOT_FOUND"
    WORK_ORDER_NOT_FOUND = "WORK_ORDER_NOT_FOUND"
    INVOICE_NOT_FOUND = "INVOICE_NOT_FOUND"
    QUOTATION_NOT_FOUND = "QUOTATION_NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    EQUIPMENT_NOT_FOUND = "EQUIPMENT_NOT_FOUND"
    EMPLOYEE_NOT_FOUND = "EMPLOYEE_NOT_FOUND"
    DEPARTMENT_NOT_FOUND = "DEPARTMENT_NOT_FOUND"

    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"

    # Rate limiting
    RATE_LIMITED = "RATE_LIMITED"

    # External services
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"
    REDIS_ERROR = "REDIS_ERROR"
    EMAIL_ERROR = "EMAIL_ERROR"
    WHATSAPP_ERROR = "WHATSAPP_ERROR"
    FIREBASE_ERROR = "FIREBASE_ERROR"

    # Internal
    INTERNAL_ERROR = "INTERNAL_ERROR"


# ── Base application exception ────────────────────────────────────────────────


class AppException(Exception):
    """Base exception for all application errors.

    Attributes:
        code:        Machine-readable error code (from ErrorCode enum).
        message:     Human-readable message (safe to show to clients).
        status_code: HTTP status code.
        details:     Optional dict with extra context (not shown to end-users).
    """

    def __init__(
        self,
        code: str | ErrorCode,
        message: str,
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = str(code)
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class UnauthorizedException(AppException):
    """401 — Authentication required or token invalid/expired."""

    def __init__(
        self,
        code: str | ErrorCode = ErrorCode.AUTH_REQUIRED,
        message: str = "Authentication required",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code=code, message=message, status_code=401, details=details)


class ForbiddenException(AppException):
    """403 — User authenticated but lacks permission."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code=ErrorCode.FORBIDDEN, message=message, status_code=403, details=details)


class NotFoundException(AppException):
    """404 — Requested resource not found."""

    def __init__(
        self,
        resource: str = "Resource",
        message: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        msg = message or f"{resource} not found"
        super().__init__(code=ErrorCode.NOT_FOUND, message=msg, status_code=404, details=details)


class ConflictException(AppException):
    """409 — Resource already exists or state conflict."""

    def __init__(
        self,
        message: str = "Resource already exists",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code=ErrorCode.CONFLICT, message=message, status_code=409, details=details)


class ValidationException(AppException):
    """422 — Request validation failed."""

    def __init__(
        self,
        message: str = "Validation error",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code=ErrorCode.VALIDATION_ERROR, message=message, status_code=422, details=details)


class RateLimitException(AppException):
    """429 — Too many requests."""

    def __init__(
        self,
        message: str = "Too many requests. Please try again later.",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code=ErrorCode.RATE_LIMITED, message=message, status_code=429, details=details)


class ServiceUnavailableException(AppException):
    """503 — External service (DB, Redis, email, etc.) unavailable."""

    def __init__(
        self,
        message: str = "Service temporarily unavailable",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code=ErrorCode.SERVICE_UNAVAILABLE,
            message=message,
            status_code=503,
            details=details,
        )


class InternalException(AppException):
    """500 — Unexpected internal error."""

    def __init__(
        self,
        message: str = "An internal error occurred",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code=ErrorCode.INTERNAL_ERROR, message=message, status_code=500, details=details)


# ── Standard error response model ─────────────────────────────────────────────


def error_response(
    code: str,
    message: str,
    request_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a standard error response body.

    Shape:
    {
        "success": false,
        "error": {
            "code": "AUTH_REQUIRED",
            "message": "Authentication required",
            "request_id": "abc-123"  // optional
        }
    }
    """
    error_obj: dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if request_id:
        error_obj["request_id"] = request_id
    if details:
        error_obj["details"] = details
    return {"success": False, "error": error_obj}


# ── Global exception handler ──────────────────────────────────────────────────


def register_exception_handlers(app: Any) -> None:
    """Register AppException handler on a FastAPI app instance.

    Must be called after app creation but before startup.

    Usage::

        from fastapi import FastAPI
        app = FastAPI()
        register_exception_handlers(app)
    """
    from app.core.logging import get_logger

    log = get_logger("app.core.exceptions")

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        """Convert AppException to a standard JSON error response."""
        request_id = getattr(request.state, "request_id", None)
        log.warning(
            f"{exc.code}: {exc.message} | {request.method} {request.url.path}",
            extra={"extra_fields": {"status_code": exc.status_code, "code": exc.code}},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(
                code=exc.code,
                message=exc.message,
                request_id=request_id,
                details=exc.details if not exc.status_code >= 500 else None,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all for unexpected exceptions."""
        request_id = getattr(request.state, "request_id", None)
        log.exception(
            f"Unhandled exception on {request.method} {request.url.path}",
            extra={"extra_fields": {"request_id": request_id}},
        )
        return JSONResponse(
            status_code=500,
            content=error_response(
                code=ErrorCode.INTERNAL_ERROR,
                message="An internal error occurred" if not app.state.settings.is_development else str(exc),
                request_id=request_id,
            ),
        )
