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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const category = request.nextUrl.searchParams.get('category') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsServiceWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.cmsService.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      db.cmsService.count({ where }),
    ]);

    const data = items.map(formatService);

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
    console.error('CMS services GET error:', error);
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
    const { name, description, image, icon, category, status, seoTitle, seoDescription, displayOrder, isEnabled, slug: customSlug } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = customSlug || generateSlug(name);

    const service = await db.cmsService.create({
      data: {
        tenantId,
        name,
        slug,
        description: description || null,
        image: image || null,
        icon: icon || null,
        category: category || null,
        status: status || 'draft',
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        displayOrder: displayOrder ?? 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    });

    return NextResponse.json(formatService(service), { status: 201 });
  } catch (error) {
    console.error('CMS services POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}