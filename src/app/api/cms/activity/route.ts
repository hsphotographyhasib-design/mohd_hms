import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
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

function formatActivityLog(a: {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  section: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    tenantId: a.tenantId,
    userId: a.userId,
    action: a.action,
    section: a.section,
    details: a.details,
    ipAddress: a.ipAddress,
    createdAt: a.createdAt.toISOString(),
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
    const section = request.nextUrl.searchParams.get('section') || '';
    const action = request.nextUrl.searchParams.get('action') || '';
    const userId = request.nextUrl.searchParams.get('userId') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsActivityLogWhereInput = { tenantId };

    if (section) where.section = section;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      db.cmsActivityLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.cmsActivityLog.count({ where }),
    ]);

    const data = items.map(formatActivityLog);

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
    console.error('CMS activity logs GET error:', error);
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
    const { action, section, details, userId: bodyUserId, ipAddress } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const headersList = await headers();
    const ip = ipAddress || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;

    const activityLog = await db.cmsActivityLog.create({
      data: {
        tenantId,
        userId: bodyUserId || user.userId || user.id || null,
        action,
        section: section || null,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        ipAddress: ip,
      },
    });

    return NextResponse.json(formatActivityLog(activityLog), { status: 201 });
  } catch (error) {
    console.error('CMS activity logs POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}