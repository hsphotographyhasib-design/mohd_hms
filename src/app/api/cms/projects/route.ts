import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatProject(p: {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  featuredImage: string | null;
  images: string | null;
  beforeAfterImages: string | null;
  completionStatus: string;
  isFeatured: boolean;
  galleryImages: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    title: p.title,
    slug: p.slug,
    description: p.description,
    category: p.category,
    featuredImage: p.featuredImage,
    images: p.images,
    beforeAfterImages: p.beforeAfterImages,
    completionStatus: p.completionStatus,
    isFeatured: p.isFeatured,
    galleryImages: p.galleryImages,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    displayOrder: p.displayOrder,
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() ?? null,
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
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const category = request.nextUrl.searchParams.get('category') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const isFeatured = request.nextUrl.searchParams.get('isFeatured');
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsProjectWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (isFeatured !== null && isFeatured !== '' && isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true';
    }

    const [items, total] = await Promise.all([
      db.cmsProject.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      db.cmsProject.count({ where }),
    ]);

    const data = items.map(formatProject);

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
    console.error('CMS projects GET error:', error);
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
    const {
      title,
      description,
      category,
      featuredImage,
      images,
      beforeAfterImages,
      completionStatus,
      isFeatured,
      galleryImages,
      seoTitle,
      seoDescription,
      displayOrder,
      status,
      publishedAt,
      slug: customSlug,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = customSlug || generateSlug(title);

    const project = await db.cmsProject.create({
      data: {
        tenantId,
        title,
        slug,
        description: description || null,
        category: category || null,
        featuredImage: featuredImage || null,
        images: images || null,
        beforeAfterImages: beforeAfterImages || null,
        completionStatus: completionStatus || 'planned',
        isFeatured: isFeatured ?? false,
        galleryImages: galleryImages || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        displayOrder: displayOrder ?? 0,
        status: status || 'draft',
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    });

    return NextResponse.json(formatProject(project), { status: 201 });
  } catch (error) {
    console.error('CMS projects POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}