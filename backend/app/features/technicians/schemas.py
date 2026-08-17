"""
Technician schemas.

MOHD.HMS ENTERPRISE

Technicians = users with role IN (technician, supervisor).
This is the SINGLE source of technician data for the entire system.

Response formats:
  - List: { stats: {...}, technicians: [...], pagination: {...} }
  - Detail: flat object with activeComplaints, activeWorkOrders, performance, etc.
  - Timeline: { technicianId, technicianName, date, attendance, timeline, summary }
  - Performance: { technicianId, technicianName, completedJobs, pendingJobs, ... }
"""

from __future__ import annotations

from pydantic import BaseModel, Field


TECH_ROLES = ["technician", "supervisor"]
ACTIVE_COMPLAINT_STATUSES = ["ASSIGNED", "ACCEPTED", "WORK_ORDER_CREATED", "IN_PROGRESS"]
ACTIVE_WO_STATUSES = ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS"]
CLOSED_STATUSES = ["CLOSED", "PAID"]
MAX_ACTIVE_JOBS = 5


class TechnicianListParams(BaseModel):
    """Query parameters for listing technicians."""

    search: str = Field(default="", description="Search by name, email, phone, employee number")
    department: str = Field(default="", description="Filter by department ID")
    status: str = Field(default="", description="Filter by availability status")
    skill: str = Field(default="", description="Filter by skill/category")
    sortBy: str = Field(default="name", description="Sort by: name, availability, workload, recently_active")
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=20, ge=1, le=50)
