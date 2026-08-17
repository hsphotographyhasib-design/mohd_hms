"""
Service Items feature router.

MOHD.HMS ENTERPRISE

Endpoints for service items, categories, packages, labour rates, price books,
checklist items, and materials.
"""

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, require_role

from . import service
from .schemas import (
    ChecklistItemCreate,
    LabourRateCreate,
    LabourRateUpdate,
    PriceBookCreate,
    PriceBookUpdate,
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceItemCreate,
    ServiceItemMaterialCreate,
    ServiceItemUpdate,
    ServicePackageCreate,
    ServicePackageUpdate,
)

# ── Main service items router (mounted at /api/v1/service-items) ────────────

router = APIRouter(tags=["service-items"])

_ROLES = ["super_admin", "admin", "manager", "supervisor"]


# -- Service Items CRUD --


@router.get("")
async def list_service_items(
    user: AuthUser = Depends(require_role(*_ROLES)),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    categoryId: str | None = Query(default=None),
):
    """GET /api/v1/service-items — List service items."""
    return await service.list_service_items(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search or "",
        status=status,
        category_id=categoryId,
    )


@router.post("")
async def create_service_item(
    body: ServiceItemCreate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """POST /api/v1/service-items — Create a service item."""
    return await service.create_service_item(user.tenantId, body.model_dump())


@router.get("/{item_id}")
async def get_service_item(
    item_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """GET /api/v1/service-items/{id} — Get service item detail."""
    return await service.get_service_item(item_id, user.tenantId)


@router.put("/{item_id}")
async def update_service_item(
    item_id: str,
    body: ServiceItemUpdate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """PUT /api/v1/service-items/{id} — Update a service item."""
    return await service.update_service_item(item_id, user.tenantId, body.model_dump(exclude_none=True))


@router.delete("/{item_id}")
async def delete_service_item(
    item_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """DELETE /api/v1/service-items/{id} — Delete a service item."""
    return await service.delete_service_item(item_id, user.tenantId)


# -- Checklist --


@router.get("/{item_id}/checklist")
async def list_checklist(
    item_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """GET /api/v1/service-items/{id}/checklist — List checklist items."""
    return await service.list_checklist(item_id, user.tenantId)


@router.post("/{item_id}/checklist")
async def add_checklist_item(
    item_id: str,
    body: ChecklistItemCreate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """POST /api/v1/service-items/{id}/checklist — Add a checklist item."""
    return await service.add_checklist_item(item_id, user.tenantId, body.model_dump())


# -- Materials --


@router.get("/{item_id}/materials")
async def list_materials(
    item_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """GET /api/v1/service-items/{id}/materials — List materials."""
    return await service.list_materials(item_id, user.tenantId)


@router.post("/{item_id}/materials")
async def add_material(
    item_id: str,
    body: ServiceItemMaterialCreate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """POST /api/v1/service-items/{id}/materials — Add a material."""
    return await service.add_material(item_id, user.tenantId, body.model_dump())


# ── Service Categories router (mounted at /api/v1/service-categories) ──────

categories_router = APIRouter(tags=["service-categories"])


@categories_router.get("")
async def list_categories(
    user: AuthUser = Depends(require_role(*_ROLES)),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    """GET /api/v1/service-categories — List service categories."""
    return await service.list_categories(user.tenantId, page, pageSize, search or "", status)


@categories_router.post("")
async def create_category(
    body: ServiceCategoryCreate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """POST /api/v1/service-categories — Create a service category."""
    return await service.create_category(user.tenantId, body.model_dump())


@categories_router.get("/{category_id}")
async def get_category(
    category_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """GET /api/v1/service-categories/{id} — Get a service category."""
    return await service.get_category(category_id, user.tenantId)


@categories_router.put("/{category_id}")
async def update_category(
    category_id: str,
    body: ServiceCategoryUpdate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """PUT /api/v1/service-categories/{id} — Update a service category."""
    return await service.update_category(category_id, user.tenantId, body.model_dump(exclude_none=True))


@categories_router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """DELETE /api/v1/service-categories/{id} — Delete a service category."""
    return await service.delete_category(category_id, user.tenantId)


# ── Service Packages router (mounted at /api/v1/service-packages) ──────────

packages_router = APIRouter(tags=["service-packages"])


@packages_router.get("")
async def list_packages(
    user: AuthUser = Depends(require_role(*_ROLES)),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    """GET /api/v1/service-packages — List service packages."""
    return await service.list_packages(user.tenantId, page, pageSize, search or "", status)


@packages_router.post("")
async def create_package(
    body: ServicePackageCreate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """POST /api/v1/service-packages — Create a service package."""
    return await service.create_package(user.tenantId, body.model_dump())


@packages_router.get("/{package_id}")
async def get_package(
    package_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """GET /api/v1/service-packages/{id} — Get a service package with items."""
    return await service.get_package(package_id, user.tenantId)


@packages_router.put("/{package_id}")
async def update_package(
    package_id: str,
    body: ServicePackageUpdate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """PUT /api/v1/service-packages/{id} — Update a service package."""
    return await service.update_package(package_id, user.tenantId, body.model_dump(exclude_none=True))


@packages_router.delete("/{package_id}")
async def delete_package(
    package_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """DELETE /api/v1/service-packages/{id} — Delete a service package."""
    return await service.delete_package(package_id, user.tenantId)


# ── Labour Rates router (mounted at /api/v1/labour-rates) ──────────────────

labour_rates_router = APIRouter(tags=["labour-rates"])


@labour_rates_router.get("")
async def list_labour_rates(
    user: AuthUser = Depends(require_role(*_ROLES)),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    """GET /api/v1/labour-rates — List labour rates."""
    return await service.list_labour_rates(user.tenantId, page, pageSize, search or "", status)


@labour_rates_router.post("")
async def create_labour_rate(
    body: LabourRateCreate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """POST /api/v1/labour-rates — Create a labour rate."""
    return await service.create_labour_rate(user.tenantId, body.model_dump())


@labour_rates_router.get("/{rate_id}")
async def get_labour_rate(
    rate_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """GET /api/v1/labour-rates/{id} — Get a labour rate."""
    return await service.get_labour_rate(rate_id, user.tenantId)


@labour_rates_router.put("/{rate_id}")
async def update_labour_rate(
    rate_id: str,
    body: LabourRateUpdate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """PUT /api/v1/labour-rates/{id} — Update a labour rate."""
    return await service.update_labour_rate(rate_id, user.tenantId, body.model_dump(exclude_none=True))


@labour_rates_router.delete("/{rate_id}")
async def delete_labour_rate(
    rate_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """DELETE /api/v1/labour-rates/{id} — Delete a labour rate."""
    return await service.delete_labour_rate(rate_id, user.tenantId)


# ── Price Book router (mounted at /api/v1/price-book) ─────────────────────

price_book_router = APIRouter(tags=["price-book"])


@price_book_router.get("")
async def list_price_books(
    user: AuthUser = Depends(require_role(*_ROLES)),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=25, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    """GET /api/v1/price-book — List price books."""
    return await service.list_price_books(user.tenantId, page, pageSize, search or "", status)


@price_book_router.post("")
async def create_price_book(
    body: PriceBookCreate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """POST /api/v1/price-book — Create a price book."""
    return await service.create_price_book(user.tenantId, body.model_dump())


@price_book_router.get("/{book_id}")
async def get_price_book(
    book_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """GET /api/v1/price-book/{id} — Get a price book."""
    return await service.get_price_book(book_id, user.tenantId)


@price_book_router.put("/{book_id}")
async def update_price_book(
    book_id: str,
    body: PriceBookUpdate,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """PUT /api/v1/price-book/{id} — Update a price book."""
    return await service.update_price_book(book_id, user.tenantId, body.model_dump(exclude_none=True))


@price_book_router.delete("/{book_id}")
async def delete_price_book(
    book_id: str,
    user: AuthUser = Depends(require_role(*_ROLES)),
):
    """DELETE /api/v1/price-book/{id} — Delete a price book."""
    return await service.delete_price_book(book_id, user.tenantId)
