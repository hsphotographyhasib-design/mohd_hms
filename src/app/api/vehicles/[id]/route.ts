import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const vehicle = await db.vehicle.findFirst({
      where: { id, tenantId },
      include: {
        logs: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: vehicle.id,
      tenantId: vehicle.tenantId,
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      fuelType: vehicle.fuelType,
      status: vehicle.status,
      currentMileage: vehicle.currentMileage,
      nextServiceDate: vehicle.nextServiceDate?.toISOString(),
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
      logs: vehicle.logs.map((log) => ({
        id: log.id,
        vehicleId: log.vehicleId,
        userId: log.userId,
        type: log.type,
        date: log.date.toISOString(),
        odometer: log.odometer,
        quantity: log.quantity,
        cost: log.cost,
        description: log.description,
        location: log.location,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Vehicle get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.vehicle.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    const updated = await db.vehicle.update({
      where: { id },
      data: {
        ...(body.plateNumber && { plateNumber: body.plateNumber }),
        ...(body.make && { make: body.make }),
        ...(body.model && { model: body.model }),
        ...(body.year !== undefined && { year: body.year || null }),
        ...(body.vin !== undefined && { vin: body.vin || null }),
        ...(body.fuelType !== undefined && { fuelType: body.fuelType || null }),
        ...(body.status && { status: body.status }),
        ...(body.currentMileage !== undefined && { currentMileage: body.currentMileage || null }),
        ...(body.nextServiceDate !== undefined && { nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      plateNumber: updated.plateNumber,
      make: updated.make,
      model: updated.model,
      year: updated.year,
      vin: updated.vin,
      fuelType: updated.fuelType,
      status: updated.status,
      currentMileage: updated.currentMileage,
      nextServiceDate: updated.nextServiceDate?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Vehicle update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const existing = await db.vehicle.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    await db.vehicle.delete({ where: { id } });
    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Vehicle delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
