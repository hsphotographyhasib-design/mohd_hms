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

function formatRevision(rev: {
  id: string;
  tenantId: string;
  pageId: string;
  label: string | null;
  schema: string;
  createdById: string | null;
  createdAt: Date;
}) {
  return {
    id: rev.id,
    tenantId: rev.tenantId,
    pageId: rev.pageId,
    label: rev.label,
    schema: rev.schema,
    createdById: rev.createdById,
    createdAt: rev.createdAt.toISOString(),
  };
}

// GET /api/cms/builder/pages/[id]/revisions — List revisions for a page
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

    // Verify page belongs to tenant
    const page = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const revisions = await db.cmsRevision.findMany({
      where: { pageId: id, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: revisions.map(formatRevision) });
  } catch (error) {
    console.error('CMS Builder Revisions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cms/builder/pages/[id]/revisions — Create a revision
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
    const body = await request.json();
    const { label, schema } = body;

    // Verify page belongs to tenant
    const page = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const schemaStr = typeof schema === 'string' ? schema : JSON.stringify(schema || []);

    const revision = await db.cmsRevision.create({
      data: {
        tenantId,
        pageId: id,
        label: label || 'Manual save',
        schema: schemaStr,
        createdById: userId,
      },
    });

    return NextResponse.json({ data: formatRevision(revision) }, { status: 201 });
  } catch (error) {
    console.error('CMS Builder Revisions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}