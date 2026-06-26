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

function formatIndustry(i: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  displayOrder: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: i.id,
    tenantId: i.tenantId,
    name: i.name,
    description: i.description,
    image: i.image,
    icon: i.icon,
    displayOrder: i.displayOrder,
    isEnabled: i.isEnabled,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
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
    const search = request.nextUrl.searchParams.get('search') || '';
    const isEnabled = request.nextUrl.searchParams.get('isEnabled');
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsIndustryWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (isEnabled !== null && isEnabled !== undefined && isEnabled !== '') {
      where.isEnabled = isEnabled === 'true';
    }

    const [items, total] = await Promise.all([
      db.cmsIndustry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      db.cmsIndustry.count({ where }),
    ]);

    const data = items.map(formatIndustry);

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
    console.error('CMS industries GET error:', error);
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
    const { name, description, image, icon, displayOrder, isEnabled } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const industry = await db.cmsIndustry.create({
      data: {
        tenantId,
        name,
        description: description || null,
        image: image || null,
        icon: icon || null,
        displayOrder: displayOrder ?? 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    });

    return NextResponse.json(formatIndustry(industry), { status: 201 });
  } catch (error) {
    console.error('CMS industries POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}