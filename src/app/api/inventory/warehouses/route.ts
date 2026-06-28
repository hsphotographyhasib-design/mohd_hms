import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ─── GET: List warehouses with stock count and total value ─────────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const sp = request.nextUrl.searchParams;
    const includeInactive = sp.get('includeInactive') === 'true';

    const where = { tenantId, ...(includeInactive ? {} : { isActive: true }) };

    const warehouses = await db.warehouse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        stocks: {
          include: {
            item: {
              select: { id: true, name: true, itemCode: true, averageCost: true, unit: true },
            },
          },
        },
        _count: { select: { stocks: true } },
      },
    });

    const data = warehouses.map((w) => {
      const totalValue = w.stocks.reduce((sum, s) => sum + (s.quantity * s.item.averageCost), 0);
      const totalItems = w.stocks.reduce((sum, s) => sum + s.quantity, 0);
      return {
        id: w.id,
        tenantId: w.tenantId,
        name: w.name,
        code: w.code,
        type: w.type,
        address: w.address,
        manager: w.manager,
        phone: w.phone,
        isActive: w.isActive,
        stockCount: w._count.stocks,
        totalItems,
        totalValue,
        stocks: w.stocks,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Warehouses list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create warehouse ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Warehouse name is required' }, { status: 400 });
    }

    const warehouse = await db.warehouse.create({
      data: {
        tenantId,
        name: body.name,
        code: body.code || null,
        type: body.type || 'main',
        address: body.address || null,
        manager: body.manager || null,
        phone: body.phone || null,
      },
    });

    return NextResponse.json({ ...warehouse, createdAt: warehouse.createdAt.toISOString(), updatedAt: warehouse.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Warehouse create error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Warehouse with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}