"""
Vehicle feature router.

MOHD.HMS ENTERPRISE

Endpoints:
  GET/POST    /api/v1/vehicles   — List/create vehicles
  GET/PUT/DEL /api/v1/vehicles/{id} — Vehicle CRUD
  POST        /api/v1/vehicles/{id}/logs — Create vehicle log
"""

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, require_permission, get_current_user
from app.features.vehicles import service
from app.features.vehicles.schemas import VehicleCreate, VehicleLogCreate, VehicleUpdate

router = APIRouter(tags=["vehicles"])


@router.get("")
async def list_vehicles(
    user: AuthUser = Depends(require_permission("vehicle.view")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    """GET /api/v1/vehicles — List vehicles."""
    return await service.list_vehicles(user.tenantId, user, {
        "page": page,
        "pageSize": pageSize,
        "search": search or "",
        "status": status or "",
    })


@router.post("")
async def create_vehicle(
    body: VehicleCreate,
    user: AuthUser = Depends(require_permission("vehicle.create")),
):
    """POST /api/v1/vehicles — Create a vehicle."""
    return await service.create_vehicle(user.tenantId, user, body.model_dump())


@router.get("/{vehicle_id}")
async def get_vehicle(
    vehicle_id: str,
    user: AuthUser = Depends(require_permission("vehicle.view")),
):
    """GET /api/v1/vehicles/{id} — Get vehicle detail with logs."""
    return await service.get_vehicle(vehicle_id, user.tenantId, user)


@router.put("/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    body: VehicleUpdate,
    user: AuthUser = Depends(require_permission("vehicle.update")),
):
    """PUT /api/v1/vehicles/{id} — Update a vehicle."""
    return await service.update_vehicle(vehicle_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    user: AuthUser = Depends(require_permission("vehicle.delete")),
):
    """DELETE /api/v1/vehicles/{id} — Delete a vehicle."""
    return await service.delete_vehicle(vehicle_id, user.tenantId, user)


@router.post("/{vehicle_id}/logs")
async def create_vehicle_log(
    vehicle_id: str,
    body: VehicleLogCreate,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/vehicles/{id}/logs — Create a vehicle log entry."""
    data = body.model_dump()
    data["vehicleId"] = vehicle_id
    return await service.create_vehicle_log(user.tenantId, user, data)
