"""
Application entry point.

MOHD.HMS ENTERPRISE — FastAPI Backend

Run with:  uvicorn app.main:app --host 0.0.0.0 --port 8000
Or:       python -m uvicorn app.main:app --factory
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging

import httpx
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import close_supabase_client, get_supabase_client
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging, get_logger
from app.core.middleware import (
    LoggingMiddleware,
    RateLimitMiddleware,
    RequestIDMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    settings = get_settings()

    # Store settings on app.state for exception handler access
    app.state.settings = settings

    # ── Startup ────────────────────────────────────────────────────────
    setup_logging(level=logging.DEBUG if settings.is_development else logging.INFO)
    log.info(f"Starting {settings.app_name} v{settings.app_version} [{settings.app_env}] on port {settings.port}")

    # Warm up the Supabase client
    try:
        get_supabase_client()
        log.info("Supabase client initialized")
    except Exception as exc:
        log.error(f"Failed to initialize Supabase client: {exc}")

    if settings.redis_configured:
        log.info("Redis (Upstash) configured")
    else:
        log.warning("Redis not configured — caching disabled")

    yield

    # ── Shutdown ───────────────────────────────────────────────────────
    log.info("Shutting down...")
    await close_supabase_client()
    log.info("Supabase client closed")


def create_app() -> FastAPI:
    """Factory that creates and configures the FastAPI application.

    Separate from module-level app for testability.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="Multi-tenant facility management system — HMS Enterprise API",
        version=settings.app_version,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters: outermost first) ────────────────────
    app.add_middleware(RequestSizeLimitMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*", "X-Request-ID"],
    )

    # ── Exception handlers ─────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Health check endpoints (outside /api/v1) ───────────────────────
    @app.get("/health", tags=["health"])
    async def health_check():
        """Lightweight liveness probe."""
        return {"status": "ok", "version": settings.app_version}

    @app.get("/health/ready", tags=["health"])
    async def readiness_check():
        """Deep readiness probe — checks Supabase + Redis connectivity."""
        checks: dict[str, str] = {}
        all_ok = True

        # Check Supabase
        try:
            client = get_supabase_client()
            resp = await client.get("/rest/v1/", params={"select": "*"}, timeout=5.0)
            if resp.status_code < 500:
                checks["supabase"] = "ok"
            else:
                checks["supabase"] = f"error_{resp.status_code}"
                all_ok = False
        except Exception as exc:
            checks["supabase"] = f"error: {exc}"
            all_ok = False

        # Check Redis (if configured)
        if settings.redis_configured:
            try:
                async with httpx.AsyncClient() as rc:
                    resp = await rc.get(
                        f"{settings.redis_url}/ping/{settings.redis_token}",
                        timeout=5.0,
                    )
                checks["redis"] = "ok" if resp.status_code == 200 else f"error_{resp.status_code}"
                if resp.status_code != 200:
                    all_ok = False
            except Exception as exc:
                checks["redis"] = f"error: {exc}"
                all_ok = False
        else:
            checks["redis"] = "not_configured"

        status_code = 200 if all_ok else 503
        return {"status": "ready" if all_ok else "degraded", "checks": checks}

    # ── API router ─────────────────────────────────────────────────────
    app.include_router(api_router)

    return app


# Module-level app instance for `uvicorn app.main:app`
app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.is_development,
    )
