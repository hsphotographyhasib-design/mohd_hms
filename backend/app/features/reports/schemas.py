"""
Reports feature schemas.

MOHD.HMS ENTERPRISE
"""

from typing import Any

from pydantic import BaseModel, Field


class ReportFilters(BaseModel):
    """Date range and optional filters for reports."""
    startDate: str | None = Field(default=None, description="ISO date string, e.g. 2025-01-01")
    endDate: str | None = Field(default=None, description="ISO date string, e.g. 2025-12-31")


class ReportSummary(BaseModel):
    """Summary statistics for a single entity type."""
    total: int = 0
    byStatus: dict[str, int] = Field(default_factory=dict)


class ReportsResponse(BaseModel):
    """Full reports response with all summary statistics."""
    complaints: ReportSummary = Field(default_factory=ReportSummary)
    workOrders: ReportSummary = Field(default_factory=ReportSummary)
    invoices: ReportSummary = Field(default_factory=ReportSummary)
    equipment: ReportSummary = Field(default_factory=ReportSummary)
    dateRange: dict[str, str | None] = Field(default_factory=dict)
