"""
Data Scope Builder

MOHD.HMS ENTERPRISE

Returns PostgREST where-clause dicts for each entity,
scoped to the authenticated user's role.

This is the backend equivalent of the frontend's
`buildDataScope()` in `src/core/permissions/rbac/data-scope.ts`.

The returned filters can be passed directly to `where_to_postgrest_filters()`
from `app.core.database`.

Security guarantee: The backend NEVER returns records the user is not
authorised to access, regardless of URL manipulation.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger

log = get_logger(__name__)

# Sentinel: a filter that will never match any record
NEVER_MATCH: dict[str, Any] = {"id": "__NEVER_MATCH__"}


# ── Core builder ───────────────────────────────────────────────────────

def build_data_scope(
    role: str,
    user_id: str,
    tenant_id: str,
    entity: str,
    customer_id: str | None = None,
    department_id: str | None = None,
    department_technician_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Build a PostgREST where-clause dict for the given role+entity.

    Args:
        role: User's role (must be normalized/lowercase).
        user_id: User's ID.
        tenant_id: User's tenant ID.
        entity: Entity name (complaint, work_order, invoice, quotation,
                  equipment, customer).
        customer_id: Linked customer ID (for customer role).
        department_id: User's department ID (for manager/supervisor).
        department_technician_ids: Technician IDs in user's department.

    Returns:
        A dict suitable for `where_to_postgrest_filters()`. If the role
        has no access, returns NEVER_MATCH.
    """
    # Always enforce tenant isolation
    tenant_filter: dict[str, Any] = {"tenantId": tenant_id}

    # ─── super_admin: full tenant access ────────────────────────────
    if role == "super_admin":
        return tenant_filter

    # ─── admin: full tenant access ──────────────────────────────────
    if role == "admin":
        return tenant_filter

    # ─── Entity-specific scoping by role ─────────────────────────────
    match (role, entity):
        # ── Manager ──────────────────────────────────────────────
        case ("manager", "complaint"):
            if department_id and department_technician_ids:
                return {
                    **tenant_filter,
                    "OR": [
                        {"supervisorId": user_id},
                        {"assignedToId": {"in": department_technician_ids}},
                    ],
                }
            return {**tenant_filter, "supervisorId": user_id}

        case ("manager", "work_order"):
            if department_id and department_technician_ids:
                return {
                    **tenant_filter,
                    "OR": [
                        {"complaint.supervisorId": user_id},
                        {"assignedToId": {"in": department_technician_ids}},
                    ],
                }
            return {**tenant_filter, "complaint.supervisorId": user_id}

        case ("manager", "invoice"):
            return NEVER_MATCH  # No invoice access for managers

        case ("manager", "quotation"):
            return NEVER_MATCH  # No quotation access for managers

        case ("manager", _):
            return tenant_filter

        # ── Supervisor ────────────────────────────────────────────
        case ("supervisor", "complaint"):
            return {**tenant_filter, "supervisorId": user_id}

        case ("supervisor", "work_order"):
            if department_id and department_technician_ids:
                return {
                    **tenant_filter,
                    "OR": [
                        {"complaint.supervisorId": user_id},
                        {"assignedToId": {"in": department_technician_ids}},
                    ],
                }
            return {**tenant_filter, "complaint.supervisorId": user_id}

        case ("supervisor", "quotation"):
            return tenant_filter  # Full tenant for quotations

        case ("supervisor", "invoice"):
            return NEVER_MATCH  # No invoice access for supervisors

        case ("supervisor", _):
            return tenant_filter

        # ── Technician ────────────────────────────────────────────
        case ("technician", "complaint"):
            return {**tenant_filter, "assignedToId": user_id}

        case ("technician", "work_order"):
            return {**tenant_filter, "assignedToId": user_id}

        case ("technician", "invoice"):
            return NEVER_MATCH

        case ("technician", "quotation"):
            return NEVER_MATCH

        case ("technician", "customer"):
            return NEVER_MATCH

        case ("technician", _):
            return tenant_filter

        # ── Finance ──────────────────────────────────────────────
        case ("finance", "invoice"):
            return tenant_filter  # Full tenant invoice access

        case ("finance", "complaint"):
            return tenant_filter  # Finance can view complaints for invoicing

        case ("finance", "customer"):
            return tenant_filter

        case ("finance", _):
            return NEVER_MATCH

        # ── HR ───────────────────────────────────────────────────
        case ("hr", _):
            # HR has no access to operational entities
            if entity in ("complaint", "work_order", "invoice", "quotation", "equipment", "customer"):
                return NEVER_MATCH
            return tenant_filter

        # ── Customer ─────────────────────────────────────────────
        case ("customer", "complaint"):
            if customer_id:
                return {**tenant_filter, "customerId": customer_id}
            return NEVER_MATCH

        case ("customer", "work_order"):
            if customer_id:
                return {**tenant_filter, "complaint.customerId": customer_id}
            return NEVER_MATCH

        case ("customer", "invoice"):
            if customer_id:
                return {**tenant_filter, "customerId": customer_id}
            return NEVER_MATCH

        case ("customer", "quotation"):
            if customer_id:
                return {**tenant_filter, "customerId": customer_id}
            return NEVER_MATCH

        case ("customer", "equipment"):
            if customer_id:
                return {**tenant_filter, "customerId": customer_id}
            return NEVER_MATCH

        case ("customer", "customer"):
            return NEVER_MATCH  # Can't list all customers

        case ("customer", _):
            return tenant_filter

        # ── vendor / guest / unknown: DENIED ─────────────────────
        case _:
            return NEVER_MATCH
