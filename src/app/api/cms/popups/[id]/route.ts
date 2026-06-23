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

function formatPopup(p: {
  id: string;
  tenantId: string;
  title: string;
  content: string | null;
  type: string;
  imageUrl: string | null;
  frequency: string;
  isEnabled: boolean;
  scheduledFrom: Date | null;
  scheduledTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    title: p.title,
    content: p.content,
    type: p.type,
    imageUrl: p.imageUrl,
    frequency: p.frequency,
    isEnabled: p.isEnabled,
    scheduledFrom: p.scheduledFrom?.toISOString() ?? null,
    scheduledTo: p.scheduledTo?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
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

    const popup = await db.cmsPopup.findFirst({ where: { id, tenantId } });
    if (!popup) return NextResponse.json({ error: 'Popup not found' }, { status: 404 });

    return NextResponse.json({ data: formatPopup(popup) });
  } catch (error) {
    console.error('CMS popup GET by id error:', error);
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

    const existing = await db.cmsPopup.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Popup not found' }, { status: 404 });

    const updated = await db.cmsPopup.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content || null }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
        ...(body.frequency !== undefined && { frequency: body.frequency }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.scheduledFrom !== undefined && { scheduledFrom: body.scheduledFrom ? new Date(body.scheduledFrom) : null }),
        ...(body.scheduledTo !== undefined && { scheduledTo: body.scheduledTo ? new Date(body.scheduledTo) : null }),
      },
    });

    return NextResponse.json(formatPopup(updated));
  } catch (error) {
    console.error('CMS popup PUT error:', error);
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

    const existing = await db.cmsPopup.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Popup not found' }, { status: 404 });

    await db.cmsPopup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS popup DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}