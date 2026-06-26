import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

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

function formatService(s: {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  category: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: s.id,
    tenantId: s.tenantId,
    name: s.name,
    slug: s.slug,
    description: s.description,
    image: s.image,
    icon: s.icon,
    category: s.category,
    status: s.status,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    displayOrder: s.displayOrder,
    isEnabled: s.isEnabled,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const { id } = await params;

    const service = await db.cmsService.findFirst({ where: { id, tenantId } });
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    return NextResponse.json({ data: formatService(service) });
  } catch (error) {
    console.error('CMS service GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    const existing = await db.cmsService.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    const updated = await db.cmsService.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.image !== undefined && { image: body.image || null }),
        ...(body.icon !== undefined && { icon: body.icon || null }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle || null }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription || null }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
      },
    });

    return NextResponse.json(formatService(updated));
  } catch (error) {
    console.error('CMS service PUT error:', error);
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

    const existing = await db.cmsService.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    await db.cmsService.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS service DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}