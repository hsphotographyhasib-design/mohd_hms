import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ─── GET: List categories with subcategory & item counts ───────────────────────
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

    const categories = await db.inventoryCategory.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: {
            subcategories: { where: includeInactive ? {} : { isActive: true } },
            items: { where: { isActive: true } },
          },
        },
      },
    });

    return NextResponse.json({
      data: categories.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        name: c.name,
        code: c.code,
        description: c.description,
        icon: c.icon,
        color: c.color,
        displayOrder: c.displayOrder,
        isActive: c.isActive,
        subcategoryCount: c._count.subcategories,
        itemCount: c._count.items,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Inventory categories list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create category ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Auto-assign displayOrder as max + 1
    const maxOrder = await db.inventoryCategory.findFirst({
      where: { tenantId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const category = await db.inventoryCategory.create({
      data: {
        tenantId,
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        icon: body.icon || null,
        color: body.color || null,
        displayOrder: body.displayOrder ?? ((maxOrder?.displayOrder ?? 0) + 1),
      },
    });

    return NextResponse.json({ ...category, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Inventory category create error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}