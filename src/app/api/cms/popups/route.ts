import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const isEnabled = request.nextUrl.searchParams.get('isEnabled');
    const type = request.nextUrl.searchParams.get('type') || '';

    const where: Prisma.CmsPopupWhereInput = { tenantId };

    if (isEnabled !== null && isEnabled !== undefined && isEnabled !== '') {
      where.isEnabled = isEnabled === 'true';
    }
    if (type) where.type = type;

    const items = await db.cmsPopup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: items.map(formatPopup) });
  } catch (error) {
    console.error('CMS popups GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const body = await request.json();
    const { title, content, type, imageUrl, frequency, isEnabled, scheduledFrom, scheduledTo } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const popup = await db.cmsPopup.create({
      data: {
        tenantId,
        title,
        content: content || null,
        type: type || 'welcome',
        imageUrl: imageUrl || null,
        frequency: frequency || 'once',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        scheduledFrom: scheduledFrom ? new Date(scheduledFrom) : null,
        scheduledTo: scheduledTo ? new Date(scheduledTo) : null,
      },
    });

    return NextResponse.json(formatPopup(popup), { status: 201 });
  } catch (error) {
    console.error('CMS popups POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}