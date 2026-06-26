import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
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

    const blog = await db.cmsBlog.findFirst({
      where: { id, tenantId },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

    // Increment viewCount by 1
    const updated = await db.cmsBlog.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json({ data: formatBlog(updated as Parameters<typeof formatBlog>[0]) });
  } catch (error) {
    console.error('CMS blog GET by id error:', error);
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

    const existing = await db.cmsBlog.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

    const updated = await db.cmsBlog.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.excerpt !== undefined && { excerpt: body.excerpt || null }),
        ...(body.content !== undefined && { content: body.content || null }),
        ...(body.featuredImage !== undefined && { featuredImage: body.featuredImage || null }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
        ...(body.authorId !== undefined && { authorId: body.authorId || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle || null }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription || null }),
        ...(body.seoKeywords !== undefined && { seoKeywords: body.seoKeywords || null }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt ? new Date(body.publishedAt) : null }),
        ...(body.scheduledAt !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json(formatBlog(updated as Parameters<typeof formatBlog>[0]));
  } catch (error) {
    console.error('CMS blog PUT error:', error);
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

    const existing = await db.cmsBlog.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

    await db.cmsBlog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS blog DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}