"""
Main API router — aggregates all feature routers.

MOHD.HMS ENTERPRISE

All feature routers are mounted under /api/v1.
Health check endpoints are mounted at the root level (outside /api/v1).
"""

from __future__ import annotations

from fastapi import APIRouter

# ── Main API router ───────────────────────────────────────────────────────────

api_router = APIRouter(prefix="/api/v1")

# ── Feature routers ────────────────────────────────────────────────────────
#
# As each feature module is built, uncomment and add its router here.
# Each feature module should expose an `api_router: APIRouter`.

from app.features.auth.router import router as auth_router
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])

# ── Users (admin user management) ─────────────────────────────────────────

from app.features.users.router import router as users_router
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(users_router, prefix="/admin/users", tags=["admin-users"])

# ── Employees ─────────────────────────────────────────────────────────────

from app.features.employees.router import router as employees_router
from app.features.employees.router import hr_router as hr_employees_router
api_router.include_router(employees_router, prefix="/employees", tags=["employees"])
api_router.include_router(hr_employees_router, prefix="/hr/employees", tags=["hr-employees"])

# ── Technicians ────────────────────────────────────────────────────────────

from app.features.technicians.router import router as technicians_router
api_router.include_router(technicians_router, prefix="/technicians", tags=["technicians"])

# ── Departments ────────────────────────────────────────────────────────────

from app.features.departments.router import router as departments_router
from app.features.departments.router import hr_router as hr_departments_router
api_router.include_router(departments_router, prefix="/departments", tags=["departments"])
api_router.include_router(hr_departments_router, prefix="/hr/departments", tags=["hr-departments"])

# ── Complaints ────────────────────────────────────────────────────────────

from app.features.complaints.router import router as complaints_router
api_router.include_router(complaints_router, prefix="/complaints", tags=["complaints"])

# ── Work Orders ─────────────────────────────────────────────────────────────

from app.features.work_orders.router import router as work_orders_router
api_router.include_router(work_orders_router, prefix="/work-orders", tags=["work-orders"])

# ── Equipment ───────────────────────────────────────────────────────────────

from app.features.equipment.router import router as equipment_router
api_router.include_router(equipment_router, prefix="/equipment", tags=["equipment"])

# ── Preventive Maintenance ─────────────────────────────────────────────────

from app.features.pm.router import router as pm_router
api_router.include_router(pm_router, prefix="/pm", tags=["pm"])

# ── Quotations ───────────────────────────────────────────────────────────

from app.features.quotations.router import router as quotations_router
api_router.include_router(quotations_router, prefix="/quotations", tags=["quotations"])

# ── Invoices ─────────────────────────────────────────────────────────────

from app.features.invoices.router import router as invoices_router
api_router.include_router(invoices_router, prefix="/invoices", tags=["invoices"])

# ── Payments ──────────────────────────────────────────────────────────────

from app.features.payments.router import router as payments_router
from app.features.payments.router import invoice_payments_router, verification_router
api_router.include_router(invoice_payments_router, tags=["invoice-payments"])
api_router.include_router(verification_router, tags=["payment-verification"])

# ── Customers ─────────────────────────────────────────────────────────────

from app.features.customers.router import router as customers_router
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])

# ── Dashboard ─────────────────────────────────────────────────────────────

from app.features.dashboard.router import router as dashboard_router
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])

# ── Notifications ──────────────────────────────────────────────────────────

from app.features.notifications.router import router as notifications_router
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])

# ── Presence ───────────────────────────────────────────────────────────────

from app.features.presence.router import router as presence_router
api_router.include_router(presence_router, prefix="/presence", tags=["presence"])

# ── Inventory ──────────────────────────────────────────────────────────────

from app.features.inventory.router import router as inventory_router
api_router.include_router(inventory_router, prefix="/inventory", tags=["inventory"])

# ── Purchases ─────────────────────────────────────────────────────────────

from app.features.purchases.router import router as purchases_router
api_router.include_router(purchases_router, prefix="/purchases", tags=["purchases"])

# ── Finance ────────────────────────────────────────────────────────────────

from app.features.finance.router import router as finance_router
api_router.include_router(finance_router, prefix="/finance", tags=["finance"])

# ── Vehicles ───────────────────────────────────────────────────────────────

from app.features.vehicles.router import router as vehicles_router
api_router.include_router(vehicles_router, prefix="/vehicles", tags=["vehicles"])

# ── HR Module ────────────────────────────────────────────────────────────────

from app.features.hr.router import router as hr_router
api_router.include_router(hr_router, prefix="/hr", tags=["hr"])
