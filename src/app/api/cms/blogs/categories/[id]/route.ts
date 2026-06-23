import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';

async function getAuthUser() {
  const headersList = await headers();
  const auth = headersList.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

function isAdmin(user: JwtPayload | null): user is JwtPayload {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'admin';
}

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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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