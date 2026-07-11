import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

function formatSeo(s: {
  id: string;
  tenantId: string;
  pagePath: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  schemaMarkup: string | null;
  canonicalUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: s.id,
    tenantId: s.tenantId,
    pagePath: s.pagePath,
    title: s.title,
    description: s.description,
    keywords: s.keywords,
    ogTitle: s.ogTitle,
    ogDescription: s.ogDescription,
    ogImage: s.ogImage,
    schemaMarkup: s.schemaMarkup,
    canonicalUrl: s.canonicalUrl,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pagePath: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { pagePath } = await params;
    const decodedPath = decodeURIComponent(pagePath);

    const seo = await db.cmsSeo.findFirst({
      where: { tenantId, pagePath: decodedPath },
    });
    if (!seo) return NextResponse.json({ error: 'SEO settings not found' }, { status: 404 });

    return NextResponse.json({ data: formatSeo(seo) });
  } catch (error) {
    console.error('CMS SEO GET by pagePath error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pagePath: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { pagePath } = await params;
    const decodedPath = decodeURIComponent(pagePath);
    const body = await request.json();

    const seo = await db.cmsSeo.upsert({
      where: { tenantId_pagePath: { tenantId, pagePath: decodedPath } },
      update: {
        ...(body.title !== undefined && { title: body.title || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.keywords !== undefined && { keywords: body.keywords || null }),
        ...(body.ogTitle !== undefined && { ogTitle: body.ogTitle || null }),
        ...(body.ogDescription !== undefined && { ogDescription: body.ogDescription || null }),
        ...(body.ogImage !== undefined && { ogImage: body.ogImage || null }),
        ...(body.schemaMarkup !== undefined && { schemaMarkup: body.schemaMarkup || null }),
        ...(body.canonicalUrl !== undefined && { canonicalUrl: body.canonicalUrl || null }),
      },
      create: {
        tenantId,
        pagePath: decodedPath,
        title: body.title || null,
        description: body.description || null,
        keywords: body.keywords || null,
        ogTitle: body.ogTitle || null,
        ogDescription: body.ogDescription || null,
        ogImage: body.ogImage || null,
        schemaMarkup: body.schemaMarkup || null,
        canonicalUrl: body.canonicalUrl || null,
      },
    });

    return NextResponse.json(formatSeo(seo));
  } catch (error) {
    console.error('CMS SEO PUT by pagePath error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pagePath: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { pagePath } = await params;
    const decodedPath = decodeURIComponent(pagePath);

    const existing = await db.cmsSeo.findFirst({
      where: { tenantId, pagePath: decodedPath },
    });
    if (!existing) return NextResponse.json({ error: 'SEO settings not found' }, { status: 404 });

    await db.cmsSeo.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS SEO DELETE by pagePath error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}