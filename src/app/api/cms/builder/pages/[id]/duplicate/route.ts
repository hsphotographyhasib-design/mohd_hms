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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// POST /api/cms/builder/pages/[id]/duplicate — Duplicate a page
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

    const page = await db.cmsPage.findFirst({
      where: { id, tenantId },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const newTitle = `${page.title} (Copy)`;
    let newSlug = generateSlug(newTitle);

    // Ensure unique slug
    const existing = await db.cmsPage.findFirst({
      where: { slug: newSlug, tenantId },
    });
    if (existing) {
      let counter = 1;
      let candidate = `${newSlug}-${counter}`;
      while (await db.cmsPage.findFirst({ where: { slug: candidate, tenantId } })) {
        counter++;
        candidate = `${newSlug}-${counter}`;
      }
      newSlug = candidate;
    }

    const duplicated = await db.cmsPage.create({
      data: {
        tenantId,
        title: newTitle,
        slug: newSlug,
        status: 'draft',
        template: page.template,
        schema: page.schema,
        seoTitle: page.seoTitle,
        seoDesc: page.seoDesc,
        ogImage: page.ogImage,
        canonical: page.canonical,
        schemaMarkup: page.schemaMarkup,
      },
    });

    return NextResponse.json({
      data: {
        id: duplicated.id,
        tenantId: duplicated.tenantId,
        title: duplicated.title,
        slug: duplicated.slug,
        status: duplicated.status,
        template: duplicated.template,
        schema: duplicated.schema,
        seoTitle: duplicated.seoTitle,
        seoDesc: duplicated.seoDesc,
        ogImage: duplicated.ogImage,
        canonical: duplicated.canonical,
        schemaMarkup: duplicated.schemaMarkup,
        createdAt: duplicated.createdAt.toISOString(),
        updatedAt: duplicated.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('CMS Builder Page Duplicate POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}