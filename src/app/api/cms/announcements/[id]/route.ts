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

function formatAnnouncement(a: {
  id: string;
  tenantId: string;
  text: string;
  type: string;
  link: string | null;
  isEnabled: boolean;
  scheduledFrom: Date | null;
  scheduledTo: Date | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: a.id,
    tenantId: a.tenantId,
    text: a.text,
    type: a.type,
    link: a.link,
    isEnabled: a.isEnabled,
    scheduledFrom: a.scheduledFrom?.toISOString() ?? null,
    scheduledTo: a.scheduledTo?.toISOString() ?? null,
    displayOrder: a.displayOrder,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
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

    const announcement = await db.cmsAnnouncement.findFirst({ where: { id, tenantId } });
    if (!announcement) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

    return NextResponse.json({ data: formatAnnouncement(announcement) });
  } catch (error) {
    console.error('CMS announcement GET by id error:', error);
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

    const existing = await db.cmsAnnouncement.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

    const updated = await db.cmsAnnouncement.update({
      where: { id },
      data: {
        ...(body.text !== undefined && { text: body.text }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.link !== undefined && { link: body.link || null }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.scheduledFrom !== undefined && { scheduledFrom: body.scheduledFrom ? new Date(body.scheduledFrom) : null }),
        ...(body.scheduledTo !== undefined && { scheduledTo: body.scheduledTo ? new Date(body.scheduledTo) : null }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
      },
    });

    return NextResponse.json(formatAnnouncement(updated));
  } catch (error) {
    console.error('CMS announcement PUT error:', error);
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

    const existing = await db.cmsAnnouncement.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

    await db.cmsAnnouncement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS announcement DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}