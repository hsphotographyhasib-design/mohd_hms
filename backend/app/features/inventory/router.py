"""
Inventory feature router — matches Next.js API routes.

MOHD.HMS ENTERPRISE

Endpoints:
  GET/POST    /api/v1/inventory                     — List/create items
  GET/PUT/DEL /api/v1/inventory/{id}                  — Item CRUD
  GET/POST    /api/v1/inventory/categories            — Categories
  PUT/DEL     /api/v1/inventory/categories/{id}       — Category CRUD
  GET/POST    /api/v1/inventory/subcategories          — Subcategories
  GET/POST    /api/v1/inventory/warehouses             — Warehouses
  GET/PUT/DEL /api/v1/inventory/warehouses/{id}      — Warehouse CRUD
  GET/POST    /api/v1/inventory/stock                  — Stock movements
  POST        /api/v1/inventory/adjust                 — Stock adjustment
  GET         /api/v1/inventory/stats                  — Stats
  GET         /api/v1/inventory/dashboard              — Dashboard
  GET/POST    /api/v1/inventory/suppliers              — Suppliers
  GET/POST    /api/v1/inventory/price-books            — Price books
  GET/PUT/DEL /api/v1/inventory/price-books/{id}     — Price book CRUD
  GET/POST/PUT/DEL /api/v1/inventory/price-books/{id}/entries — Price book entries
"""

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_permission
from app.features.inventory import service
from app.features.inventory.schemas import (
    InventoryCategoryCreate,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryListResponse,
    PriceBookCreate,
    PriceBookEntryCreate,
    PriceBookEntryUpdate,
    PriceBookUpdate,
    StockAdjustCreate,
    StockMovementCreate,
    WarehouseCreate,
    WarehouseUpdate,
)

router = APIRouter(tags=["inventory"])


# ============================================================================
# INVENTORY ITEMS
# ============================================================================


@router.get("")
async def list_items(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    itemType: str | None = Query(default=None),
    categoryId: str | None = Query(default=None),
    subcategoryId: str | None = Query(default=None),
    status: str | None = Query(default=None),
    lowStock: bool = Query(default=False),
    sortBy: str = Query(default="createdAt"),
    sortOrder: str = Query(default="desc"),
):
    """GET /api/v1/inventory — List inventory items."""
    return await service.list_items(user.tenantId, user, {
        "page": page,
        "pageSize": pageSize,
        "search": search or "",
        "itemType": itemType or "",
        "categoryId": categoryId or "",
        "subcategoryId": subcategoryId or "",
        "status": status or "",
        "lowStock": lowStock,
        "sortBy": sortBy,
        "sortOrder": sortOrder,
    })


@router.post("")
async def create_item(
    body: InventoryItemCreate,
    user: AuthUser = Depends(require_permission("inventory.create")),
):
    """POST /api/v1/inventory — Create an inventory item."""
    return await service.create_item(user.tenantId, user, body.model_dump())


@router.get("/{item_id}")
async def get_item(
    item_id: str,
    user: AuthUser = Depends(require_permission("inventory.view")),
):
    """GET /api/v1/inventory/{id} — Get inventory item detail."""
    return await service.get_item(item_id, user.tenantId, user)


@router.put("/{item_id}")
async def update_item(
    item_id: str,
    body: InventoryItemUpdate,
    user: AuthUser = Depends(require_permission("inventory.update")),
):
    """PUT /api/v1/inventory/{id} — Update an inventory item."""
    return await service.update_item(item_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/{item_id}")
async def delete_item(
    item_id: str,
    user: AuthUser = Depends(require_permission("inventory.delete")),
):
    """DELETE /api/v1/inventory/{id} — Archive an inventory item."""
    return await service.delete_item(item_id, user.tenantId, user)


# ============================================================================
# CATEGORIES
# ============================================================================


@router.get("/categories")
async def list_categories(
    user: AuthUser = Depends(require_permission("inventory.view")),
    includeInactive: bool = Query(default=False, alias="includeInactive"),
):
    """GET /api/v1/inventory/categories — List categories."""
    return await service.list_categories(user.tenantId, include_inactive=includeInactive)


@router.post("/categories")
async def create_category(
    body: InventoryCategoryCreate,
    user: AuthUser = Depends(require_permission("inventory.manage_category")),
):
    """POST /api/v1/inventory/categories — Create a category."""
    return await service.create_category(user.tenantId, body.model_dump())


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    body: InventoryCategoryCreate,
    user: AuthUser = Depends(require_permission("inventory.manage_category")),
):
    """PUT /api/v1/inventory/categories/{id} — Update a category."""
    return await service.update_category(category_id, user.tenantId, body.model_dump(exclude_none=True))


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    user: AuthUser = Depends(require_permission("inventory.manage_category")),
):
    """DELETE /api/v1/inventory/categories/{id} — Delete a category."""
    await service.delete_category(category_id, user.tenantId)
    return {"message": "Category deleted successfully"}


# ============================================================================
# SUBCATEGORIES
# ============================================================================


@router.get("/subcategories")
async def list_subcategories(
    user: AuthUser = Depends(require_permission("inventory.view")),
    categoryId: str | None = Query(default=None, alias="categoryId"),
):
    """GET /api/v1/inventory/subcategories — List subcategories."""
    return await service.list_subcategories(user.tenantId, category_id=categoryId)


@router.post("/subcategories")
async def create_subcategory(
    body: dict[str, Any],
    user: AuthUser = Depends(require_permission("inventory.manage_category")),
):
    """POST /api/v1/inventory/subcategories — Create a subcategory."""
    return await service.create_subcategory(user.tenantId, body)


# ============================================================================
# WAREHOUSES
# ============================================================================


@router.get("/warehouses")
async def list_warehouses(
    user: AuthUser = Depends(require_permission("inventory.view")),
    includeInactive: bool = Query(default=False, alias="includeInactive"),
):
    """GET /api/v1/inventory/warehouses — List warehouses."""
    return await service.list_warehouses(user.tenantId, include_inactive=includeInactive)


@router.post("/warehouses")
async def create_warehouse(
    body: WarehouseCreate,
    user: AuthUser = Depends(require_permission("inventory.manage_warehouse")),
):
    """POST /api/v1/inventory/warehouses — Create a warehouse."""
    return await service.create_warehouse(user.tenantId, body.model_dump())


@router.put("/warehouses/{warehouse_id}")
async def update_warehouse(
    warehouse_id: str,
    body: WarehouseUpdate,
    user: AuthUser = Depends(require_permission("inventory.manage_warehouse")),
):
    """PUT /api/v1/inventory/warehouses/{id} — Update a warehouse."""
    return await service.update_warehouse(warehouse_id, user.tenantId, body.model_dump(exclude_none=True))


@router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: str,
    user: AuthUser = Depends(require_permission("inventory.manage_warehouse")),
):
    """DELETE /api/v1/inventory/warehouses/{id} — Delete a warehouse."""
    await service.delete_warehouse(warehouse_id, user.tenantId)
    return {"message": "Warehouse deleted successfully"}


# ============================================================================
# STOCK MOVEMENTS
# ============================================================================


@router.get("/stock")
async def list_stock_movements(
    user: AuthUser = Depends(require_permission("inventory.manage_stock")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    itemId: str | None = Query(default=None),
    warehouseId: str | None = Query(default=None),
    type: str | None = Query(default=None),
    dateFrom: str | None = Query(default=None),
    dateTo: str | None = Query(default=None),
):
    """GET /api/v1/inventory/stock — List stock movements."""
    return await service.list_stock_movements(user.tenantId, {
        "page": page,
        "pageSize": pageSize,
        "itemId": itemId or "",
        "warehouseId": warehouseId or "",
        "type": type or "",
        "dateFrom": dateFrom or "",
        "dateTo": dateTo or "",
    })


@router.post("/stock")
async def create_stock_movement(
    body: StockMovementCreate,
    user: AuthUser = Depends(require_permission("inventory.adjust")),
):
    """POST /api/v1/inventory/stock — Record a stock movement."""
    return await service.create_stock_movement(user.tenantId, user, body.model_dump())


@router.post("/adjust")
async def adjust_stock(
    body: StockAdjustCreate,
    user: AuthUser = Depends(require_permission("inventory.adjust")),
):
    """POST /api/v1/inventory/adjust — Stock adjustment (simplified)."""
    return await service.adjust_stock(user.tenantId, user, body.model_dump())


# ============================================================================
# STATS & DASHBOARD
# ============================================================================


@router.get("/stats")
async def get_stats(
    user: AuthUser = Depends(require_permission("inventory.view")),
):
    """GET /api/v1/inventory/stats — Inventory statistics."""
    return await service.get_stats(user.tenantId)


@router.get("/dashboard")
async def get_dashboard(
    user: AuthUser = Depends(require_permission("inventory.view")),
):
    """GET /api/v1/inventory/dashboard — Inventory dashboard data."""
    return await service.get_dashboard(user.tenantId)


# ============================================================================
# SUPPLIERS
# ============================================================================


@router.get("/suppliers")
async def list_suppliers(
    user: AuthUser = Depends(require_permission("inventory.manage_supplier")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    itemId: str | None = Query(default=None),
):
    """GET /api/v1/inventory/suppliers — List item suppliers."""
    return await service.list_suppliers(user.tenantId, {
        "page": page,
        "pageSize": pageSize,
        "search": search or "",
        "itemId": itemId or "",
    })


@router.post("/suppliers")
async def create_supplier(
    body: dict[str, Any],
    user: AuthUser = Depends(require_permission("inventory.manage_supplier")),
):
    """POST /api/v1/inventory/suppliers — Create an item supplier."""
    return await service.create_supplier(user.tenantId, body)


# ============================================================================
# PRICE BOOKS
# ============================================================================


@router.get("/price-books")
async def list_price_books(
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
    includeInactive: bool = Query(default=False, alias="includeInactive"),
):
    """GET /api/v1/inventory/price-books — List price books."""
    return await service.list_price_books(user.tenantId, include_inactive=includeInactive)


@router.post("/price-books")
async def create_price_book(
    body: PriceBookCreate,
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
):
    """POST /api/v1/inventory/price-books — Create a price book."""
    return await service.create_price_book(user.tenantId, body.model_dump())


@router.put("/price-books/{book_id}")
async def update_price_book(
    book_id: str,
    body: PriceBookUpdate,
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
):
    """PUT /api/v1/inventory/price-books/{id} — Update a price book."""
    return await service.update_price_book(book_id, user.tenantId, body.model_dump(exclude_none=True))


@router.delete("/price-books/{book_id}")
async def delete_price_book(
    book_id: str,
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
):
    """DELETE /api/v1/inventory/price-books/{id} — Delete a price book."""
    await service.delete_price_book(book_id, user.tenantId)
    return {"message": "Price book deleted successfully"}


@router.get("/price-books/{book_id}/entries")
async def list_price_book_entries(
    book_id: str,
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
):
    """GET /api/v1/inventory/price-books/{id}/entries — List price book entries."""
    return await service.list_price_book_entries(book_id, user.tenantId)


@router.post("/price-books/{book_id}/entries")
async def create_price_book_entry(
    book_id: str,
    body: PriceBookEntryCreate,
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
):
    """POST /api/v1/inventory/price-books/{id}/entries — Create a price book entry."""
    return await service.create_price_book_entry(book_id, user.tenantId, body.model_dump())


@router.put("/price-books/{book_id}/entries/{entry_id}")
async def update_price_book_entry(
    book_id: str,
    entry_id: str,
    body: PriceBookEntryUpdate,
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
):
    """PUT /api/v1/inventory/price-books/{id}/entries/{entryId} — Update a price book entry."""
    return await service.update_price_book_entry(entry_id, user.tenantId, body.model_dump(exclude_none=True))


@router.delete("/price-books/{book_id}/entries/{entry_id}")
async def delete_price_book_entry(
    book_id: str,
    entry_id: str,
    user: AuthUser = Depends(require_permission("inventory.manage_price_book")),
):
    """DELETE /api/v1/inventory/price-books/{id}/entries/{entryId} — Delete a price book entry."""
    await service.delete_price_book_entry(entry_id, user.tenantId)
    return {"message": "Price book entry deleted successfully"}
