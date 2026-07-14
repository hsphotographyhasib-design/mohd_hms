import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

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
    category: (b as any).CmsBlogCategory ? { id: (b as any).CmsBlogCategory.id, name: (b as any).CmsBlogCategory.name, slug: (b as any).CmsBlogCategory.slug } : null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id } = await params;

    const blog = await db.cmsBlog.findFirst({
      where: { id, tenantId },
      include: { CmsBlogCategory: { select: { id: true, name: true, slug: true } } },
    });
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

    // Increment viewCount by 1
    const updated = await db.cmsBlog.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { CmsBlogCategory: { select: { id: true, name: true, slug: true } } },
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
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

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
      include: { CmsBlogCategory: { select: { id: true, name: true, slug: true } } },
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
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

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