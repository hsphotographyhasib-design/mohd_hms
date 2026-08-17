"""
Tests for role-based access control (RBAC).

MOHD.HMS ENTERPRISE

Verifies that:
- super_admin can access all endpoints
- Lower-privilege roles get 403 on admin-only endpoints
- require_min_role dependency works correctly
- require_role dependency works correctly
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from .conftest import TEST_USERS, TEST_TENANT_ID


# ── Super Admin: full access ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_super_admin_can_access_users_list(sa_client: AsyncClient, mock_db):
    """super_admin can GET /api/v1/auth/users (requires admin+)."""
    with patch("app.features.auth.service.list_users", new_callable=AsyncMock, return_value={"users": [], "pagination": {"page": 1, "pageSize": 20, "total": 0, "totalPages": 0}}):
        res = await sa_client.get("/api/v1/auth/users")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_super_admin_can_create_user(sa_client: AsyncClient, mock_db):
    """super_admin can POST /api/v1/auth/users (requires admin+)."""
    with patch("app.features.auth.service.create_user", new_callable=AsyncMock, return_value={"message": "User created", "user": TEST_USERS["customer"]}):
        res = await sa_client.post("/api/v1/auth/users", json={"name": "Test", "email": "t@t.com", "password": "pass123"})
    assert res.status_code == 201


@pytest.mark.asyncio
async def test_super_admin_can_delete_user(sa_client: AsyncClient, mock_db):
    """super_admin can DELETE /api/v1/auth/users/{id} (requires super_admin)."""
    with patch("app.features.auth.service.delete_user", new_callable=AsyncMock):
        res = await sa_client.delete(f"/api/v1/auth/users/{TEST_USERS['customer']['userId']}")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_super_admin_can_access_complaints(sa_client: AsyncClient, mock_db):
    """super_admin can list complaints."""
    with patch("app.features.complaints.service.list_complaints", new_callable=AsyncMock, return_value={"data": [], "total": 0, "page": 1, "pageSize": 20, "totalPages": 0}):
        res = await sa_client.get("/api/v1/complaints")
    assert res.status_code == 200


# ── Admin: can access most but not super_admin-only ──────────────────────


@pytest.mark.asyncio
async def test_admin_can_access_users_list(admin_client: AsyncClient, mock_db):
    """admin can GET /api/v1/auth/users."""
    with patch("app.features.auth.service.list_users", new_callable=AsyncMock, return_value={"users": [], "pagination": {"page": 1, "pageSize": 20, "total": 0, "totalPages": 0}}):
        res = await admin_client.get("/api/v1/auth/users")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_admin_cannot_delete_user(admin_client: AsyncClient):
    """admin CANNOT DELETE /api/v1/auth/users/{id} (requires super_admin)."""
    res = await admin_client.delete(f"/api/v1/auth/users/{TEST_USERS['customer']['userId']}")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_access_complaints(admin_client: AsyncClient, mock_db):
    """admin can list complaints."""
    with patch("app.features.complaints.service.list_complaints", new_callable=AsyncMock, return_value={"data": [], "total": 0, "page": 1, "pageSize": 20, "totalPages": 0}):
        res = await admin_client.get("/api/v1/complaints")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_admin_can_delete_complaint(admin_client: AsyncClient, mock_db):
    """admin can DELETE /api/v1/complaints/{id} (requires super_admin, admin)."""
    with patch("app.features.complaints.service.delete_complaint", new_callable=AsyncMock):
        res = await admin_client.delete("/api/v1/complaints/cmp-001")
    assert res.status_code == 200


# ── Customer: restricted access ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_customer_cannot_list_users(customer_client: AsyncClient):
    """customer gets 403 on GET /api/v1/auth/users (requires admin+)."""
    res = await customer_client.get("/api/v1/auth/users")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_customer_cannot_delete_user(customer_client: AsyncClient):
    """customer gets 403 on DELETE /api/v1/auth/users/{id}."""
    res = await customer_client.delete(f"/api/v1/auth/users/{TEST_USERS['admin']['userId']}")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_customer_can_access_own_complaints(customer_client: AsyncClient, mock_db):
    """customer CAN list complaints (feature access includes customer)."""
    with patch("app.features.complaints.service.list_complaints", new_callable=AsyncMock, return_value={"data": [], "total": 0, "page": 1, "pageSize": 20, "totalPages": 0, "accessLevel": "own"}):
        res = await customer_client.get("/api/v1/complaints")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_customer_cannot_delete_complaint(customer_client: AsyncClient):
    """customer gets 403 on DELETE /api/v1/complaints/{id} (requires super_admin, admin)."""
    res = await customer_client.delete("/api/v1/complaints/cmp-001")
    assert res.status_code == 403


# ── Technician: limited access ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_technician_cannot_list_users(tech_client: AsyncClient):
    """technician gets 403 on GET /api/v1/auth/users."""
    res = await tech_client.get("/api/v1/auth/users")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_technician_can_access_complaints(tech_client: AsyncClient, mock_db):
    """technician CAN list complaints."""
    with patch("app.features.complaints.service.list_complaints", new_callable=AsyncMock, return_value={"data": [], "total": 0, "page": 1, "pageSize": 20, "totalPages": 0, "accessLevel": "assigned"}):
        res = await tech_client.get("/api/v1/complaints")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_technician_cannot_delete_complaint(tech_client: AsyncClient):
    """technician gets 403 on DELETE /api/v1/complaints/{id}."""
    res = await tech_client.delete("/api/v1/complaints/cmp-001")
    assert res.status_code == 403


# ── RBAC: role hierarchy tests via require_min_role ──────────────────────


@pytest.mark.asyncio
async def test_manager_below_super_admin_delete(client: AsyncClient, mock_db):
    """manager (level 80) cannot access super_admin-only delete user endpoint.

    This tests the require_min_role('super_admin') dependency on
    DELETE /api/v1/auth/users/{id}.
    """
    from .conftest import make_auth_headers
    headers = make_auth_headers("manager")
    res = await client.delete(
        f"/api/v1/auth/users/{TEST_USERS['customer']['userId']}",
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_supervisor_below_admin_list(client: AsyncClient, mock_db):
    """supervisor (level 70) cannot access admin+ list users endpoint.

    This tests the require_min_role('admin') dependency on
    GET /api/v1/auth/users.
    """
    from .conftest import make_auth_headers
    headers = make_auth_headers("supervisor")
    res = await client.get("/api/v1/auth/users", headers=headers)
    assert res.status_code == 403


# ── RBAC permission matrix unit tests ─────────────────────────────────────


def test_feature_access_permissions():
    """Unit test: verify the RBAC permission matrix for key features."""
    from app.rbac.permissions import has_feature_access

    # Dashboard: accessible to all active roles
    assert has_feature_access("super_admin", "dashboard") is True
    assert has_feature_access("customer", "dashboard") is True

    # Settings: super_admin only
    assert has_feature_access("super_admin", "settings") is True
    assert has_feature_access("admin", "settings") is False
    assert has_feature_access("manager", "settings") is False

    # CMS: super_admin only
    assert has_feature_access("super_admin", "cms") is True
    assert has_feature_access("admin", "cms") is False

    # Inventory: admin, manager, supervisor
    assert has_feature_access("admin", "inventory") is True
    assert has_feature_access("supervisor", "inventory") is True
    assert has_feature_access("technician", "inventory") is False
    assert has_feature_access("customer", "inventory") is False

    # Finance: admin, finance
    assert has_feature_access("finance", "finance") is True
    assert has_feature_access("admin", "finance") is True
    assert has_feature_access("manager", "finance") is False


def test_action_permissions():
    """Unit test: verify entity.action permission checks."""
    from app.rbac.permissions import has_action_permission

    # Complaint assign: super_admin, admin, supervisor, manager
    assert has_action_permission("super_admin", "complaint", "assign_technician") is True
    assert has_action_permission("admin", "complaint", "assign_technician") is True
    assert has_action_permission("supervisor", "complaint", "assign_technician") is True
    assert has_action_permission("manager", "complaint", "assign_technician") is True
    assert has_action_permission("technician", "complaint", "assign_technician") is False
    assert has_action_permission("customer", "complaint", "assign_technician") is False

    # Complaint delete: super_admin, admin only
    assert has_action_permission("super_admin", "complaint", "delete") is True
    assert has_action_permission("admin", "complaint", "delete") is True
    assert has_action_permission("manager", "complaint", "delete") is False

    # Invoice create: super_admin, admin, finance
    assert has_action_permission("finance", "invoice", "create") is True
    assert has_action_permission("manager", "invoice", "create") is False
    assert has_action_permission("customer", "invoice", "create") is False


def test_role_hierarchy():
    """Unit test: verify role hierarchy ordering."""
    from app.rbac.permissions import has_min_role_level, ROLE_HIERARCHY

    assert ROLE_HIERARCHY["super_admin"] > ROLE_HIERARCHY["admin"]
    assert ROLE_HIERARCHY["admin"] > ROLE_HIERARCHY["manager"]
    assert ROLE_HIERARCHY["manager"] > ROLE_HIERARCHY["supervisor"]
    assert ROLE_HIERARCHY["supervisor"] > ROLE_HIERARCHY["technician"]
    assert ROLE_HIERARCHY["technician"] > ROLE_HIERARCHY["customer"]
    assert ROLE_HIERARCHY["customer"] > ROLE_HIERARCHY["guest"]

    # super_admin meets all minimums
    assert has_min_role_level("super_admin", "customer") is True
    assert has_min_role_level("super_admin", "technician") is True
    assert has_min_role_level("super_admin", "admin") is True

    # customer meets only customer/guest minimums
    assert has_min_role_level("customer", "customer") is True
    assert has_min_role_level("customer", "guest") is True
    assert has_min_role_level("customer", "technician") is False

    # technician meets technician and below
    assert has_min_role_level("technician", "technician") is True
    assert has_min_role_level("technician", "customer") is True
    assert has_min_role_level("technician", "supervisor") is False


def test_role_transition_matrix():
    """Unit test: verify who can assign which roles."""
    from app.rbac.permissions import can_assign_role

    # super_admin can assign any role
    assert can_assign_role("super_admin", "super_admin") is True
    assert can_assign_role("super_admin", "admin") is True
    assert can_assign_role("super_admin", "customer") is True

    # admin can only assign customer, technician, hr, finance
    assert can_assign_role("admin", "customer") is True
    assert can_assign_role("admin", "technician") is True
    assert can_assign_role("admin", "admin") is False
    assert can_assign_role("admin", "manager") is False

    # manager cannot assign any roles
    assert can_assign_role("manager", "customer") is False
    assert can_assign_role("manager", "technician") is False
