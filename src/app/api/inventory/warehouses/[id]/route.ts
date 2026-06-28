import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ─── GET: Warehouse with stock items ───────────────────────────────────────────
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

    const warehouse = await db.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        stocks: {
          include: {
            item: {
              select: {
                id: true, name: true, itemCode: true, sku: true, unit: true,
                averageCost: true, sellingPrice: true, itemType: true, status: true,
                category: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    });

    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    const totalValue = warehouse.stocks.reduce((sum, s) => sum + (s.quantity * s.item.averageCost), 0);
    const totalItems = warehouse.stocks.reduce((sum, s) => sum + s.quantity, 0);

    return NextResponse.json({
      ...warehouse,
      totalItems,
      totalValue,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Warehouse get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update warehouse ─────────────────────────────────────────────────────
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

    const existing = await db.warehouse.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    const updated = await db.warehouse.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code || null }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.manager !== undefined && { manager: body.manager || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    console.error('Warehouse update error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Warehouse with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Soft delete warehouse ─────────────────────────────────────────────
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

    const existing = await db.warehouse.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    await db.warehouse.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Warehouse archived successfully' });
  } catch (error) {
    console.error('Warehouse delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}