import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { id } = await params;

    // Verify the service item belongs to this tenant
    const serviceItem = await db.serviceItem.findFirst({
      where: { id, tenantId },
    });
    if (!serviceItem) {
      return NextResponse.json({ error: 'Service item not found' }, { status: 404 });
    }

    const materials = await db.serviceItemMaterial.findMany({
      where: { serviceItemId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ data: materials });
  } catch (error) {
    console.error('Service item materials list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { id } = await params;
    const body = await request.json();
    const { materialName, quantity, unit, estimatedConsumption, isMandatory, sortOrder } = body;

    if (!materialName) {
      return NextResponse.json({ error: 'Material name is required' }, { status: 400 });
    }

    // Verify the service item belongs to this tenant
    const serviceItem = await db.serviceItem.findFirst({
      where: { id, tenantId },
    });
    if (!serviceItem) {
      return NextResponse.json({ error: 'Service item not found' }, { status: 404 });
    }

    const material = await db.serviceItemMaterial.create({
      data: {
        serviceItemId: id,
        materialName,
        quantity: quantity || 1,
        unit: unit || 'pcs',
        estimatedConsumption: estimatedConsumption || null,
        isMandatory: isMandatory !== false,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('Service item material create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}