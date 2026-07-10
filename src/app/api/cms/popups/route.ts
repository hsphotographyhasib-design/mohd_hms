import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

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
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

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
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

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