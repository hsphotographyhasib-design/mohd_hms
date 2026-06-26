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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const isEnabled = request.nextUrl.searchParams.get('isEnabled');
    const type = request.nextUrl.searchParams.get('type') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsAnnouncementWhereInput = { tenantId };

    if (isEnabled !== null && isEnabled !== undefined && isEnabled !== '') {
      where.isEnabled = isEnabled === 'true';
    }
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      db.cmsAnnouncement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      db.cmsAnnouncement.count({ where }),
    ]);

    const data = items.map(formatAnnouncement);

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('CMS announcements GET error:', error);
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
    const { text, type, link, isEnabled, scheduledFrom, scheduledTo, displayOrder } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const announcement = await db.cmsAnnouncement.create({
      data: {
        tenantId,
        text,
        type: type || 'info',
        link: link || null,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        scheduledFrom: scheduledFrom ? new Date(scheduledFrom) : null,
        scheduledTo: scheduledTo ? new Date(scheduledTo) : null,
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json(formatAnnouncement(announcement), { status: 201 });
  } catch (error) {
    console.error('CMS announcements POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}