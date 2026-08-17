"""
Tests for complaint CRUD, workflow transitions, and technician assignment.

MOHD.HMS ENTERPRISE

All service-layer functions are mocked to isolate router/dependency logic.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from .conftest import TEST_USERS, TEST_TENANT_ID


# ── Test data ──────────────────────────────────────────────────────────────

SAMPLE_COMPLAINT = {
    "id": "cmp-001",
    "tenantId": TEST_TENANT_ID,
    "customerId": TEST_USERS["customer"]["userId"],
    "customerName": "Customer User",
    "title": "AC not working in Hall 3",
    "description": "The central AC unit on floor 3 has stopped cooling.",
    "priority": "high",
    "status": "NEW",
    "category": "hvac",
    "complaintNumber": "CMP-2025-0001",
    "source": "portal",
    "photos": [],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z",
}

SAMPLE_COMPLAINT_ASSIGNED = {
    **SAMPLE_COMPLAINT,
    "status": "ASSIGNED",
    "assignedToId": TEST_USERS["technician"]["userId"],
    "assignedToName": "Tech User",
    "assignmentStatus": "PENDING_ACCEPTANCE",
}

LIST_RESPONSE = {
    "data": [SAMPLE_COMPLAINT],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
}

COUNTS_RESPONSE = {
    "NEW": 5,
    "ASSIGNED": 3,
    "IN_PROGRESS": 2,
    "CLOSED": 10,
}

ESCALATION_RULES = [
    {
        "status": "NEW",
        "threshold": "4h",
        "thresholdMs": 14400000,
        "severity": "warning",
        "label": "Unassigned > 4h",
        "description": "New complaint not assigned within 4 hours",
        "notifyRoles": ["admin", "manager"],
        "notifyCustomer": False,
        "notifySupervisor": True,
    }
]

TIMELINE_ENTRY = {
    "id": "tl-001",
    "complaintId": "cmp-001",
    "action": "status_change",
    "fromStatus": "NEW",
    "toStatus": "ASSIGNED",
    "description": "Assigned to technician",
    "performedBy": TEST_USERS["admin"]["userId"],
    "performedByRole": "admin",
    "createdAt": "2025-01-15T10:30:00Z",
}


# ── List complaints ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_complaints(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints returns paginated list."""
    with patch("app.features.complaints.service.list_complaints", new_callable=AsyncMock, return_value=LIST_RESPONSE):
        res = await sa_client.get("/api/v1/complaints")
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert data["total"] == 1
    assert len(data["data"]) == 1
    assert data["data"][0]["id"] == "cmp-001"


@pytest.mark.asyncio
async def test_list_complaints_with_filters(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints?status=NEW&priority=high passes filters."""
    filtered = {**LIST_RESPONSE, "data": [], "total": 0}
    with patch("app.features.complaints.service.list_complaints", new_callable=AsyncMock, return_value=filtered) as mock_svc:
        res = await sa_client.get("/api/v1/complaints", params={"status": "NEW", "priority": "high"})
    assert res.status_code == 200
    # Verify the service was called with correct params
    call_args = mock_svc.call_args
    assert call_args[0][0] == TEST_TENANT_ID  # tenant_id


@pytest.mark.asyncio
async def test_list_complaints_unauthenticated(client: AsyncClient):
    """GET /api/v1/complaints without auth returns 401."""
    res = await client.get("/api/v1/complaints")
    assert res.status_code == 401


# ── Get complaint counts ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_complaint_counts(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints/counts returns status counts."""
    with patch("app.features.complaints.service.get_counts", new_callable=AsyncMock, return_value=COUNTS_RESPONSE):
        res = await sa_client.get("/api/v1/complaints/counts")
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data
    assert data["counts"]["NEW"] == 5


# ── Get escalation rules ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_escalation_rules(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints/escalation-rules returns rules."""
    with patch("app.features.complaints.service.get_escalation_rules", new_callable=AsyncMock, return_value=ESCALATION_RULES):
        res = await sa_client.get("/api/v1/complaints/escalation-rules")
    assert res.status_code == 200
    data = res.json()
    assert "rules" in data
    assert len(data["rules"]) == 1
    assert data["rules"][0]["status"] == "NEW"


# ── Create complaint ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_complaint(sa_client: AsyncClient, mock_db):
    """POST /api/v1/complaints creates a complaint."""
    with patch("app.features.complaints.service.create_complaint", new_callable=AsyncMock, return_value=SAMPLE_COMPLAINT):
        res = await sa_client.post("/api/v1/complaints", json={
            "title": "AC not working in Hall 3",
            "description": "The central AC unit on floor 3 has stopped cooling.",
            "priority": "high",
            "category": "hvac",
        })
    assert res.status_code == 201
    data = res.json()
    assert data["id"] == "cmp-001"
    assert data["status"] == "NEW"


@pytest.mark.asyncio
async def test_create_complaint_missing_fields(sa_client: AsyncClient):
    """POST /api/v1/complaints without required fields returns 422."""
    res = await sa_client.post("/api/v1/complaints", json={"title": "Missing description"})
    assert res.status_code == 422


# ── Get single complaint ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_complaint(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints/{id} returns complaint detail."""
    with patch("app.features.complaints.service.get_complaint", new_callable=AsyncMock, return_value=SAMPLE_COMPLAINT):
        res = await sa_client.get("/api/v1/complaints/cmp-001")
    assert res.status_code == 200
    assert res.json()["id"] == "cmp-001"
    assert res.json()["title"] == "AC not working in Hall 3"


# ── Update complaint ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_complaint(sa_client: AsyncClient, mock_db):
    """PUT /api/v1/complaints/{id} updates complaint fields."""
    updated = {**SAMPLE_COMPLAINT, "title": "Updated title", "priority": "critical"}
    with patch("app.features.complaints.service.update_complaint", new_callable=AsyncMock, return_value=updated):
        res = await sa_client.put("/api/v1/complaints/cmp-001", json={"title": "Updated title", "priority": "critical"})
    assert res.status_code == 200
    assert res.json()["title"] == "Updated title"


# ── Delete complaint ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_complaint_super_admin(sa_client: AsyncClient, mock_db):
    """DELETE /api/v1/complaints/{id} works for super_admin."""
    with patch("app.features.complaints.service.delete_complaint", new_callable=AsyncMock):
        res = await sa_client.delete("/api/v1/complaints/cmp-001")
    assert res.status_code == 200
    assert res.json()["message"] == "Complaint deleted successfully"


@pytest.mark.asyncio
async def test_delete_complaint_admin(admin_client: AsyncClient, mock_db):
    """DELETE /api/v1/complaints/{id} works for admin."""
    with patch("app.features.complaints.service.delete_complaint", new_callable=AsyncMock):
        res = await admin_client.delete("/api/v1/complaints/cmp-001")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_delete_complaint_customer_forbidden(customer_client: AsyncClient):
    """DELETE /api/v1/complaints/{id} returns 403 for customer."""
    res = await customer_client.delete("/api/v1/complaints/cmp-001")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_delete_complaint_technician_forbidden(tech_client: AsyncClient):
    """DELETE /api/v1/complaints/{id} returns 403 for technician."""
    res = await tech_client.delete("/api/v1/complaints/cmp-001")
    assert res.status_code == 403


# ── Assign technician ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_assign_technician(sa_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/{id}/assign-technician assigns a tech."""
    result = {**SAMPLE_COMPLAINT, "status": "ASSIGNED", "assignedToId": TEST_USERS["technician"]["userId"]}
    with patch("app.features.complaints.service.assign_technician", new_callable=AsyncMock, return_value=result):
        res = await sa_client.post("/api/v1/complaints/cmp-001/assign-technician", json={
            "technicianId": TEST_USERS["technician"]["userId"],
        })
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_get_available_technicians(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints/{id}/assign-technician returns available techs."""
    techs = [{"id": TEST_USERS["technician"]["userId"], "name": "Tech User", "status": "available"}]
    with patch("app.features.complaints.service.get_available_technicians", new_callable=AsyncMock, return_value=techs):
        res = await sa_client.get("/api/v1/complaints/cmp-001/assign-technician")
    assert res.status_code == 200


# ── Accept/Reject assignment ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_accept_assignment(tech_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/{id}/accept-reject with action=accept."""
    result = {**SAMPLE_COMPLAINT_ASSIGNED, "assignmentStatus": "ACCEPTED", "status": "ACCEPTED"}
    with patch("app.features.complaints.service.accept_reject_complaint", new_callable=AsyncMock, return_value=result):
        res = await tech_client.post("/api/v1/complaints/cmp-001/accept-reject", json={"action": "accept"})
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_reject_assignment(tech_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/{id}/accept-reject with action=reject."""
    result = {**SAMPLE_COMPLAINT, "assignmentStatus": "REJECTED"}
    with patch("app.features.complaints.service.accept_reject_complaint", new_callable=AsyncMock, return_value=result):
        res = await tech_client.post("/api/v1/complaints/cmp-001/accept-reject", json={"action": "reject", "rejectionReason": "Busy"})
    assert res.status_code == 200


# ── Assignment history ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_assignment_history(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints/{id}/assignment-history returns history."""
    history = {
        "data": [TIMELINE_ENTRY],
        "total": 1,
        "page": 1,
        "pageSize": 20,
        "totalPages": 1,
    }
    with patch("app.features.complaints.service.get_assignment_history", new_callable=AsyncMock, return_value=history):
        res = await sa_client.get("/api/v1/complaints/cmp-001/assignment-history")
    assert res.status_code == 200
    data = res.json()
    assert len(data.get("data", [])) == 1


# ── Workflow transitions ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_workflow_start_work(sa_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/{id}/workflow — start work transition."""
    result = {**SAMPLE_COMPLAINT, "status": "IN_PROGRESS", "startedAt": "2025-01-15T11:00:00Z"}
    with patch("app.features.complaints.service.process_workflow", new_callable=AsyncMock, return_value=result):
        res = await sa_client.post("/api/v1/complaints/cmp-001/workflow", json={"action": "start_work"})
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_workflow_complete_work(sa_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/{id}/workflow — complete work transition."""
    result = {**SAMPLE_COMPLAINT, "status": "WAITING_CLIENT_CONFIRMATION", "completedAt": "2025-01-15T14:00:00Z"}
    with patch("app.features.complaints.service.process_workflow", new_callable=AsyncMock, return_value=result):
        res = await sa_client.post("/api/v1/complaints/cmp-001/workflow", json={"action": "complete_work"})
    assert res.status_code == 200
    assert res.json()["status"] == "WAITING_CLIENT_CONFIRMATION"


@pytest.mark.asyncio
async def test_workflow_client_confirm(customer_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/{id}/workflow — client confirms work."""
    result = {**SAMPLE_COMPLAINT, "status": "CLIENT_CONFIRMED", "clientConfirmedAt": "2025-01-15T15:00:00Z"}
    with patch("app.features.complaints.service.process_workflow", new_callable=AsyncMock, return_value=result):
        res = await customer_client.post("/api/v1/complaints/cmp-001/workflow", json={"action": "client_confirm"})
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_workflow_close(sa_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/{id}/workflow — close complaint."""
    result = {**SAMPLE_COMPLAINT, "status": "CLOSED", "closedAt": "2025-01-15T16:00:00Z"}
    with patch("app.features.complaints.service.process_workflow", new_callable=AsyncMock, return_value=result):
        res = await sa_client.post("/api/v1/complaints/cmp-001/workflow", json={"action": "close"})
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"


@pytest.mark.asyncio
async def test_get_workflow_state(sa_client: AsyncClient, mock_db):
    """GET /api/v1/complaints/{id}/workflow returns current workflow state."""
    state = {
        "complaintId": "cmp-001",
        "status": "NEW",
        "allowedActions": ["assign_technician", "delete", "update_fields"],
    }
    with patch("app.features.complaints.service.get_workflow_state", new_callable=AsyncMock, return_value=state):
        res = await sa_client.get("/api/v1/complaints/cmp-001/workflow")
    assert res.status_code == 200
    assert "allowedActions" in res.json()


# ── Escalation check ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_escalation_check(sa_client: AsyncClient, mock_db):
    """POST /api/v1/complaints/escalation-check returns triggered escalations."""
    result = {"success": True, "triggered": [], "details": []}
    with patch("app.features.complaints.service.check_escalation", new_callable=AsyncMock, return_value=result):
        res = await sa_client.post("/api/v1/complaints/escalation-check", json={})
    assert res.status_code == 200
    assert res.json()["success"] is True


# ── My profile (customer) ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_my_profile_customer(customer_client: AsyncClient, mock_db):
    """GET /api/v1/complaints/my-profile returns customer profile."""
    profile = {
        "customer": {"id": TEST_USERS["customer"]["userId"], "name": "Customer User"},
        "buildings": [],
        "equipment": [],
    }
    with patch("app.features.complaints.service.get_customer_profile", new_callable=AsyncMock, return_value=profile):
        res = await customer_client.get("/api/v1/complaints/my-profile")
    assert res.status_code == 200
    assert "customer" in res.json()
    assert "buildings" in res.json()
    assert "equipment" in res.json()
