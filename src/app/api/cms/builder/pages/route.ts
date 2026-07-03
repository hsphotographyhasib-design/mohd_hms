import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function ensureUniqueSlug(tenantId: string, slug: string): Promise<string> {
  const existing = await db.cmsPage.findFirst({
    where: { slug, tenantId },
  });
  if (!existing) return slug;

  let counter = 1;
  let newSlug = `${slug}-${counter}`;
  while (await db.cmsPage.findFirst({ where: { slug: newSlug, tenantId } })) {
    counter++;
    newSlug = `${slug}-${counter}`;
  }
  return newSlug;
}

function formatPage(page: {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  status: string;
  template: string | null;
  schema: string;
  seoTitle: string | null;
  seoDesc: string | null;
  ogImage: string | null;
  canonical: string | null;
  schemaMarkup: string | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: page.id,
    tenantId: page.tenantId,
    title: page.title,
    slug: page.slug,
    status: page.status,
    template: page.template,
    schema: page.schema,
    seoTitle: page.seoTitle,
    seoDesc: page.seoDesc,
    ogImage: page.ogImage,
    canonical: page.canonical,
    schemaMarkup: page.schemaMarkup,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    publishedBy: page.publishedBy,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

// GET /api/cms/builder/pages — List all pages for tenant
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = { tenantId };

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      (where as Record<string, unknown>).status = status;
    }

    if (search) {
      (where as Record<string, unknown>).OR = [
        { title: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    const pages = await db.cmsPage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        title: true,
        slug: true,
        status: true,
        template: true,
        schema: true,
        seoTitle: true,
        seoDesc: true,
        ogImage: true,
        canonical: true,
        schemaMarkup: true,
        publishedAt: true,
        publishedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: pages.map(formatPage) });
  } catch (error) {
    console.error('CMS Builder Pages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cms/builder/pages — Create new page
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const body = await request.json();
    const {
      title,
      slug: customSlug,
      status,
      template,
      schema,
      seoTitle,
      seoDesc,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let slug = customSlug
      ? customSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').trim()
      : generateSlug(title);

    if (!slug) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    slug = await ensureUniqueSlug(tenantId, slug);

    const schemaStr = typeof schema === 'string' ? schema : JSON.stringify(schema || []);

    const page = await db.cmsPage.create({
      data: {
        tenantId,
        title: title.trim(),
        slug,
        status: status && ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
        template: template || null,
        schema: schemaStr,
        seoTitle: seoTitle || null,
        seoDesc: seoDesc || null,
      },
    });

    return NextResponse.json(formatPage(page as Parameters<typeof formatPage>[0]), { status: 201 });
  } catch (error) {
    console.error('CMS Builder Pages POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}