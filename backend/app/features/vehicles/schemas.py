"""
Pydantic schemas for the Vehicles feature module.

MOHD.HMS ENTERPRISE
"""

from typing import Any

from pydantic import BaseModel, Field


class VehicleCreate(BaseModel):
    """Schema for creating a vehicle."""
    plateNumber: str = Field(..., min_length=1, max_length=50)
    make: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    year: int | None = Field(default=None)
    vin: str | None = Field(default=None)
    fuelType: str | None = Field(default=None)
    status: str = Field(default="active")
    currentMileage: float | None = Field(default=None)
    nextServiceDate: str | None = Field(default=None)


class VehicleUpdate(BaseModel):
    """Schema for updating a vehicle."""
    plateNumber: str | None = Field(default=None)
    make: str | None = Field(default=None)
    model: str | None = Field(default=None)
    year: int | None = Field(default=None)
    vin: str | None = Field(default=None)
    fuelType: str | None = Field(default=None)
    status: str | None = Field(default=None)
    currentMileage: float | None = Field(default=None)
    nextServiceDate: str | None = Field(default=None)


class VehicleLogCreate(BaseModel):
    """Schema for creating a vehicle log entry."""
    vehicleId: str = Field(...)
    type: str = Field(...)
    date: str = Field(...)
    odometer: float | None = Field(default=None)
    quantity: float | None = Field(default=None)
    cost: float | None = Field(default=None)
    description: str | None = Field(default=None)
    location: str | None = Field(default=None)
    userId: str | None = Field(default=None)
