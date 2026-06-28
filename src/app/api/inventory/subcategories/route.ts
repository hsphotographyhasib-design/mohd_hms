import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ─── GET: List subcategories, optionally filtered by categoryId ────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const sp = request.nextUrl.searchParams;
    const categoryId = sp.get('categoryId') || '';
    const includeInactive = sp.get('includeInactive') === 'true';

    const where: Record<string, unknown> = { tenantId };
    if (categoryId) where.categoryId = categoryId;
    if (!includeInactive) where.isActive = true;

    const subcategories = await db.inventorySubcategory.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        category: { select: { id: true, name: true, code: true } },
        _count: { select: { items: { where: { isActive: true } } } },
      },
    });

    return NextResponse.json({
      data: subcategories.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        categoryId: s.categoryId,
        category: s.category,
        name: s.name,
        code: s.code,
        description: s.description,
        displayOrder: s.displayOrder,
        isActive: s.isActive,
        itemCount: s._count.items,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Inventory subcategories list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create subcategory ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();

    if (!body.name || !body.categoryId) {
      return NextResponse.json({ error: 'Name and categoryId are required' }, { status: 400 });
    }

    // Verify category exists and belongs to tenant
    const category = await db.inventoryCategory.findFirst({ where: { id: body.categoryId, tenantId } });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const maxOrder = await db.inventorySubcategory.findFirst({
      where: { tenantId, categoryId: body.categoryId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const subcategory = await db.inventorySubcategory.create({
      data: {
        tenantId,
        categoryId: body.categoryId,
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        displayOrder: body.displayOrder ?? ((maxOrder?.displayOrder ?? 0) + 1),
      },
      include: { category: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ ...subcategory, createdAt: subcategory.createdAt.toISOString(), updatedAt: subcategory.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Inventory subcategory create error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Subcategory with this name already exists in this category' }, { status: 409 });
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2003') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}