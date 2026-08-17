"""
Pytest fixtures for MOHD.HMS ENTERPRISE backend tests.

Creates a test FastAPI app with:
- Dependency overrides for auth (mock users)
- Mocked database and Redis functions
- JWT token generation helpers for each role
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Callable
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ── Ensure test environment before any app imports ─────────────────────────

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-for-hms-testing")
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-svc-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")

# Force-clear the lru_cache for Settings so test env vars take effect
from app.core.config import get_settings, Settings
get_settings.cache_clear()

from fastapi import FastAPI, Request, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.dependencies import AuthUser, get_current_user, dep_get_settings
from app.core.security import create_access_token, verify_jwt_token
from app.core.exceptions import UnauthorizedException


# ── Test constants ──────────────────────────────────────────────────────────

TEST_TENANT_ID = "tenant-test-001"
TEST_JWT_SECRET = "test-secret-for-hms-testing"

TEST_USERS: dict[str, dict[str, str]] = {
    "super_admin": {"userId": "usr-sa-001", "tenantId": TEST_TENANT_ID, "role": "super_admin", "email": "sa@mohdhms.com", "name": "Super Admin"},
    "admin": {"userId": "usr-ad-001", "tenantId": TEST_TENANT_ID, "role": "admin", "email": "admin@mohdhms.com", "name": "Admin User"},
    "manager": {"userId": "usr-mg-001", "tenantId": TEST_TENANT_ID, "role": "manager", "email": "mgr@mohdhms.com", "name": "Manager User"},
    "supervisor": {"userId": "usr-sv-001", "tenantId": TEST_TENANT_ID, "role": "supervisor", "email": "sup@mohdhms.com", "name": "Supervisor User"},
    "technician": {"userId": "usr-tc-001", "tenantId": TEST_TENANT_ID, "role": "technician", "email": "tech@mohdhms.com", "name": "Tech User"},
    "finance": {"userId": "usr-fn-001", "tenantId": TEST_TENANT_ID, "role": "finance", "email": "fin@mohdhms.com", "name": "Finance User"},
    "customer": {"userId": "usr-cu-001", "tenantId": TEST_TENANT_ID, "role": "customer", "email": "cust@mohdhms.com", "name": "Customer User"},
}


def _make_token(role: str) -> str:
    """Create a valid JWT for the given role."""
    user_data = TEST_USERS[role]
    return create_access_token(user_data, TEST_JWT_SECRET)


# Pre-generate tokens for each role
TEST_TOKENS: dict[str, str] = {role: _make_token(role) for role in TEST_USERS}


def make_auth_headers(role: str) -> dict[str, str]:
    """Return Authorization headers for the given role."""
    return {"Authorization": f"Bearer {TEST_TOKENS[role]}"}


def make_auth_user(role: str) -> AuthUser:
    """Return an AuthUser dataclass for the given role."""
    u = TEST_USERS[role]
    return AuthUser(userId=u["userId"], tenantId=u["tenantId"], role=u["role"], email=u["email"], name=u["name"])


def create_test_app(override_dependencies: dict | None = None) -> FastAPI:
    """Create a test FastAPI app with dependency overrides.

    By default overrides get_current_user to extract from a real JWT
    (using TEST_JWT_SECRET). This means tests can simply pass the
    Bearer token and auth works end-to-end without DB lookups.

    Args:
        override_dependencies: Additional {dep_func: mock_func} overrides.
    """
    # We build the app directly to avoid the lifespan (which tries to
    # connect to real Supabase/Redis). We register routes and exception
    # handlers manually.
    from app.api.router import api_router
    from app.core.exceptions import register_exception_handlers

    app = FastAPI()
    app.state.settings = get_settings()
    register_exception_handlers(app)
    app.include_router(api_router)

    # Default: override get_current_user to use JWT with test secret
    _bearer = HTTPBearer(auto_error=False)

    async def _test_get_current_user(
        request: Request,
        credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    ) -> AuthUser:
        if not credentials:
            raise UnauthorizedException(code="AUTH_REQUIRED", message="Authorization header required")
        payload = verify_jwt_token(credentials.credentials, TEST_JWT_SECRET)
        user = AuthUser(
            userId=payload.userId,
            tenantId=payload.tenantId,
            role=payload.role,
            email=payload.email,
            name=payload.raw.get("name"),
        )
        request.state.auth_user = user
        return user

    # Also override dep_get_settings to return test settings
    async def _test_get_settings() -> Settings:
        return get_settings()

    app.dependency_overrides[get_current_user] = _test_get_current_user
    app.dependency_overrides[dep_get_settings] = _test_get_settings

    # Apply any extra overrides
    if override_dependencies:
        for dep, mock_fn in override_dependencies.items():
            app.dependency_overrides[dep] = mock_fn

    # Add health endpoints (normally added in main.py create_app)
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "ok", "version": "1.0.0"}

    @app.get("/health/ready", tags=["health"])
    async def readiness_check():
        return {"status": "ready", "checks": {"supabase": "ok", "redis": "not_configured"}}

    return app


@pytest_asyncio.fixture
async def app() -> FastAPI:
    """Create a fresh test FastAPI app for each test."""
    return create_test_app()


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Async httpx client bound to the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def sa_client(client: AsyncClient) -> AsyncClient:
    """Client authenticated as super_admin."""
    client.headers.update(make_auth_headers("super_admin"))
    return client


@pytest_asyncio.fixture
async def admin_client(client: AsyncClient) -> AsyncClient:
    """Client authenticated as admin."""
    client.headers.update(make_auth_headers("admin"))
    return client


@pytest_asyncio.fixture
async def customer_client(client: AsyncClient) -> AsyncClient:
    """Client authenticated as customer."""
    client.headers.update(make_auth_headers("customer"))
    return client


@pytest_asyncio.fixture
async def tech_client(client: AsyncClient) -> AsyncClient:
    """Client authenticated as technician."""
    client.headers.update(make_auth_headers("technician"))
    return client


@pytest.fixture
def mock_db():
    """Fixture that patches database helper functions to return test data.

    Returns an object with mutable data stores so tests can set up
    records before making requests.
    """
    stores: dict[str, list[dict]] = {}

    async def _mock_query_table(
        table: str,
        *,
        select: str = "*",
        where: dict | None = None,
        order: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        count: str | None = None,
        tenant_id: str | None = None,
    ) -> dict[str, Any]:
        records = stores.get(table, [])
        # Apply tenant_id filter
        if tenant_id:
            records = [r for r in records if r.get("tenantId") == tenant_id]
        # Apply where filters
        if where:
            for k, v in where.items():
                if isinstance(v, dict) and "in" in v:
                    records = [r for r in records if r.get(k) in v["in"]]
                else:
                    records = [r for r in records if r.get(k) == v]
        # Pagination
        total = len(records)
        if offset:
            records = records[offset:]
        if limit:
            records = records[:limit]
        result: dict[str, Any] = {"data": records}
        if count:
            result["count"] = str(total)
        result["range"] = f"0-{len(records) - 1 if records else 0}/{total}"
        return result

    async def _mock_insert_record(table: str, data: dict) -> dict:
        if table not in stores:
            stores[table] = []
        # Ensure the record has an id
        if "id" not in data:
            data["id"] = f"gen-{len(stores[table]) + 1}"
        stores[table].append(data)
        return data

    async def _mock_update_record(table: str, record_id: str, data: dict) -> dict:
        if table not in stores:
            stores[table] = []
        for i, r in enumerate(stores[table]):
            if r.get("id") == record_id:
                stores[table][i] = {**r, **data}
                return stores[table][i]
        return {"id": record_id}

    async def _mock_delete_record(table: str, record_id: str) -> None:
        if table not in stores:
            return
        stores[table] = [r for r in stores[table] if r.get("id") != record_id]

    async def _mock_count_records(table: str, where: dict | None = None, *, tenant_id: str | None = None) -> int:
        records = stores.get(table, [])
        if tenant_id:
            records = [r for r in records if r.get("tenantId") == tenant_id]
        if where:
            for k, v in where.items():
                records = [r for r in records if r.get(k) == v]
        return len(records)

    patches = [
        patch("app.core.database.query_table", _mock_query_table),
        patch("app.core.database.insert_record", _mock_insert_record),
        patch("app.core.database.update_record", _mock_update_record),
        patch("app.core.database.delete_record", _mock_delete_record),
        patch("app.core.database.count_records", _mock_count_records),
    ]

    for p in patches:
        p.start()

    class MockDB:
        def __init__(self):
            self.stores = stores

    yield MockDB()

    for p in patches:
        p.stop()


@pytest.fixture
def mock_supabase_client():
    """Patches get_supabase_client to return a mock httpx.AsyncClient."""
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = []
    mock_response.headers = {"content-range": "0-0/0"}
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.patch = AsyncMock(return_value=mock_response)
    mock_client.delete = AsyncMock(return_value=MagicMock(status_code=204))
    mock_client.headers = {"apikey": "test", "Authorization": "Bearer test"}
    mock_client.base_url = "http://localhost:54321"

    with patch("app.core.database.get_supabase_client", return_value=mock_client):
        yield mock_client


@pytest.fixture
def mock_redis():
    """Patches Redis operations to always succeed."""
    with patch("app.integrations.redis.get_redis", return_value=None), \
         patch("app.integrations.redis.cache_get", new_callable=AsyncMock, return_value=None), \
         patch("app.integrations.redis.cache_set", new_callable=AsyncMock, return_value=True), \
         patch("app.integrations.redis.cache_delete", new_callable=AsyncMock, return_value=True):
        yield
