import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

// POST /api/cms/builder/pages/[id]/revisions/[revId]/restore — Restore a revision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revId: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id, revId } = await params;
    const userId = auth.userId;

    // Verify page belongs to tenant
    const page = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Verify revision belongs to this page and tenant
    const revision = await db.cmsRevision.findFirst({
      where: { id: revId, pageId: id, tenantId },
    });

    if (!revision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    // Update the page schema with the revision's schema
    await db.cmsPage.update({
      where: { id },
      data: {
        schema: revision.schema,
      },
    });

    // Create a new revision labeled "Restored from [rev label]"
    const restoreLabel = revision.label
      ? `Restored from ${revision.label}`
      : 'Restored from revision';

    const newRevision = await db.cmsRevision.create({
      data: {
        tenantId,
        pageId: id,
        label: restoreLabel,
        schema: revision.schema,
        createdById: userId,
      },
    });

    return NextResponse.json({
      data: {
        id: newRevision.id,
        tenantId: newRevision.tenantId,
        pageId: newRevision.pageId,
        label: newRevision.label,
        createdById: newRevision.createdById,
        createdAt: newRevision.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('CMS Builder Revision Restore POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}