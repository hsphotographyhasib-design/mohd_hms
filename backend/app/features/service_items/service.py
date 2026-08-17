"""
Service Items business logic.

MOHD.HMS ENTERPRISE

CRUD for ServiceItem, ServiceCategory, ServicePackage, LabourRate, PriceBook,
ServiceItemMaterial, ServiceItemEquipment, ServiceChecklistItem, ServicePackageItem.
"""

from typing import Any

from app.core.database import (
    MODEL_TO_TABLE,
    delete_record,
    insert_record,
    query_table,
    resolve_includes,
    update_record,
)
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logging import get_logger

log = get_logger(__name__)

# Table name constants
SERVICE_ITEM_TABLE = MODEL_TO_TABLE.get("serviceItem", "ServiceItem")
CATEGORY_TABLE = MODEL_TO_TABLE.get("serviceCategory", "ServiceCategory")
PACKAGE_TABLE = MODEL_TO_TABLE.get("servicePackage", "ServicePackage")
PACKAGE_ITEM_TABLE = MODEL_TO_TABLE.get("servicePackageItem", "ServicePackageItem")
LABOUR_RATE_TABLE = MODEL_TO_TABLE.get("labourRate", "LabourRate")
PRICE_BOOK_TABLE = MODEL_TO_TABLE.get("priceBook", "PriceBook")
MATERIAL_TABLE = MODEL_TO_TABLE.get("serviceItemMaterial", "ServiceItemMaterial")
EQUIPMENT_TABLE = MODEL_TO_TABLE.get("serviceItemEquipment", "ServiceItemEquipment")
CHECKLIST_TABLE = MODEL_TO_TABLE.get("serviceChecklistItem", "ServiceChecklistItem")

# Fallback table name mapping for ServiceChecklistItem
CHECKLIST_TABLE = "ServiceChecklistItem"


# ==========================================================================
# Generic helpers
# ==========================================================================


async def _generic_list(
    table: str,
    tenant_id: str,
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    status: str | None = None,
    order: str = "createdAt.desc",
    extra_where: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Paginated list with optional search and status filter."""
    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"name": {"contains": search}},
            {"description": {"contains": search}},
        ]
    if status is not None:
        where["isActive"] = status in ("true", "True", "1", True)
    if extra_where:
        where.update(extra_where)

    offset = (page - 1) * page_size

    result = await query_table(
        table,
        select="*",
        where=where or None,
        order=order,
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    rows = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(rows)

    return {
        "success": True,
        "data": rows,
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": max(1, (total + page_size - 1) // page_size),
        },
    }


async def _generic_get(table: str, record_id: str, tenant_id: str) -> dict[str, Any]:
    """Fetch a single record or raise 404."""
    result = await query_table(table, select="*", where={"id": record_id}, tenant_id=tenant_id)
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource=table)
    return rows[0]


async def _generic_create(table: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Insert a record with tenant_id."""
    record = {"tenantId": tenant_id, **data}
    return await insert_record(table, record)


async def _generic_update(table: str, record_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Verify existence then update."""
    await _generic_get(table, record_id, tenant_id)
    return await update_record(table, record_id, data)


async def _generic_delete(table: str, record_id: str, tenant_id: str) -> dict[str, Any]:
    """Verify existence then delete."""
    await _generic_get(table, record_id, tenant_id)
    await delete_record(table, record_id)
    return {"success": True, "message": "Deleted successfully"}


# ==========================================================================
# Service Items
# ==========================================================================


async def list_service_items(
    tenant_id: str,
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    status: str | None = None,
    category_id: str | None = None,
) -> dict[str, Any]:
    """List service items with optional category filter."""
    extra = {}
    if category_id:
        extra["categoryId"] = category_id
    return await _generic_list(SERVICE_ITEM_TABLE, tenant_id, page, page_size, search, status, extra_where=extra or None)


async def create_service_item(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a service item."""
    if not data.get("name"):
        raise ValidationException(message="Service item name is required")
    return await _generic_create(SERVICE_ITEM_TABLE, tenant_id, data)


async def get_service_item(item_id: str, tenant_id: str) -> dict[str, Any]:
    """Get a service item by ID."""
    return await _generic_get(SERVICE_ITEM_TABLE, item_id, tenant_id)


async def update_service_item(item_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a service item."""
    return await _generic_update(SERVICE_ITEM_TABLE, item_id, tenant_id, data)


async def delete_service_item(item_id: str, tenant_id: str) -> dict[str, Any]:
    """Delete a service item."""
    return await _generic_delete(SERVICE_ITEM_TABLE, item_id, tenant_id)


# ==========================================================================
# Service Item Checklist
# ==========================================================================


async def list_checklist(item_id: str, tenant_id: str) -> dict[str, Any]:
    """List checklist items for a service item."""
    await _generic_get(SERVICE_ITEM_TABLE, item_id, tenant_id)
    result = await query_table(
        CHECKLIST_TABLE,
        select="*",
        where={"serviceItemId": item_id},
        order="sortOrder.asc",
        tenant_id=tenant_id,
    )
    return {"success": True, "data": result.get("data", [])}


async def add_checklist_item(item_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Add a checklist item to a service item."""
    await _generic_get(SERVICE_ITEM_TABLE, item_id, tenant_id)
    if not data.get("description"):
        raise ValidationException(message="Checklist item description is required")
    record = {"tenantId": tenant_id, "serviceItemId": item_id, **data}
    return await insert_record(CHECKLIST_TABLE, record)


# ==========================================================================
# Service Item Materials
# ==========================================================================


async def list_materials(item_id: str, tenant_id: str) -> dict[str, Any]:
    """List materials for a service item."""
    await _generic_get(SERVICE_ITEM_TABLE, item_id, tenant_id)
    result = await query_table(
        MATERIAL_TABLE,
        select="*",
        where={"serviceItemId": item_id},
        order="createdAt.desc",
        tenant_id=tenant_id,
    )
    return {"success": True, "data": result.get("data", [])}


async def add_material(item_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Add a material to a service item."""
    await _generic_get(SERVICE_ITEM_TABLE, item_id, tenant_id)
    if not data.get("materialName"):
        raise ValidationException(message="Material name is required")
    record = {"tenantId": tenant_id, "serviceItemId": item_id, **data}
    return await insert_record(MATERIAL_TABLE, record)


# ==========================================================================
# Service Categories
# ==========================================================================


async def list_categories(
    tenant_id: str,
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    status: str | None = None,
) -> dict[str, Any]:
    """List service categories."""
    return await _generic_list(CATEGORY_TABLE, tenant_id, page, page_size, search, status)


async def create_category(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a service category."""
    if not data.get("name"):
        raise ValidationException(message="Category name is required")
    return await _generic_create(CATEGORY_TABLE, tenant_id, data)


async def get_category(category_id: str, tenant_id: str) -> dict[str, Any]:
    """Get a service category by ID."""
    return await _generic_get(CATEGORY_TABLE, category_id, tenant_id)


async def update_category(category_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a service category."""
    return await _generic_update(CATEGORY_TABLE, category_id, tenant_id, data)


async def delete_category(category_id: str, tenant_id: str) -> dict[str, Any]:
    """Delete a service category."""
    return await _generic_delete(CATEGORY_TABLE, category_id, tenant_id)


# ==========================================================================
# Service Packages
# ==========================================================================


async def list_packages(
    tenant_id: str,
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    status: str | None = None,
) -> dict[str, Any]:
    """List service packages."""
    return await _generic_list(PACKAGE_TABLE, tenant_id, page, page_size, search, status)


async def create_package(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a service package with optional items."""
    if not data.get("name"):
        raise ValidationException(message="Package name is required")

    items = data.pop("items", None)
    pkg = await _generic_create(PACKAGE_TABLE, tenant_id, data)

    # Create package items if provided
    if items:
        for item in items:
            await insert_record(PACKAGE_ITEM_TABLE, {
                "tenantId": tenant_id,
                "servicePackageId": pkg["id"],
                "serviceItemId": item.get("serviceItemId"),
                "quantity": item.get("quantity", 1),
            })

    return pkg


async def get_package(package_id: str, tenant_id: str) -> dict[str, Any]:
    """Get a service package by ID with its items."""
    result = await query_table(
        PACKAGE_TABLE,
        select="*",
        where={"id": package_id},
        tenant_id=tenant_id,
    )
    rows = await resolve_includes(result.get("data", []), "*,items(*)")
    if not rows:
        raise NotFoundException(resource="ServicePackage")
    return rows[0]


async def update_package(package_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a service package."""
    return await _generic_update(PACKAGE_TABLE, package_id, tenant_id, data)


async def delete_package(package_id: str, tenant_id: str) -> dict[str, Any]:
    """Delete a service package and its items."""
    await _generic_get(PACKAGE_TABLE, package_id, tenant_id)
    # Delete package items first
    existing_items = await query_table(
        PACKAGE_ITEM_TABLE,
        select="id",
        where={"servicePackageId": package_id},
        tenant_id=tenant_id,
    )
    for item in existing_items.get("data", []):
        await delete_record(PACKAGE_ITEM_TABLE, item["id"])
    await delete_record(PACKAGE_TABLE, package_id)
    return {"success": True, "message": "Package deleted successfully"}


# ==========================================================================
# Labour Rates
# ==========================================================================


async def list_labour_rates(
    tenant_id: str,
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    status: str | None = None,
) -> dict[str, Any]:
    """List labour rates."""
    return await _generic_list(LABOUR_RATE_TABLE, tenant_id, page, page_size, search, status)


async def create_labour_rate(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a labour rate."""
    if not data.get("name"):
        raise ValidationException(message="Labour rate name is required")
    if not data.get("ratePerHour"):
        raise ValidationException(message="Rate per hour is required")
    return await _generic_create(LABOUR_RATE_TABLE, tenant_id, data)


async def get_labour_rate(rate_id: str, tenant_id: str) -> dict[str, Any]:
    """Get a labour rate by ID."""
    return await _generic_get(LABOUR_RATE_TABLE, rate_id, tenant_id)


async def update_labour_rate(rate_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a labour rate."""
    return await _generic_update(LABOUR_RATE_TABLE, rate_id, tenant_id, data)


async def delete_labour_rate(rate_id: str, tenant_id: str) -> dict[str, Any]:
    """Delete a labour rate."""
    return await _generic_delete(LABOUR_RATE_TABLE, rate_id, tenant_id)


# ==========================================================================
# Price Book
# ==========================================================================


async def list_price_books(
    tenant_id: str,
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    status: str | None = None,
) -> dict[str, Any]:
    """List price books."""
    return await _generic_list(PRICE_BOOK_TABLE, tenant_id, page, page_size, search, status)


async def create_price_book(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a price book."""
    if not data.get("name"):
        raise ValidationException(message="Price book name is required")
    return await _generic_create(PRICE_BOOK_TABLE, tenant_id, data)


async def get_price_book(book_id: str, tenant_id: str) -> dict[str, Any]:
    """Get a price book by ID."""
    return await _generic_get(PRICE_BOOK_TABLE, book_id, tenant_id)


async def update_price_book(book_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a price book."""
    return await _generic_update(PRICE_BOOK_TABLE, book_id, tenant_id, data)


async def delete_price_book(book_id: str, tenant_id: str) -> dict[str, Any]:
    """Delete a price book."""
    return await _generic_delete(PRICE_BOOK_TABLE, book_id, tenant_id)
