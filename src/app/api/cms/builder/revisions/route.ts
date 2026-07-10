import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

function formatRevision(r: {
  id: string;
  tenantId: string;
  pageId: string;
  pageData: string;
  version: number;
  label: string | null;
  createdBy: string | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    pageId: r.pageId,
    pageData: r.pageData,
    version: r.version,
    label: r.label,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({ error: 'pageId query parameter is required' }, { status: 400 });
    }

    // Verify the page belongs to the tenant
    const page = await db.cmsPage.findFirst({
      where: { id: pageId, tenantId },
    });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const revisions = await db.cmsPageRevision.findMany({
      where: { tenantId, pageId },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json({
      revisions: revisions.map(formatRevision),
      total: revisions.length,
    });
  } catch (error) {
    console.error('CMS revisions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const body = await request.json();
    const { action, pageId, revisionId, pageData, label } = body;

    // Restore action
    if (action === 'restore') {
      if (!pageId || !revisionId) {
        return NextResponse.json(
          { error: 'pageId and revisionId are required for restore' },
          { status: 400 }
        );
      }

      // Verify page belongs to tenant
      const page = await db.cmsPage.findFirst({
        where: { id: pageId, tenantId },
      });
      if (!page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }

      // Get the revision
      const revision = await db.cmsPageRevision.findFirst({
        where: { id: revisionId, tenantId, pageId },
      });
      if (!revision) {
        return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
      }

      // Restore: update page with revision data
      const updated = await db.cmsPage.update({
        where: { id: pageId },
        data: {
          pageData: revision.pageData,
          status: 'draft',
          publishedAt: null,
          publishedBy: null,
        },
      });

      // Create a new revision recording the restore
      const revCount = await db.cmsPageRevision.count({ where: { pageId } });
      const newVersion = revCount + 1;
      await db.cmsPageRevision.create({
        data: {
          tenantId,
          pageId,
          pageData: revision.pageData,
          version: newVersion,
          label: `Restored from v${revision.version}`,
          createdBy: userId,
        },
      });

      // Update page version
      await db.cmsPage.update({
        where: { id: pageId },
        data: { version: newVersion },
      });

      return NextResponse.json({
        id: updated.id,
        pageId: updated.id,
        version: newVersion,
        restoredFrom: revision.version,
      });
    }

    // Create revision snapshot
    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Verify page belongs to tenant
    const page = await db.cmsPage.findFirst({
      where: { id: pageId, tenantId },
    });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const revisionPageData = pageData || page.pageData;
    const revCount = await db.cmsPageRevision.count({ where: { pageId } });
    const newVersion = revCount + 1;

    const revision = await db.cmsPageRevision.create({
      data: {
        tenantId,
        pageId,
        pageData: typeof revisionPageData === 'string' ? revisionPageData : JSON.stringify(revisionPageData),
        version: newVersion,
        label: label || 'Manual save',
        createdBy: userId,
      },
    });

    // Update page version
    await db.cmsPage.update({
      where: { id: pageId },
      data: { version: newVersion },
    });

    return NextResponse.json(formatRevision(revision), { status: 201 });
  } catch (error) {
    console.error('CMS revisions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}