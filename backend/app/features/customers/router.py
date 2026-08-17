"""
Customers feature router.

MOHD.HMS ENTERPRISE

6 endpoints:
  GET    /api/v1/customers          — List customers (RBAC scoped)
  POST   /api/v1/customers          — Create customer
  GET    /api/v1/customers/self     — Get own customer profile (customer role)
  GET    /api/v1/customers/{id}     — Get single customer
  PUT    /api/v1/customers/{id}     — Update customer
  DELETE /api/v1/customers/{id}     — Delete customer (admin only)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role
from app.features.customers import service
from app.features.customers.schemas import CustomerCreate, CustomerUpdate

router = APIRouter(tags=["customers"])


@router.get("/self")
async def get_self(
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/customers/self — Get own customer profile."""
    result = await service.get_self(user.tenantId, user)
    if not result:
        return {"success": True, "data": None}
    return {"success": True, "data": result}


@router.get("")
async def list_customers(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/customers — List customers."""
    result = await service.list_customers(
        tenant_id=user.tenantId,
        user=user,
        search=search,
        status=status,
        page=page,
        page_size=pageSize,
    )
    return {"success": True, **result}


@router.post("")
async def create_customer(
    body: CustomerCreate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/customers — Create customer."""
    created = await service.create_customer(
        tenant_id=user.tenantId,
        user=user,
        data=body.model_dump(exclude_unset=True),
    )
    return {"success": True, "data": created}


@router.get("/{customer_id}")
async def get_customer(
    customer_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """GET /api/v1/customers/{id} — Get single customer."""
    result = await service.get_customer(user.tenantId, customer_id, user)
    return {"success": True, "data": result}


@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    body: CustomerUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/customers/{id} — Update customer."""
    updated = await service.update_customer(
        tenant_id=user.tenantId,
        customer_id=customer_id,
        user=user,
        data=body.model_dump(exclude_unset=True),
    )
    return {"success": True, "data": updated}


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
):
    """DELETE /api/v1/customers/{id} — Delete customer (admin only)."""
    await service.delete_customer(user.tenantId, customer_id, user)
    return {"success": True, "data": None}
