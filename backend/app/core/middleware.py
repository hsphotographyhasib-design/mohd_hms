import collections
import time
import uuid
from dataclasses import dataclass, field

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.logging import get_logger, SENSITIVE_HEADERS

log = get_logger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

REQUEST_SIZE_LIMIT = 10 * 1024 * 1024  # 10 MB


def _should_skip_path(path: str) -> bool:
    """Return True for paths that should bypass auth/logging overhead."""
    return path in ("/health", "/health/ready", "/docs", "/openapi.json", "/redoc")


def _filter_headers(headers: dict[str, str]) -> dict[str, str]:
    """Return a copy of headers with sensitive values redacted."""
    filtered: dict[str, str] = {}
    for k, v in headers.items():
        if k.lower() in SENSITIVE_HEADERS:
            filtered[k] = "[REDACTED]"
        else:
            filtered[k] = v
    return filtered


# ── Request ID Middleware ─────────────────────────────────────────────────────


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assign a unique X-Request-ID to every incoming request.

    Uses the incoming X-Request-ID header if present, otherwise generates
    a UUID4. The ID is stored on ``request.state.request_id`` and echoed
    in the response header.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ── Logging Middleware ─────────────────────────────────────────────────────────


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log method, path, status code, duration, and request_id.

    Skips noisy paths (/health, /docs, /openapi.json).
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if _should_skip_path(request.url.path):
            return await call_next(request)

        start = time.perf_counter()
        response: Response | None = None

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            request_id = getattr(request.state, "request_id", "-")
            log.error(
                f"{request.method} {request.url.path} -> 500 ({duration_ms:.1f}ms)",
                extra={"extra_fields": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": 500,
                    "duration_ms": round(duration_ms, 1),
                    "request_id": request_id,
                }},
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        request_id = getattr(request.state, "request_id", "-")

        log.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.1f}ms)",
            extra={"extra_fields": {
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(duration_ms, 1),
                "request_id": request_id,
            }},
        )
        return response


# ── Security Headers Middleware ───────────────────────────────────────────────


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add standard security headers to every response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        return response


# ── Rate Limit Middleware ──────────────────────────────────────────────────────


@dataclass
class _RateLimitEntry:
    """Tracks request count for a single client within a window."""
    count: int = 0
    window_start: float = 0.0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory sliding-window rate limiter.

    Configuration:
        max_requests: max requests per window (default 100)
        window_sec: window in seconds (default 60)

    Rate limits are per-client-IP. For production, consider a
    Redis-backed implementation.
    """

    def __init__(self, app, *, max_requests: int = 100, window_sec: int = 60) -> None:
        super().__init__(app)
        self._buckets: dict[str, _RateLimitEntry] = collections.defaultdict(_RateLimitEntry)
        self.max_requests = max_requests
        self.window_sec = window_sec

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if _should_skip_path(request.url.path):
            return await call_next(request)

        # Determine client key (prefer X-Forwarded-For in prod)
        forwarded = request.headers.get("X-Forwarded-For", "")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

        now = time.time()
        entry = self._buckets[client_ip]

        # Reset window if expired
        if now - entry.window_start > self.window_sec:
            entry.count = 0
            entry.window_start = now

        entry.count += 1

        if entry.count > self.max_requests:
            response = JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please try again later.",
                        "request_id": getattr(request.state, "request_id", None),
                    },
                },
            )
            response.headers["Retry-After"] = str(self.window_sec)
            response.headers["X-RateLimit-Limit"] = str(self.max_requests)
            response.headers["X-RateLimit-Remaining"] = "0"
            return response

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(self.max_requests - entry.count)
        return response


# ── Request Size Limit Middleware ──────────────────────────────────────────────


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests with a Content-Length exceeding the configured limit."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > REQUEST_SIZE_LIMIT:
            return JSONResponse(
                status_code=413,
                content={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": f"Request body too large. Maximum size is {REQUEST_SIZE_LIMIT // (1024*1024)}MB.",
                    },
                },
            )
        return await call_next(request)
