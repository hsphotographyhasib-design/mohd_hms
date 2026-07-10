import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

function formatCategory(c: {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    tenantId: c.tenantId,
    name: c.name,
    slug: c.slug,
    description: c.description,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.cmsBlogCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const updated = await db.cmsBlogCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description || null }),
      },
    });

    return NextResponse.json(formatCategory(updated));
  } catch (error) {
    console.error('CMS blog category PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;

    const existing = await db.cmsBlogCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    await db.cmsBlogCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS blog category DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}