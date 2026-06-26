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

    const item = await db.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: item.id,
      tenantId: item.tenantId,
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      minStock: item.minStock,
      unitCost: item.unitCost,
      supplier: item.supplier,
      location: item.location,
      photos: item.photos,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Inventory get error:', error);
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

    const existing = await db.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });

    const updated = await db.inventoryItem.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.sku !== undefined && { sku: body.sku || null }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.unit && { unit: body.unit }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.minStock !== undefined && { minStock: body.minStock }),
        ...(body.unitCost !== undefined && { unitCost: body.unitCost }),
        ...(body.supplier !== undefined && { supplier: body.supplier || null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.photos !== undefined && { photos: body.photos || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      sku: updated.sku,
      category: updated.category,
      description: updated.description,
      unit: updated.unit,
      quantity: updated.quantity,
      minStock: updated.minStock,
      unitCost: updated.unitCost,
      supplier: updated.supplier,
      location: updated.location,
      photos: updated.photos,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Inventory update error:', error);
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

    const existing = await db.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });

    await db.inventoryItem.delete({ where: { id } });
    return NextResponse.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Inventory delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
