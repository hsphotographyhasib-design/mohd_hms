import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ─── GET: List entries for a price book ───────────────────────────────────────
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
    const { id: priceBookId } = await params;

    // Verify price book exists
    const pb = await db.priceBook.findFirst({ where: { id: priceBookId, tenantId } });
    if (!pb) return NextResponse.json({ error: 'Price book not found' }, { status: 404 });

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page') || '1');
    const pageSize = parseInt(sp.get('pageSize') || '50');
    const search = sp.get('search') || '';
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { priceBookId, tenantId };

    if (search) {
      where.item = {
        OR: [
          { name: { contains: search } },
          { itemCode: { contains: search } },
          { sku: { contains: search } },
        ],
      };
    }

    const [entries, total] = await Promise.all([
      db.priceBookEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, itemCode: true, sku: true, unit: true, averageCost: true, sellingPrice: true } },
        },
      }),
      db.priceBookEntry.count({ where }),
    ]);

    return NextResponse.json({
      data: entries.map((e) => ({
        ...e,
        effectiveFrom: e.effectiveFrom?.toISOString() || null,
        effectiveTo: e.effectiveTo?.toISOString() || null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Price book entries list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Add entry to price book ─────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id: priceBookId } = await params;
    const body = await request.json();

    if (!body.itemId || body.price === undefined) {
      return NextResponse.json({ error: 'itemId and price are required' }, { status: 400 });
    }

    // Verify price book and item exist
    const pb = await db.priceBook.findFirst({ where: { id: priceBookId, tenantId } });
    if (!pb) return NextResponse.json({ error: 'Price book not found' }, { status: 404 });

    const item = await db.inventoryItem.findFirst({ where: { id: body.itemId, tenantId } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const entry = await db.priceBookEntry.create({
      data: {
        tenantId,
        priceBookId,
        itemId: body.itemId,
        price: body.price,
        discount: body.discount || 0,
        currency: body.currency || 'BND',
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      },
      include: {
        item: { select: { id: true, name: true, itemCode: true, sku: true, unit: true } },
      },
    });

    return NextResponse.json({
      ...entry,
      effectiveFrom: entry.effectiveFrom?.toISOString() || null,
      effectiveTo: entry.effectiveTo?.toISOString() || null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Price book entry create error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This item already exists in this price book. Use PUT to update.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update entry ────────────────────────────────────────────────────────
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
    const { id: priceBookId } = await params;
    const body = await request.json();

    if (!body.entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }

    const existing = await db.priceBookEntry.findFirst({
      where: { id: body.entryId, priceBookId, tenantId },
    });
    if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const updated = await db.priceBookEntry.update({
      where: { id: existing.id },
      data: {
        ...(body.price !== undefined && { price: body.price }),
        ...(body.discount !== undefined && { discount: body.discount }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.effectiveFrom !== undefined && { effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null }),
        ...(body.effectiveTo !== undefined && { effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null }),
      },
      include: {
        item: { select: { id: true, name: true, itemCode: true, sku: true, unit: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      effectiveFrom: updated.effectiveFrom?.toISOString() || null,
      effectiveTo: updated.effectiveTo?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Price book entry update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Remove entry ─────────────────────────────────────────────────────
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
    const { id: priceBookId } = await params;
    const entryId = request.nextUrl.searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: 'entryId query parameter is required' }, { status: 400 });
    }

    const existing = await db.priceBookEntry.findFirst({
      where: { id: entryId, priceBookId, tenantId },
    });
    if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    await db.priceBookEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ message: 'Entry removed successfully' });
  } catch (error) {
    console.error('Price book entry delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}