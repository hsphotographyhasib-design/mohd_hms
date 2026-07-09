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

// POST /api/cms/builder/pages/[id]/publish — Publish a page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const tenantId = user.tenantId as string;
    const userId = user.id as string;

    const page = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Update page status and publish info
    const updated = await db.cmsPage.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId,
      },
    });

    // Create a revision labeled "Published"
    await db.cmsRevision.create({
      data: {
        tenantId,
        pageId: id,
        label: 'Published',
        schema: page.schema,
        createdById: userId,
      },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        tenantId: updated.tenantId,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        publishedAt: updated.publishedAt?.toISOString() ?? null,
        publishedBy: updated.publishedBy,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('CMS Builder Page Publish POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}