import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
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

// GET /api/cms/builder/pages/[id] — Get single page with full schema
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const tenantId = user.tenantId as string;

    const page = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ data: formatPage(page) });
  } catch (error) {
    console.error('CMS Builder Page GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/cms/builder/pages/[id] — Update page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const tenantId = user.tenantId as string;
    const body = await request.json();

    const existing = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const allowedFields: Record<string, unknown> = {};
    const updatableFields = [
      'title', 'slug', 'status', 'template', 'schema',
      'seoTitle', 'seoDesc', 'ogImage', 'canonical', 'schemaMarkup',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === 'schema') {
          allowedFields[field] = typeof body[field] === 'string'
            ? body[field]
            : JSON.stringify(body[field]);
        } else {
          allowedFields[field] = body[field];
        }
      }
    }

    if (allowedFields.slug) {
      const slug = (allowedFields.slug as string)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .trim();
      if (slug !== existing.slug) {
        const slugTaken = await db.cmsPage.findFirst({
          where: { slug, tenantId, id: { not: id } },
        });
        if (slugTaken) {
          return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
        }
        allowedFields.slug = slug;
      }
    }

    if (allowedFields.status && !['draft', 'published', 'archived'].includes(allowedFields.status as string)) {
      return NextResponse.json({ error: 'Invalid status. Must be draft, published, or archived' }, { status: 400 });
    }

    const updated = await db.cmsPage.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json({ data: formatPage(updated) });
  } catch (error) {
    console.error('CMS Builder Page PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cms/builder/pages/[id] — Delete page and cascade revisions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const tenantId = user.tenantId as string;

    const existing = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Revisions are cascade-deleted via the schema relation
    await db.cmsPage.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('CMS Builder Page DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}