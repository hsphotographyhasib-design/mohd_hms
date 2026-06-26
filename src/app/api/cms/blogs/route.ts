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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatBlog(b: {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featuredImage: string | null;
  categoryId: string | null;
  authorId: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  isFeatured: boolean;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; slug: string } | null;
}) {
  return {
    id: b.id,
    tenantId: b.tenantId,
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt,
    content: b.content,
    featuredImage: b.featuredImage,
    categoryId: b.categoryId,
    authorId: b.authorId,
    status: b.status,
    seoTitle: b.seoTitle,
    seoDescription: b.seoDescription,
    seoKeywords: b.seoKeywords,
    isFeatured: b.isFeatured,
    publishedAt: b.publishedAt?.toISOString() ?? null,
    scheduledAt: b.scheduledAt?.toISOString() ?? null,
    viewCount: b.viewCount,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    category: b.category ? { id: b.category.id, name: b.category.name, slug: b.category.slug } : null,
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
    const status = request.nextUrl.searchParams.get('status') || '';
    const categoryId = request.nextUrl.searchParams.get('categoryId') || '';
    const isFeatured = request.nextUrl.searchParams.get('isFeatured');
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsBlogWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (isFeatured !== null && isFeatured !== '' && isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true';
    }

    const [items, total] = await Promise.all([
      db.cmsBlog.findMany({
        where,
        skip,
        take: pageSize,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.cmsBlog.count({ where }),
    ]);

    const data = items.map(formatBlog);

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
    console.error('CMS blogs GET error:', error);
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
      excerpt,
      content,
      featuredImage,
      categoryId,
      authorId,
      status,
      seoTitle,
      seoDescription,
      seoKeywords,
      isFeatured,
      publishedAt,
      scheduledAt,
      slug: customSlug,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = customSlug || generateSlug(title);

    const blog = await db.cmsBlog.create({
      data: {
        tenantId,
        title,
        slug,
        excerpt: excerpt || null,
        content: content || null,
        featuredImage: featuredImage || null,
        categoryId: categoryId || null,
        authorId: authorId || null,
        status: status || 'draft',
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null,
        isFeatured: isFeatured ?? false,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        viewCount: 0,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json(formatBlog(blog as Parameters<typeof formatBlog>[0]), { status: 201 });
  } catch (error) {
    console.error('CMS blogs POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}