"""
Tests for /health and /health/ready endpoints.

MOHD.HMS ENTERPRISE
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(client: AsyncClient):
    """GET /health should return {status: ok, version: ...}."""
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_ready_returns_ready(client: AsyncClient):
    """GET /health/ready should return {status: ready, checks: {...}}."""
    res = await client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert "checks" in data
    assert "supabase" in data["checks"]
    assert "redis" in data["checks"]


@pytest.mark.asyncio
async def test_health_does_not_require_auth(client: AsyncClient):
    """GET /health should work without any Authorization header."""
    res = await client.get("/health")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_health_ready_does_not_require_auth(client: AsyncClient):
    """GET /health/ready should work without any Authorization header."""
    res = await client.get("/health/ready")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_nonexistent_route_returns_404(client: AsyncClient):
    """GET /nonexistent should return 404."""
    res = await client.get("/nonexistent")
    assert res.status_code == 404
