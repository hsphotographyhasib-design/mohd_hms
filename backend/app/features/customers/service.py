"""
Customer service — CRUD operations with RBAC scoping.

MOHD.HMS ENTERPRISE
"""

from __future__ import annotations

import uuid
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import count_records, delete_record, insert_record, query_table, update_record
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException, ValidationException
from app.core.logging import get_logger
from app.rbac.permissions import has_action_permission
from app.utils.helpers import generate_customer_number, sanitize_input, utcnow

log = get_logger(__name__)


async def list_customers(
    tenant_id: str,
    user: AuthUser,
    search: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> dict[str, Any]:
    """List customers with RBAC scoping and optional search.

    - admin/manager/supervisor/finance: see all customers in tenant
    - customer: see own profile only (returns single-item list or empty)
    - Other roles: denied
    """
    if not has_action_permission(user.role, "customer", "view"):
        raise ForbiddenException(
            message="You do not have permission to view customers",
            details={"user_role": user.role},
        )

    where: dict[str, Any] = {"tenantId": tenant_id}

    # Customer role: only see their own linked customer record
    if user.role == "customer":
        linked_customer = await _get_customer_by_user(tenant_id, user.userId)
        if linked_customer:
            where["id"] = linked_customer["id"]
        else:
            # No linked customer — return empty
            return {
                "data": [],
                "total": 0,
                "page": page,
                "pageSize": page_size,
                "totalPages": 0,
            }

    # Status filter
    if status:
        where["isActive"] = status.lower() == "active"

    # Search filter
    if search:
        search_term = sanitize_input(search)
        where["OR"] = [
            {"name": {"contains": search_term}},
            {"email": {"contains": search_term}},
            {"phone": {"contains": search_term}},
            {"companyName": {"contains": search_term}},
            {"customerNumber": {"contains": search_term}},
        ]

    offset = (page - 1) * page_size

    # Fetch data and count in parallel
    result = await query_table(
        "customer",
        select="id,tenantId,name,email,phone,address,companyName,customerNumber,building,floor,unit,photo,paymentTerms,pic,country,district,taxRate,isActive,createdAt,updatedAt",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
    )

    data = result.get("data", [])
    total_str = result.get("count", "0")
    try:
        total = int(total_str) if total_str not in ("*", None) else len(data)
    except (ValueError, TypeError):
        total = len(data)

    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


async def create_customer(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new customer with generated customerNumber.

    Validates unique email/phone within tenant.
    """
    if not has_action_permission(user.role, "customer", "create"):
        raise ForbiddenException(
            message="You do not have permission to create customers",
            details={"user_role": user.role},
        )

    name = data.get("name")
    if not name or not name.strip():
        raise ValidationException(message="Customer name is required")

    # Validate unique email
    email = data.get("email")
    if email:
        existing = await query_table(
            "customer",
            select="id",
            where={"tenantId": tenant_id, "email": email},
            limit=1,
        )
        if existing.get("data"):
            raise ConflictException(message="A customer with this email already exists")

    # Validate unique phone
    phone = data.get("phone")
    if phone:
        existing = await query_table(
            "customer",
            select="id",
            where={"tenantId": tenant_id, "phone": phone},
            limit=1,
        )
        if existing.get("data"):
            raise ConflictException(message="A customer with this phone number already exists")

    customer_number = generate_customer_number(tenant_id)
    now = utcnow().isoformat()

    record: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "name": sanitize_input(data.get("name", "")),
        "customerNumber": customer_number,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }

    # Copy optional fields
    for field in ("email", "phone", "address", "companyName", "paymentTerms",
                   "pic", "country", "district", "building", "floor", "unit",
                   "photo", "gpsLocation", "taxRate"):
        if data.get(field) is not None:
            record[field] = data[field]

    created = await insert_record("customer", record)
    log.info(f"Customer created: {created.get('id')} number={customer_number}")
    return created


async def get_customer(
    tenant_id: str,
    customer_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get a single customer by ID with RBAC check."""
    if not has_action_permission(user.role, "customer", "view"):
        raise ForbiddenException(
            message="You do not have permission to view customers",
            details={"user_role": user.role},
        )

    result = await query_table(
        "customer",
        select="id,tenantId,name,email,phone,address,companyName,customerNumber,building,floor,unit,photo,paymentTerms,pic,country,district,taxRate,isActive,createdAt,updatedAt",
        where={"id": customer_id, "tenantId": tenant_id},
        limit=1,
    )

    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Customer")

    # Customer role: can only view their own linked customer
    if user.role == "customer":
        linked = await _get_customer_by_user(tenant_id, user.userId)
        if not linked or linked["id"] != customer_id:
            raise ForbiddenException(message="You can only view your own customer profile")

    return data[0]


async def update_customer(
    tenant_id: str,
    customer_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update a customer's fields."""
    if not has_action_permission(user.role, "customer", "update"):
        raise ForbiddenException(
            message="You do not have permission to update customers",
            details={"user_role": user.role},
        )

    # Verify customer exists
    existing = await query_table(
        "customer",
        select="id",
        where={"id": customer_id, "tenantId": tenant_id},
        limit=1,
    )
    if not existing.get("data"):
        raise NotFoundException(resource="Customer")

    # Customer role: can only update own profile
    if user.role == "customer":
        linked = await _get_customer_by_user(tenant_id, user.userId)
        if not linked or linked["id"] != customer_id:
            raise ForbiddenException(message="You can only update your own customer profile")

    # Validate unique email if changing
    email = data.get("email")
    if email:
        email_check = await query_table(
            "customer",
            select="id",
            where={"tenantId": tenant_id, "email": email, "id": {"ne": customer_id}},
            limit=1,
        )
        if email_check.get("data"):
            raise ConflictException(message="A customer with this email already exists")

    # Validate unique phone if changing
    phone = data.get("phone")
    if phone:
        phone_check = await query_table(
            "customer",
            select="id",
            where={"tenantId": tenant_id, "phone": phone, "id": {"ne": customer_id}},
            limit=1,
        )
        if phone_check.get("data"):
            raise ConflictException(message="A customer with this phone number already exists")

    update_data: dict[str, Any] = {"updatedAt": utcnow().isoformat()}
    for field in ("name", "email", "phone", "address", "companyName", "paymentTerms",
                   "pic", "country", "district", "taxRate", "isActive"):
        if data.get(field) is not None:
            val = data[field]
            if isinstance(val, str):
                val = sanitize_input(val)
            update_data[field] = val

    updated = await update_record("customer", customer_id, update_data)
    log.info(f"Customer updated: {customer_id}")
    return updated


async def delete_customer(
    tenant_id: str,
    customer_id: str,
    user: AuthUser,
) -> None:
    """Delete a customer (admin/super_admin only)."""
    if not has_action_permission(user.role, "customer", "delete"):
        raise ForbiddenException(
            message="You do not have permission to delete customers",
            details={"user_role": user.role},
        )

    # Verify customer exists
    existing = await query_table(
        "customer",
        select="id",
        where={"id": customer_id, "tenantId": tenant_id},
        limit=1,
    )
    if not existing.get("data"):
        raise NotFoundException(resource="Customer")

    await delete_record("customer", customer_id)
    log.info(f"Customer deleted: {customer_id}")


async def get_self(
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any] | None:
    """Get the customer profile linked to the current user.

    Only for customer-role users. Looks up the Customer record
    matching the user's email or phone.
    """
    if user.role != "customer":
        raise ForbiddenException(message="This endpoint is for customer-role users only")

    linked = await _get_customer_by_user(tenant_id, user.userId)
    if not linked:
        return None

    # Fetch full customer record
    result = await query_table(
        "customer",
        select="id,tenantId,name,email,phone,address,companyName,customerNumber,building,floor,unit,photo,paymentTerms,pic,country,district,taxRate,isActive,createdAt,updatedAt",
        where={"id": linked["id"], "tenantId": tenant_id},
        limit=1,
    )
    data = result.get("data", [])
    return data[0] if data else None


# ── Internal helpers ──────────────────────────────────────────────────────────


async def _get_customer_by_user(
    tenant_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    """Find the Customer record linked to a user via email or phone.

    1. Look up the user's email and phone.
    2. Find a Customer matching either.
    """
    user_result = await query_table(
        "user",
        select="id,email,phone",
        where={"id": user_id},
        limit=1,
    )
    user_data = user_result.get("data", [])
    if not user_data:
        return None

    user_record = user_data[0]
    or_conds: list[dict[str, Any]] = []
    if user_record.get("email"):
        or_conds.append({"email": user_record["email"]})
    if user_record.get("phone"):
        or_conds.append({"phone": user_record["phone"]})

    if not or_conds:
        return None

    cust_result = await query_table(
        "customer",
        select="id",
        where={"tenantId": tenant_id, "OR": or_conds},
        limit=1,
    )
    cust_data = cust_result.get("data", [])
    return cust_data[0] if cust_data else None
