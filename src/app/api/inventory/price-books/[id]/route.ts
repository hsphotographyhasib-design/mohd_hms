import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

// ─── GET: Price book with entries ─────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;

    const priceBook = await db.priceBook.findFirst({
      where: { id, tenantId },
      include: {
        entries: {
          include: {
            item: { select: { id: true, name: true, itemCode: true, sku: true, unit: true, averageCost: true, sellingPrice: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!priceBook) return NextResponse.json({ error: 'Price book not found' }, { status: 404 });

    return NextResponse.json({
      ...priceBook,
      entries: priceBook.entries.map((e) => ({
        ...e,
        effectiveFrom: e.effectiveFrom?.toISOString() || null,
        effectiveTo: e.effectiveTo?.toISOString() || null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      createdAt: priceBook.createdAt.toISOString(),
      updatedAt: priceBook.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Price book get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update price book ───────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.priceBook.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Price book not found' }, { status: 404 });

    // If setting as default, unset other defaults
    if (body.isDefault && !existing.isDefault) {
      await db.priceBook.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await db.priceBook.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    console.error('Price book update error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Price book with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Delete price book ────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;

    const existing = await db.priceBook.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Price book not found' }, { status: 404 });

    await db.priceBook.delete({ where: { id } });
    return NextResponse.json({ message: 'Price book deleted successfully' });
  } catch (error) {
    console.error('Price book delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}