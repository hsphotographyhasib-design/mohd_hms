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

// POST /api/cms/builder/pages/[id]/revisions/[revId]/restore — Restore a revision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, revId } = await params;
    const tenantId = user.tenantId as string;
    const userId = user.id as string;

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