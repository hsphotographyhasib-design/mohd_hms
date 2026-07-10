import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

// ─── PUT: Update category ──────────────────────────────────────────────────────
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

    const existing = await db.inventoryCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const updated = await db.inventoryCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.icon !== undefined && { icon: body.icon || null }),
        ...(body.color !== undefined && { color: body.color || null }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    console.error('Inventory category update error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Delete category (only if no items) ────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;

    const existing = await db.inventoryCategory.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { items: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    if (existing._count.items > 0) {
      return NextResponse.json({ error: 'Cannot delete category with associated items. Reassign or remove items first.' }, { status: 400 });
    }

    await db.inventoryCategory.delete({ where: { id } });
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Inventory category delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}