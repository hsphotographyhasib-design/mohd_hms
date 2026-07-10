import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

// ─── GET: List price books with entry count ────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const sp = request.nextUrl.searchParams;
    const includeInactive = sp.get('includeInactive') === 'true';

    const where = { tenantId, ...(includeInactive ? {} : { isActive: true }) };

    const priceBooks = await db.priceBook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json({
      data: priceBooks.map((pb) => ({
        id: pb.id,
        tenantId: pb.tenantId,
        name: pb.name,
        code: pb.code,
        description: pb.description,
        isDefault: pb.isDefault,
        isActive: pb.isActive,
        entryCount: pb._count.entries,
        createdAt: pb.createdAt.toISOString(),
        updatedAt: pb.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Price books list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create price book ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Price book name is required' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await db.priceBook.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const priceBook = await db.priceBook.create({
      data: {
        tenantId,
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        isDefault: body.isDefault || false,
      },
    });

    return NextResponse.json({ ...priceBook, createdAt: priceBook.createdAt.toISOString(), updatedAt: priceBook.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Price book create error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Price book with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}