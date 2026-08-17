"""
Tests for auth endpoints: login, register, me, profile, forgot-password.

MOHD.HMS ENTERPRISE

All tests mock the auth service layer to avoid real DB calls.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from .conftest import TEST_USERS, TEST_TENANT_ID


# ── Login ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, mock_db):
    """POST /api/v1/auth/login returns token + user on valid credentials."""
    mock_response = {
        "token": "jwt-test-token-123",
        "user": {
            "id": TEST_USERS["super_admin"]["userId"],
            "email": "sa@mohdhms.com",
            "name": "Super Admin",
            "role": "super_admin",
            "tenantId": TEST_TENANT_ID,
        },
    }
    with patch("app.features.auth.service.authenticate_user", new_callable=AsyncMock, return_value=mock_response):
        res = await client.post("/api/v1/auth/login", json={
            "email": "sa@mohdhms.com",
            "password": "password123",
        })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert "user" in data
    assert data["user"]["email"] == "sa@mohdhms.com"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, mock_db):
    """POST /api/v1/auth/login returns 500 on bad credentials (service raises Exception)."""
    from app.core.exceptions import UnauthorizedException
    with patch(
        "app.features.auth.service.authenticate_user",
        new_callable=AsyncMock,
        side_effect=UnauthorizedException(code="AUTH_INVALID", message="Invalid email or password"),
    ):
        res = await client.post("/api/v1/auth/login", json={
            "email": "wrong@mohdhms.com",
            "password": "wrong",
        })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_missing_fields(client: AsyncClient):
    """POST /api/v1/auth/login with missing fields returns 422."""
    res = await client.post("/api/v1/auth/login", json={"email": "test@test.com"})
    assert res.status_code == 422


# ── Register ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, mock_db):
    """POST /api/v1/auth/register returns token + user."""
    mock_response = {
        "token": "jwt-register-token",
        "user": {
            "id": "usr-new-001",
            "email": "new@mohdhms.com",
            "name": "New Customer",
            "role": "customer",
            "tenantId": TEST_TENANT_ID,
        },
    }
    with patch("app.features.auth.service.register_user", new_callable=AsyncMock, return_value=mock_response):
        res = await client.post("/api/v1/auth/register", json={
            "name": "New Customer",
            "email": "new@mohdhms.com",
            "password": "securepass",
        })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "customer"


@pytest.mark.asyncio
async def test_register_missing_fields(client: AsyncClient):
    """POST /api/v1/auth/register with missing fields returns 422."""
    res = await client.post("/api/v1/auth/register", json={"name": "Test"})
    assert res.status_code == 422


# ── Me (get current user) ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_authenticated(sa_client: AsyncClient, mock_db):
    """GET /api/v1/auth/me returns user profile for authenticated user."""
    mock_profile = {
        "id": TEST_USERS["super_admin"]["userId"],
        "email": "sa@mohdhms.com",
        "name": "Super Admin",
        "role": "super_admin",
        "tenantId": TEST_TENANT_ID,
    }
    with patch("app.features.auth.service.get_current_user_profile", new_callable=AsyncMock, return_value=mock_profile):
        res = await sa_client.get("/api/v1/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "sa@mohdhms.com"
    assert data["role"] == "super_admin"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    """GET /api/v1/auth/me without token returns 401."""
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
    data = res.json()
    assert data["success"] is False
    assert "error" in data


# ── Profile update ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_profile_update(sa_client: AsyncClient, mock_db):
    """PUT /api/v1/auth/profile updates the user's profile."""
    updated = {
        "id": TEST_USERS["super_admin"]["userId"],
        "email": "sa@mohdhms.com",
        "name": "Updated Name",
        "role": "super_admin",
        "tenantId": TEST_TENANT_ID,
    }
    with patch("app.features.auth.service.update_user_profile", new_callable=AsyncMock, return_value=updated):
        res = await sa_client.put("/api/v1/auth/profile", json={"name": "Updated Name"})
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Name"


# ── Forgot password ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_forgot_password_success(client: AsyncClient, mock_db):
    """POST /api/v1/auth/forgot-password always returns ok."""
    with patch("app.features.auth.service.forgot_password", new_callable=AsyncMock, return_value={"ok": True, "message": "OTP sent"}):
        res = await client.post("/api/v1/auth/forgot-password", json={"email": "sa@mohdhms.com"})
    assert res.status_code == 200
    assert res.json()["ok"] is True


@pytest.mark.asyncio
async def test_forgot_password_oauth_only(client: AsyncClient, mock_db):
    """POST /api/v1/auth/forgot-password for OAuth-only user returns 400."""
    with patch(
        "app.features.auth.service.forgot_password",
        new_callable=AsyncMock,
        return_value={"ok": False, "code": "oauth_only", "message": "Account uses OAuth"},
    ):
        res = await client.post("/api/v1/auth/forgot-password", json={"email": "oauth@mohdhms.com"})
    assert res.status_code == 400


# ── Refresh session ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refresh_session(sa_client: AsyncClient, mock_db):
    """GET /api/v1/auth/refresh-session returns user with roleChanged flag."""
    mock_response = {
        "id": TEST_USERS["super_admin"]["userId"],
        "email": "sa@mohdhms.com",
        "name": "Super Admin",
        "role": "super_admin",
        "tenantId": TEST_TENANT_ID,
        "roleChanged": False,
    }
    with patch("app.features.auth.service.refresh_session", new_callable=AsyncMock, return_value=mock_response):
        res = await sa_client.get("/api/v1/auth/refresh-session")
    assert res.status_code == 200
    assert res.json()["roleChanged"] is False


# ── Logout ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_logout(sa_client: AsyncClient, mock_db):
    """POST /api/v1/auth/logout returns success."""
    with patch("app.features.auth.service.invalidate_user_sessions", new_callable=AsyncMock):
        res = await sa_client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    assert res.json()["success"] is True


# ── Admin: list users ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_users_admin(sa_client: AsyncClient, mock_db):
    """GET /api/v1/auth/users requires admin+ role — super_admin can access."""
    mock_response = {
        "users": [TEST_USERS["super_admin"]],
        "pagination": {"page": 1, "pageSize": 20, "total": 1, "totalPages": 1},
    }
    with patch("app.features.auth.service.list_users", new_callable=AsyncMock, return_value=mock_response):
        res = await sa_client.get("/api/v1/auth/users")
    assert res.status_code == 200
    assert "users" in res.json()


@pytest.mark.asyncio
async def test_list_users_customer_forbidden(customer_client: AsyncClient):
    """GET /api/v1/auth/users returns 403 for customer role."""
    res = await customer_client.get("/api/v1/auth/users")
    assert res.status_code == 403


# ── Admin: delete user (super_admin only) ──────────────────────────────────


@pytest.mark.asyncio
async def test_delete_user_super_admin(sa_client: AsyncClient, mock_db):
    """DELETE /api/v1/auth/users/{id} works for super_admin."""
    with patch("app.features.auth.service.delete_user", new_callable=AsyncMock):
        res = await sa_client.delete(f"/api/v1/auth/users/{TEST_USERS['customer']['userId']}")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_delete_user_admin_forbidden(admin_client: AsyncClient):
    """DELETE /api/v1/auth/users/{id} returns 403 for admin (requires super_admin)."""
    res = await admin_client.delete(f"/api/v1/auth/users/{TEST_USERS['customer']['userId']}")
    assert res.status_code == 403


# ── Invalid token ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_invalid_token_returns_401(client: AsyncClient):
    """Requests with an invalid JWT should return 401."""
    res = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_missing_token_returns_401(client: AsyncClient):
    """Requests with no Authorization header should return 401."""
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
