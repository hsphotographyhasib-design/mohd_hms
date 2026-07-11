import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

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
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

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
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

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