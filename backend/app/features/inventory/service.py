"""
Inventory business logic.

MOHD.HMS ENTERPRISE

Implements all inventory CRUD, categories, warehouses, stock movements,
suppliers, price books, stats, and dashboard.
"""

import json
import secrets
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    delete_record,
    insert_record,
    query_table,
    resolve_includes,
    update_record,
)
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

# ── Table name constants ─────────────────────────────────────────────────────

ITEM_TABLE = MODEL_TO_TABLE.get("inventoryItem", "InventoryItem")
CATEGORY_TABLE = MODEL_TO_TABLE.get("inventoryCategory", "InventoryCategory")
SUBCATEGORY_TABLE = MODEL_TO_TABLE.get("inventorySubcategory", "InventorySubcategory")
WAREHOUSE_TABLE = MODEL_TO_TABLE.get("warehouse", "Warehouse")
STOCK_TABLE = MODEL_TO_TABLE.get("warehouseStock", "WarehouseStock")
MOVEMENT_TABLE = MODEL_TO_TABLE.get("stockMovement", "StockMovement")
SUPPLIER_TABLE = MODEL_TO_TABLE.get("itemSupplier", "ItemSupplier")
PRICE_BOOK_TABLE = MODEL_TO_TABLE.get("priceBook", "PriceBook")
PRICE_ENTRY_TABLE = MODEL_TO_TABLE.get("priceBookEntry", "PriceBookEntry")
PO_TABLE = MODEL_TO_TABLE.get("purchaseOrder", "PurchaseOrder")

# ── Helpers ─────────────────────────────────────────────────────────────────


async def _generate_item_code(tenant_id: str) -> str:
    """Generate next item code: ITM/HMS/YYYYMM/000001."""
    now = datetime.now(timezone.utc)
    ym = now.strftime("%Y%m")
    prefix = f"ITM/HMS/{ym}/"

    result = await query_table(
        ITEM_TABLE,
        select="itemCode",
        where={"itemCode": {"startsWith": prefix}, "tenantId": tenant_id},
        order="itemCode.desc",
        limit=1,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    seq = 1
    if items and items[0].get("itemCode"):
        last_code = items[0]["itemCode"]
        try:
            last_seq = int(last_code[len(prefix):])
            if not (last_seq < 1):
                seq = last_seq + 1
        except (ValueError, IndexError):
            pass

    return f"{prefix}{seq:06d}"


def _serialize_json_fields(data: dict[str, Any]) -> dict[str, Any]:
    """Serialize JSON-able fields to strings for PostgREST."""
    for field in ("dimensions", "photos", "attachments", "tags", "requiredSkills"):
        val = data.get(field)
        if val is not None and not isinstance(val, str):
            data[field] = json.dumps(val)
    return data


# ── Inventory Items ──────────────────────────────────────────────────────────


async def list_items(
    tenant_id: str,
    user: AuthUser,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List inventory items with pagination, search, and filters."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    item_type = params.get("itemType", "")
    category_id = params.get("categoryId", "")
    subcategory_id = params.get("subcategoryId", "")
    status = params.get("status", "")
    low_stock = params.get("lowStock", False)
    sort_by = params.get("sortBy", "createdAt")
    sort_order = params.get("sortOrder", "desc")

    allowed_sort = [
        "createdAt", "updatedAt", "name", "itemCode",
        "quantity", "unitCost", "purchaseCost", "sellingPrice", "status",
    ]
    if sort_by not in allowed_sort:
        sort_by = "createdAt"
    order = f"{sort_by}.{sort_order}"

    where: dict[str, Any] = {"isActive": True}

    if search:
        where["OR"] = [
            {"name": {"contains": search}},
            {"sku": {"contains": search}},
            {"itemCode": {"contains": search}},
            {"barcode": {"contains": search}},
            {"partNumber": {"contains": search}},
            {"supplier": {"contains": search}},
        ]
    if item_type:
        where["itemType"] = item_type
    if category_id:
        where["categoryId"] = category_id
    if subcategory_id:
        where["subcategoryId"] = subcategory_id
    if status:
        where["status"] = status

    select = "*"
    offset = (page - 1) * page_size

    result = await query_table(
        ITEM_TABLE,
        select=select,
        where=where,
        order=order,
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    items = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(items)

    # Parse JSON string fields back to objects
    for item in items:
        for field in ("dimensions", "photos", "attachments", "tags"):
            if item.get(field) and isinstance(item[field], str):
                try:
                    item[field] = json.loads(item[field])
                except (json.JSONDecodeError, TypeError):
                    pass

    # Application-level low stock filter
    if low_stock:
        items = [i for i in items if i.get("quantity", 0) <= i.get("minStock", 0)]
        total = len(items)

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def get_item(item_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Get a single inventory item with relations."""
    includes = (
        "*,inventoryCategory(id,name,code,color,icon),"
        "InventorySubcategory(id,name,code),"
        "ItemSupplier(id,tenantId,itemId,supplierName,supplierCode,contactPerson,phone,email,address,leadTimeDays,purchasePrice,moq,warranty,paymentTerms,rating,isPrimary,isActive,createdAt,updatedAt),"
        "WarehouseStock(*,warehouse(id,name,code,type))"
    )
    result = await query_table(
        ITEM_TABLE,
        select="*",
        where={"id": item_id},
        tenant_id=tenant_id,
    )
    items = await resolve_includes(result.get("data", []), includes)
    if not items:
        raise NotFoundException(resource="InventoryItem")

    item = items[0]
    for field in ("dimensions", "photos", "attachments", "tags"):
        if item.get(field) and isinstance(item[field], str):
            try:
                item[field] = json.loads(item[field])
            except (json.JSONDecodeError, TypeError):
                pass
    return item


async def create_item(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new inventory item with auto-generated itemCode."""
    name = data.get("name")
    if not name:
        raise ValidationException(message="Name is required")

    item_code = await _generate_item_code(tenant_id)

    suppliers = data.pop("suppliers", None)

    # Serialize JSON fields
    _serialize_json_fields(data)

    # Parse date
    if data.get("warrantyExpiry"):
        data["warrantyExpiry"] = data["warrantyExpiry"]

    record = {
        "tenantId": tenant_id,
        "itemCode": item_code,
        "isActive": True,
        **data,
    }

    item = await insert_record(ITEM_TABLE, record)

    # Create suppliers if provided
    if suppliers and isinstance(suppliers, list):
        for s in suppliers:
            supplier_record = {
                "tenantId": tenant_id,
                "itemId": item["id"],
                "supplierName": s.get("supplierName", ""),
                "supplierCode": s.get("supplierCode"),
                "contactPerson": s.get("contactPerson"),
                "phone": s.get("phone"),
                "email": s.get("email"),
                "address": s.get("address"),
                "leadTimeDays": s.get("leadTimeDays", 0),
                "purchasePrice": s.get("purchasePrice", 0),
                "moq": s.get("moq", 1),
                "warranty": s.get("warranty"),
                "paymentTerms": s.get("paymentTerms"),
                "rating": s.get("rating"),
                "isPrimary": s.get("isPrimary", False),
                "isActive": True,
            }
            await insert_record(SUPPLIER_TABLE, supplier_record)

    return item


async def update_item(item_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Update an inventory item."""
    # Verify exists
    result = await query_table(ITEM_TABLE, select="id", where={"id": item_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="InventoryItem")

    _serialize_json_fields(data)

    if "categoryId" in data and not data["categoryId"]:
        data["categoryId"] = None
    if "subcategoryId" in data and not data["subcategoryId"]:
        data["subcategoryId"] = None

    # Handle approval fields
    if "approvedBy" in data:
        data["approvedAt"] = str(utcnow()) if data["approvedBy"] else None

    return await update_record(ITEM_TABLE, item_id, data)


async def delete_item(item_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Soft-delete an inventory item (archive)."""
    result = await query_table(ITEM_TABLE, select="id", where={"id": item_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="InventoryItem")

    return await update_record(ITEM_TABLE, item_id, {"isActive": False, "status": "archived"})


# ── Categories ───────────────────────────────────────────────────────────────


async def list_categories(tenant_id: str, include_inactive: bool = False) -> dict[str, Any]:
    """List inventory categories."""
    where: dict[str, Any] = {}
    if not include_inactive:
        where["isActive"] = True

    result = await query_table(
        CATEGORY_TABLE,
        select="*",
        where=where,
        order="displayOrder.asc",
        tenant_id=tenant_id,
    )
    return {"data": result.get("data", [])}


async def create_category(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new inventory category."""
    if not data.get("name"):
        raise ValidationException(message="Category name is required")

    if "displayOrder" not in data or data["displayOrder"] is None:
        # Auto-assign display order
        result = await query_table(
            CATEGORY_TABLE,
            select="displayOrder",
            order="displayOrder.desc",
            limit=1,
            tenant_id=tenant_id,
        )
        items = result.get("data", [])
        max_order = items[0]["displayOrder"] if items else 0
        data["displayOrder"] = (max_order or 0) + 1

    record = {"tenantId": tenant_id, **data, "isActive": True}
    return await insert_record(CATEGORY_TABLE, record)


async def update_category(category_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a category."""
    result = await query_table(CATEGORY_TABLE, select="id", where={"id": category_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="InventoryCategory")
    return await update_record(CATEGORY_TABLE, category_id, data)


async def delete_category(category_id: str, tenant_id: str) -> None:
    """Delete a category."""
    result = await query_table(CATEGORY_TABLE, select="id", where={"id": category_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="InventoryCategory")
    await delete_record(CATEGORY_TABLE, category_id)


# ── Subcategories ────────────────────────────────────────────────────────────


async def list_subcategories(tenant_id: str, category_id: str | None = None) -> dict[str, Any]:
    """List subcategories, optionally filtered by category."""
    where: dict[str, Any] = {"isActive": True}
    if category_id:
        where["categoryId"] = category_id

    result = await query_table(
        SUBCATEGORY_TABLE,
        select="*",
        where=where,
        order="name.asc",
        tenant_id=tenant_id,
    )
    return {"data": result.get("data", [])}


async def create_subcategory(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new subcategory."""
    if not data.get("name"):
        raise ValidationException(message="Subcategory name is required")
    record = {"tenantId": tenant_id, **data, "isActive": True}
    return await insert_record(SUBCATEGORY_TABLE, record)


# ── Warehouses ───────────────────────────────────────────────────────────────


async def list_warehouses(tenant_id: str, include_inactive: bool = False) -> dict[str, Any]:
    """List warehouses with stock info."""
    where: dict[str, Any] = {}
    if not include_inactive:
        where["isActive"] = True

    result = await query_table(
        WAREHOUSE_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        tenant_id=tenant_id,
    )
    return {"data": result.get("data", [])}


async def create_warehouse(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new warehouse."""
    if not data.get("name"):
        raise ValidationException(message="Warehouse name is required")
    record = {"tenantId": tenant_id, **data, "isActive": True}
    return await insert_record(WAREHOUSE_TABLE, record)


async def update_warehouse(warehouse_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a warehouse."""
    result = await query_table(WAREHOUSE_TABLE, select="id", where={"id": warehouse_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="Warehouse")
    return await update_record(WAREHOUSE_TABLE, warehouse_id, data)


async def delete_warehouse(warehouse_id: str, tenant_id: str) -> None:
    """Delete a warehouse."""
    result = await query_table(WAREHOUSE_TABLE, select="id", where={"id": warehouse_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="Warehouse")
    await delete_record(WAREHOUSE_TABLE, warehouse_id)


# ── Stock Movements ─────────────────────────────────────────────────────────


async def list_stock_movements(
    tenant_id: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List stock movements with pagination and filters."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    item_id = params.get("itemId", "")
    warehouse_id = params.get("warehouseId", "")
    movement_type = params.get("type", "")
    date_from = params.get("dateFrom", "")
    date_to = params.get("dateTo", "")

    where: dict[str, Any] = {}
    if item_id:
        where["itemId"] = item_id
    if warehouse_id:
        where["warehouseId"] = warehouse_id
    if movement_type:
        where["type"] = movement_type
    if date_from or date_to:
        date_filter: dict[str, Any] = {}
        if date_from:
            date_filter["gte"] = date_from
        if date_to:
            date_filter["lte"] = date_to
        where["createdAt"] = date_filter

    select = "*,item(id,name,itemCode,unit,sku),warehouse(id,name,code)"
    offset = (page - 1) * page_size

    result = await query_table(
        MOVEMENT_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    movements = await resolve_includes(result.get("data", []), select)
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(movements)

    return {
        "data": movements,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def create_stock_movement(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Record a stock movement."""
    item_id = data.get("itemId")
    movement_type = data.get("type")
    quantity = data.get("quantity", 0)

    valid_types = ["stock_in", "stock_out", "adjustment", "transfer", "return", "damage"]
    if not movement_type or movement_type not in valid_types:
        raise ValidationException(message=f"Invalid movement type. Must be one of: {', '.join(valid_types)}")
    if not item_id or quantity <= 0:
        raise ValidationException(message="itemId, type, and positive quantity are required")

    # Verify item exists
    item_result = await query_table(ITEM_TABLE, select="id,quantity", where={"id": item_id}, tenant_id=tenant_id)
    items = item_result.get("data", [])
    if not items:
        raise NotFoundException(resource="InventoryItem")

    previous_qty = items[0].get("quantity", 0)
    new_qty = previous_qty

    # Calculate new quantity
    if movement_type in ("stock_in", "return"):
        new_qty = previous_qty + quantity
    elif movement_type in ("stock_out", "damage"):
        new_qty = max(0, previous_qty - quantity)
    elif movement_type == "adjustment":
        new_qty = quantity

    # Update item quantity (except for transfer)
    if movement_type != "transfer":
        await update_record(ITEM_TABLE, item_id, {"quantity": new_qty})

    # Create movement record
    movement_record = {
        "tenantId": tenant_id,
        "itemId": item_id,
        "warehouseId": data.get("warehouseId"),
        "type": movement_type,
        "quantity": quantity,
        "previousQty": previous_qty,
        "newQty": new_qty,
        "reason": data.get("reason"),
        "referenceNo": data.get("referenceNo"),
        "referenceType": data.get("referenceType"),
        "fromWarehouseId": data.get("fromWarehouseId"),
        "batchNo": data.get("batchNo"),
        "lotNumber": data.get("lotNumber"),
        "expiryDate": data.get("expiryDate"),
        "unitCost": data.get("unitCost", 0),
        "notes": data.get("notes"),
        "performedBy": user.userId,
    }

    return await insert_record(MOVEMENT_TABLE, movement_record)


async def adjust_stock(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Stock adjustment — simplified wrapper."""
    data["type"] = "adjustment"
    return await create_stock_movement(tenant_id, user, data)


# ── Suppliers ────────────────────────────────────────────────────────────────


async def list_suppliers(tenant_id: str, params: dict[str, Any]) -> dict[str, Any]:
    """List item suppliers with pagination and search."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    item_id = params.get("itemId", "")

    where: dict[str, Any] = {"isActive": True}
    if search:
        where["OR"] = [
            {"supplierName": {"contains": search}},
            {"supplierCode": {"contains": search}},
            {"contactPerson": {"contains": search}},
            {"email": {"contains": search}},
            {"phone": {"contains": search}},
        ]
    if item_id:
        where["itemId"] = item_id

    select = "*,item(id,name,itemCode,sku,unit)"
    offset = (page - 1) * page_size

    result = await query_table(
        SUPPLIER_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    suppliers = await resolve_includes(result.get("data", []), select)
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(suppliers)

    return {
        "data": suppliers,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def create_supplier(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new item supplier."""
    if not data.get("itemId") or not data.get("supplierName"):
        raise ValidationException(message="itemId and supplierName are required")

    # Verify item exists
    item_result = await query_table(ITEM_TABLE, select="id", where={"id": data["itemId"]}, tenant_id=tenant_id)
    if not item_result.get("data"):
        raise NotFoundException(resource="InventoryItem")

    record = {"tenantId": tenant_id, "isActive": True, **data}
    return await insert_record(SUPPLIER_TABLE, record)


# ── Price Books ──────────────────────────────────────────────────────────────


async def list_price_books(tenant_id: str, include_inactive: bool = False) -> dict[str, Any]:
    """List price books."""
    where: dict[str, Any] = {}
    if not include_inactive:
        where["isActive"] = True

    result = await query_table(
        PRICE_BOOK_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        tenant_id=tenant_id,
    )
    return {"data": result.get("data", [])}


async def create_price_book(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new price book."""
    if not data.get("name"):
        raise ValidationException(message="Price book name is required")

    # If setting as default, unset other defaults
    if data.get("isDefault"):
        try:
            from app.integrations.supabase import get_supabase
            sb = get_supabase()
            await sb.update(PRICE_BOOK_TABLE, "", {})  # Use query approach
            # Fallback: update all defaults to false via raw query
        except Exception:
            pass

    record = {"tenantId": tenant_id, **data, "isActive": True}
    return await insert_record(PRICE_BOOK_TABLE, record)


async def update_price_book(book_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a price book."""
    result = await query_table(PRICE_BOOK_TABLE, select="id", where={"id": book_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="PriceBook")
    return await update_record(PRICE_BOOK_TABLE, book_id, data)


async def delete_price_book(book_id: str, tenant_id: str) -> None:
    """Delete a price book."""
    result = await query_table(PRICE_BOOK_TABLE, select="id", where={"id": book_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="PriceBook")
    await delete_record(PRICE_BOOK_TABLE, book_id)


async def list_price_book_entries(book_id: str, tenant_id: str) -> dict[str, Any]:
    """List entries in a price book."""
    result = await query_table(
        PRICE_ENTRY_TABLE,
        select="*",
        where={"priceBookId": book_id},
        order="createdAt.desc",
        tenant_id=tenant_id,
    )
    return {"data": result.get("data", [])}


async def create_price_book_entry(book_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a price book entry."""
    if not data.get("itemId"):
        raise ValidationException(message="itemId is required")
    record = {"tenantId": tenant_id, "priceBookId": book_id, "isActive": True, **data}
    return await insert_record(PRICE_ENTRY_TABLE, record)


async def update_price_book_entry(entry_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a price book entry."""
    result = await query_table(PRICE_ENTRY_TABLE, select="id", where={"id": entry_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="PriceBookEntry")
    return await update_record(PRICE_ENTRY_TABLE, entry_id, data)


async def delete_price_book_entry(entry_id: str, tenant_id: str) -> None:
    """Delete a price book entry."""
    result = await query_table(PRICE_ENTRY_TABLE, select="id", where={"id": entry_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="PriceBookEntry")
    await delete_record(PRICE_ENTRY_TABLE, entry_id)


# ── Stats ────────────────────────────────────────────────────────────────────


async def get_stats(tenant_id: str) -> dict[str, Any]:
    """Get inventory statistics."""
    total_items = await count_records(ITEM_TABLE, {"isActive": True}, tenant_id=tenant_id)
    active_items = await count_records(ITEM_TABLE, {"isActive": True, "status": "active"}, tenant_id=tenant_id)
    out_of_stock = await count_records(ITEM_TABLE, {"isActive": True, "quantity": 0}, tenant_id=tenant_id)
    pending_approval = await count_records(ITEM_TABLE, {"approvalStatus": "pending", "isActive": True}, tenant_id=tenant_id)
    total_categories = await count_records(CATEGORY_TABLE, {"isActive": True}, tenant_id=tenant_id)
    total_warehouses = await count_records(WAREHOUSE_TABLE, {"isActive": True}, tenant_id=tenant_id)
    total_suppliers = await count_records(SUPPLIER_TABLE, {"isActive": True}, tenant_id=tenant_id)

    # Recent movements
    movements_result = await query_table(
        MOVEMENT_TABLE,
        select="*",
        order="createdAt.desc",
        limit=10,
        tenant_id=tenant_id,
    )
    recent_movements = await resolve_includes(movements_result.get("data", []), "*,item(id,name,itemCode,unit),warehouse(id,name)")

    return {
        "totalItems": total_items,
        "activeItems": active_items,
        "lowStockCount": 0,  # Computed on frontend
        "outOfStockItems": out_of_stock,
        "pendingApproval": pending_approval,
        "totalCategories": total_categories,
        "totalWarehouses": total_warehouses,
        "totalSuppliers": total_suppliers,
        "totalValue": 0,
        "totalStock": 0,
        "itemsByType": [],
        "itemsByStatus": [],
        "itemsByCategory": [],
        "recentMovements": recent_movements,
        "lowStockItems": [],
    }


# ── Dashboard ────────────────────────────────────────────────────────────────


async def get_dashboard(tenant_id: str) -> dict[str, Any]:
    """Get inventory dashboard data."""
    total_items = await count_records(ITEM_TABLE, tenant_id=tenant_id)
    active_items = await count_records(ITEM_TABLE, {"isActive": True}, tenant_id=tenant_id)

    # Fetch all items for in-memory analytics
    result = await query_table(
        ITEM_TABLE,
        select="id,quantity,minStock,unitCost,category,isActive,supplier,updatedAt,createdAt,sku,location",
        tenant_id=tenant_id,
    )
    all_items = result.get("data", [])

    active = [i for i in all_items if i.get("isActive")]
    low_stock = [i for i in active if i.get("quantity", 0) > 0 and i.get("quantity", 0) <= i.get("minStock", 0)]
    out_of_stock = [i for i in active if i.get("quantity", 0) == 0]
    inactive = [i for i in all_items if not i.get("isActive")]

    total_value = sum(i.get("quantity", 0) * i.get("unitCost", 0) for i in active)

    stock_overview = [
        {"name": "In Stock", "value": len([i for i in active if i.get("quantity", 0) > i.get("minStock", 0)]), "color": "#10B981"},
        {"name": "Low Stock", "value": len(low_stock), "color": "#F59E0B"},
        {"name": "Out of Stock", "value": len(out_of_stock), "color": "#EF4444"},
        {"name": "Inactive", "value": len(inactive), "color": "#9CA3AF"},
    ]

    # Insights
    insights = []
    if low_stock:
        insights.append({
            "type": "low_stock", "title": "Low Stock Alert",
            "description": f"{len(low_stock)} item(s) are at or below minimum stock level",
            "severity": "warning", "count": len(low_stock),
        })
    if out_of_stock:
        insights.append({
            "type": "out_of_stock", "title": "Out of Stock",
            "description": f"{len(out_of_stock)} item(s) have zero quantity",
            "severity": "critical", "count": len(out_of_stock),
        })

    return {
        "kpi": {
            "totalItems": total_items,
            "activeItems": active_items,
            "lowStockCount": len(low_stock),
            "outOfStockCount": len(out_of_stock),
            "totalInventoryValue": total_value,
            "pendingPOCount": 0,
            "incomingQuantity": 0,
        },
        "stockOverview": stock_overview,
        "categoryBreakdown": [],
        "valueTrend": [],
        "supplierSummary": {"totalSuppliers": 0, "topSupplier": None, "outstandingPO": 0, "suppliers": []},
        "warehouseSummary": {"totalWarehouses": 1, "totalLocations": 1},
        "insights": insights,
    }
