"""
Vehicle business logic.

MOHD.HMS ENTERPRISE

Implements vehicle CRUD and vehicle log management.
"""

from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger

log = get_logger(__name__)

# Table name constants
VEHICLE_TABLE = MODEL_TO_TABLE.get("vehicle", "Vehicle")
VEHICLE_LOG_TABLE = MODEL_TO_TABLE.get("vehicleLog", "VehicleLog")

VALID_LOG_TYPES = ("FUEL", "SERVICE", "REPAIR", "INSURANCE")
VALID_VEHICLE_STATUSES = ("active", "maintenance", "out_of_service", "retired")


async def list_vehicles(
    tenant_id: str,
    user: AuthUser,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List vehicles with pagination, search, and status filter."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [
            {"plateNumber": {"contains": search}},
            {"make": {"contains": search}},
            {"model": {"contains": search}},
            {"vin": {"contains": search}},
        ]
    if status:
        where["status"] = status

    offset = (page - 1) * page_size

    result = await query_table(
        VEHICLE_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    vehicles = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "0") else len(vehicles)

    return {
        "data": vehicles,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def get_vehicle(vehicle_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Get a single vehicle with its logs."""
    select = "*,logs(*)"
    result = await query_table(
        VEHICLE_TABLE,
        select=select,
        where={"id": vehicle_id},
        tenant_id=tenant_id,
    )
    vehicles = result.get("data", [])
    if not vehicles:
        raise NotFoundException(resource="Vehicle")

    vehicle = vehicles[0]

    # Also fetch logs separately for reliable ordering
    logs_result = await query_table(
        VEHICLE_LOG_TABLE,
        select="*",
        where={"vehicleId": vehicle_id},
        order="date.desc",
        limit=20,
        tenant_id=tenant_id,
    )
    vehicle["logs"] = logs_result.get("data", [])

    return vehicle


async def create_vehicle(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new vehicle."""
    if not data.get("plateNumber") or not data.get("make") or not data.get("model"):
        raise ValidationException(message="Plate number, make, and model are required")

    status = data.get("status", "active")
    if status not in VALID_VEHICLE_STATUSES:
        status = "active"

    record = {
        "tenantId": tenant_id,
        "plateNumber": data["plateNumber"],
        "make": data["make"],
        "model": data["model"],
        "year": data.get("year"),
        "vin": data.get("vin"),
        "fuelType": data.get("fuelType"),
        "status": status,
        "currentMileage": data.get("currentMileage"),
        "nextServiceDate": data.get("nextServiceDate"),
    }

    return await insert_record(VEHICLE_TABLE, record)


async def update_vehicle(
    vehicle_id: str,
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update a vehicle."""
    # Verify exists
    result = await query_table(VEHICLE_TABLE, select="id", where={"id": vehicle_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="Vehicle")

    # Filter out None values for optional fields
    update_data = {k: v for k, v in data.items() if v is not None or k in ("currentMileage", "year", "vin", "fuelType", "nextServiceDate")}

    return await update_record(VEHICLE_TABLE, vehicle_id, update_data)


async def delete_vehicle(vehicle_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Delete a vehicle."""
    result = await query_table(VEHICLE_TABLE, select="id", where={"id": vehicle_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="Vehicle")

    await delete_record(VEHICLE_TABLE, vehicle_id)
    return {"message": "Vehicle deleted successfully"}


async def create_vehicle_log(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a vehicle log entry."""
    vehicle_id = data.get("vehicleId")
    log_type = data.get("type", "")

    if not vehicle_id:
        raise ValidationException(message="vehicleId is required")
    if log_type not in VALID_LOG_TYPES:
        raise ValidationException(message=f"Invalid log type. Must be one of: {', '.join(VALID_LOG_TYPES)}")

    # Verify vehicle exists
    result = await query_table(VEHICLE_TABLE, select="id", where={"id": vehicle_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="Vehicle")

    record = {
        "tenantId": tenant_id,
        "vehicleId": vehicle_id,
        "userId": data.get("userId") or user.userId,
        "type": log_type,
        "date": data.get("date"),
        "odometer": data.get("odometer"),
        "quantity": data.get("quantity"),
        "cost": data.get("cost"),
        "description": data.get("description"),
        "location": data.get("location"),
    }

    return await insert_record(VEHICLE_LOG_TABLE, record)
