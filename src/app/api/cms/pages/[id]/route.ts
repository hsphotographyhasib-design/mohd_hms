import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyAuth } from '@/core/auth/auth-lib';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tenantId = auth.user.tenantId as string;
    const { id } = await params;

    const page = await db.cmsPage.findFirst({
      where: { id, tenantId },
      include: {
        template: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(formatPage(page));
  } catch (error) {
    console.error('CMS page GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tenantId = auth.user.tenantId as string;
    const { id } = await params;

    const existing = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, slug, pageData, seoData, status } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (slug !== undefined) {
      const finalSlug = slug.trim() || generateSlug(title || existing.title);
      // Check slug uniqueness if changed
      if (finalSlug !== existing.slug) {
        const slugExists = await db.cmsPage.findUnique({
          where: { tenantId_slug: { tenantId, slug: finalSlug } },
        });
        if (slugExists) {
          return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 });
        }
      }
      updateData.slug = finalSlug;
    }
    if (pageData !== undefined) {
      updateData.pageData = typeof pageData === 'string' ? pageData : JSON.stringify(pageData);
    }
    if (seoData !== undefined) {
      updateData.seoData = seoData ? (typeof seoData === 'string' ? seoData : JSON.stringify(seoData)) : null;
    }
    if (status !== undefined) {
      updateData.status = status;
      // Handle publish metadata
      if (status === 'published' && existing.status !== 'published') {
        updateData.publishedAt = new Date();
        updateData.publishedBy = auth.user.id as string;
      } else if (status !== 'published') {
        updateData.publishedAt = null;
        updateData.publishedBy = null;
      }
    }

    const updated = await db.cmsPage.update({
      where: { id },
      data: updateData,
      include: {
        template: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    // Auto-create revision when pageData is updated
    if (pageData !== undefined) {
      const revCount = await db.cmsPageRevision.count({ where: { pageId: id } });
      const newVersion = revCount + 1;
      await db.cmsPageRevision.create({
        data: {
          tenantId,
          pageId: id,
          pageData: typeof pageData === 'string' ? pageData : JSON.stringify(pageData),
          version: newVersion,
          label: 'Auto-save',
          createdBy: auth.user.id as string,
        },
      });
      // Update page version
      await db.cmsPage.update({
        where: { id },
        data: { version: newVersion },
      });
      updated.version = newVersion;
    }

    return NextResponse.json(formatPage(updated));
  } catch (error) {
    console.error('CMS page PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tenantId = auth.user.tenantId as string;
    const { id } = await params;

    const existing = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Revisions are deleted via cascade
    await db.cmsPage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS page DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tenantId = auth.user.tenantId as string;
    const { id } = await params;

    const existing = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Generate a unique slug for the duplicate
    let dupSlug = existing.slug + '-copy';
    let slugExists = await db.cmsPage.findUnique({
      where: { tenantId_slug: { tenantId, slug: dupSlug } },
    });
    let counter = 1;
    while (slugExists) {
      counter++;
      dupSlug = `${existing.slug}-copy-${counter}`;
      slugExists = await db.cmsPage.findUnique({
        where: { tenantId_slug: { tenantId, slug: dupSlug } },
      });
    }

    const duplicated = await db.cmsPage.create({
      data: {
        tenantId,
        title: `${existing.title} (Copy)`,
        slug: dupSlug,
        status: 'draft',
        pageData: existing.pageData,
        seoData: existing.seoData,
        templateId: existing.templateId,
        version: 1,
      },
      include: {
        template: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    // Create initial revision for duplicated page
    await db.cmsPageRevision.create({
      data: {
        tenantId,
        pageId: duplicated.id,
        pageData: duplicated.pageData,
        version: 1,
        label: 'Duplicated from ' + existing.title,
        createdBy: auth.user.id as string,
      },
    });

    return NextResponse.json(formatPage(duplicated), { status: 201 });
  } catch (error) {
    console.error('CMS page duplicate POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}