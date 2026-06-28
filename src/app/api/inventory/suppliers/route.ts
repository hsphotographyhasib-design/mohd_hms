import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ─── GET: List all item suppliers across items, with search ────────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const sp = request.nextUrl.searchParams;

    const page = parseInt(sp.get('page') || '1');
    const pageSize = parseInt(sp.get('pageSize') || '20');
    const search = sp.get('search') || '';
    const itemId = sp.get('itemId') || '';
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId, isActive: true };

    if (search) {
      where.OR = [
        { supplierName: { contains: search, mode: 'insensitive' } },
        { supplierCode: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (itemId) where.itemId = itemId;

    const [suppliers, total] = await Promise.all([
      db.itemSupplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, itemCode: true, sku: true, unit: true } },
        },
      }),
      db.itemSupplier.count({ where }),
    ]);

    return NextResponse.json({
      data: suppliers.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Item suppliers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create item supplier ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();

    if (!body.itemId || !body.supplierName) {
      return NextResponse.json({ error: 'itemId and supplierName are required' }, { status: 400 });
    }

    // Verify item exists
    const item = await db.inventoryItem.findFirst({ where: { id: body.itemId, tenantId } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const supplier = await db.itemSupplier.create({
      data: {
        tenantId,
        itemId: body.itemId,
        supplierName: body.supplierName,
        supplierCode: body.supplierCode || null,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        leadTimeDays: body.leadTimeDays || 0,
        purchasePrice: body.purchasePrice || 0,
        moq: body.moq || 1,
        warranty: body.warranty || null,
        paymentTerms: body.paymentTerms || null,
        rating: body.rating || null,
        isPrimary: body.isPrimary || false,
      },
      include: {
        item: { select: { id: true, name: true, itemCode: true, sku: true } },
      },
    });

    return NextResponse.json({ ...supplier, createdAt: supplier.createdAt.toISOString(), updatedAt: supplier.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Item supplier create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}