"""
Pydantic schemas for the Dashboard feature module.

MOHD.HMS ENTERPRISE
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class KpiResponse(BaseModel):
    """KPI metrics response."""
    totalEquipment: int = 0
    activeEquipment: int = 0
    openComplaints: int = 0
    inProgressComplaints: int = 0
    totalWorkOrders: int = 0
    pendingWorkOrders: int = 0
    completedWorkOrders: int = 0
    totalRevenue: float = 0
    pendingInvoices: int = 0
    overdueInvoices: int = 0
    pmCompliance: int = 0
    totalCustomers: int = 0
    totalEmployees: int = 0
    lowStockItems: int = 0
    accessLevel: str = ""


class RecentActivityResponse(BaseModel):
    """Recent activity response."""
    recentComplaints: list[dict[str, Any]] = []
    recentWorkOrders: list[dict[str, Any]] = []
    upcomingPm: list[dict[str, Any]] = []


class ChartDataResponse(BaseModel):
    """Chart data response."""
    monthlyRevenue: list[dict[str, Any]] = []
    complaintsByCategory: list[dict[str, Any]] = []
    complaintsByStatus: list[dict[str, Any]] = []
    pmCompliance: int = 0
    upcomingPmCounts: dict[str, int] = {}


class FullDashboardResponse(BaseModel):
    """Full combined dashboard response."""
    totalEquipment: int = 0
    activeEquipment: int = 0
    openComplaints: int = 0
    inProgressComplaints: int = 0
    totalWorkOrders: int = 0
    pendingWorkOrders: int = 0
    completedWorkOrders: int = 0
    totalRevenue: float = 0
    pendingInvoices: int = 0
    overdueInvoices: int = 0
    pmCompliance: int = 0
    totalCustomers: int = 0
    totalEmployees: int = 0
    lowStockItems: int = 0
    monthlyRevenue: list[dict[str, Any]] = []
    complaintsByCategory: list[dict[str, Any]] = []
    complaintsByStatus: list[dict[str, Any]] = []
    recentComplaints: list[dict[str, Any]] = []
    recentWorkOrders: list[dict[str, Any]] = []
    upcomingPm: list[dict[str, Any]] = []
