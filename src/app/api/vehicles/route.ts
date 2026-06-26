import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.VehicleWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { plateNumber: { contains: search } },
        { make: { contains: search } },
        { model: { contains: search } },
        { vin: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.vehicle.count({ where }),
    ]);

    const data = items.map((v) => ({
      id: v.id,
      tenantId: v.tenantId,
      plateNumber: v.plateNumber,
      make: v.make,
      model: v.model,
      year: v.year,
      vin: v.vin,
      fuelType: v.fuelType,
      status: v.status,
      currentMileage: v.currentMileage,
      nextServiceDate: v.nextServiceDate?.toISOString(),
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Vehicles list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { plateNumber, make, model, year, vin, fuelType, status, currentMileage, nextServiceDate } = body;

    if (!plateNumber || !make || !model) {
      return NextResponse.json({ error: 'Plate number, make, and model are required' }, { status: 400 });
    }

    const vehicle = await db.vehicle.create({
      data: {
        tenantId,
        plateNumber,
        make,
        model,
        year: year || null,
        vin: vin || null,
        fuelType: fuelType || null,
        status: status || 'active',
        currentMileage: currentMileage || null,
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      },
    });

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
    }, { status: 201 });
  } catch (error) {
    console.error('Vehicle create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
