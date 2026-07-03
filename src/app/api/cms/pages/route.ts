import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatPage(p: {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  status: string;
  pageData: string;
  seoData: string | null;
  templateId: string | null;
  version: number;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  template?: { id: string; name: string; thumbnail: string | null } | null;
}) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    title: p.title,
    slug: p.slug,
    status: p.status,
    pageData: p.pageData,
    seoData: p.seoData,
    templateId: p.templateId,
    version: p.version,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    publishedBy: p.publishedBy,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    template: p.template
      ? { id: p.template.id, name: p.template.name, thumbnail: p.template.thumbnail }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tenantId = auth.user.tenantId as string;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [pages, total] = await Promise.all([
      db.cmsPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          template: { select: { id: true, name: true, thumbnail: true } },
        },
      }),
      db.cmsPage.count({ where }),
    ]);

    return NextResponse.json({
      pages: pages.map(formatPage),
      total,
    });
  } catch (error) {
    console.error('CMS pages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tenantId = auth.user.tenantId as string;

    const body = await request.json();
    const { title, slug, pageData, seoData, templateId, status } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const finalSlug = slug?.trim() || generateSlug(title);

    // Check slug uniqueness
    const existing = await db.cmsPage.findUnique({
      where: { tenantId_slug: { tenantId, slug: finalSlug } },
    });
    if (existing) {
      return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 });
    }

    const page = await db.cmsPage.create({
      data: {
        tenantId,
        title: title.trim(),
        slug: finalSlug,
        status: status || 'draft',
        pageData: typeof pageData === 'string' ? pageData : JSON.stringify(pageData || {}),
        seoData: seoData ? (typeof seoData === 'string' ? seoData : JSON.stringify(seoData)) : null,
        templateId: templateId || null,
        version: 1,
      },
      include: {
        template: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    // Create initial revision
    await db.cmsPageRevision.create({
      data: {
        tenantId,
        pageId: page.id,
        pageData: page.pageData,
        version: 1,
        label: 'Initial version',
        createdBy: auth.user.id as string,
      },
    });

    return NextResponse.json(formatPage(page), { status: 201 });
  } catch (error) {
    console.error('CMS pages POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}