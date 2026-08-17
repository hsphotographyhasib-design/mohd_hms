"""
Pydantic schemas for the Finance feature module.

MOHD.HMS ENTERPRISE

Finance is a read-only metrics endpoint — no create/update schemas needed.
"""

from typing import Any

from pydantic import BaseModel


class FinanceMetricsResponse(BaseModel):
    """Response model for finance metrics."""
    totalRevenue: float = 0
    pendingRevenue: float = 0
    outstandingAmount: float = 0
    collectionRate: float = 0
    totalExpenses: float = 0
    monthlyRevenue: list[dict[str, Any]] = []
    invoiceStatusCounts: list[dict[str, Any]] = []
