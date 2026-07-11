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

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;


    const items = await db.cmsSeo.findMany({
      where: { tenantId },
      orderBy: { pagePath: 'asc' },
    });

    return NextResponse.json({ data: items.map(formatSeo) });
  } catch (error) {
    console.error('CMS SEO GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const body = await request.json();
    const settings: Array<{
      pagePath: string;
      title?: string | null;
      description?: string | null;
      keywords?: string | null;
      ogTitle?: string | null;
      ogDescription?: string | null;
      ogImage?: string | null;
      schemaMarkup?: string | null;
      canonicalUrl?: string | null;
    }> = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Body must be an array of SEO settings' }, { status: 400 });
    }

    const results = await Promise.all(
      settings.map(async (item) => {
        if (!item.pagePath) return null;
        return db.cmsSeo.upsert({
          where: { tenantId_pagePath: { tenantId, pagePath: item.pagePath } },
          update: {
            ...(item.title !== undefined && { title: item.title || null }),
            ...(item.description !== undefined && { description: item.description || null }),
            ...(item.keywords !== undefined && { keywords: item.keywords || null }),
            ...(item.ogTitle !== undefined && { ogTitle: item.ogTitle || null }),
            ...(item.ogDescription !== undefined && { ogDescription: item.ogDescription || null }),
            ...(item.ogImage !== undefined && { ogImage: item.ogImage || null }),
            ...(item.schemaMarkup !== undefined && { schemaMarkup: item.schemaMarkup || null }),
            ...(item.canonicalUrl !== undefined && { canonicalUrl: item.canonicalUrl || null }),
          },
          create: {
            tenantId,
            pagePath: item.pagePath,
            title: item.title || null,
            description: item.description || null,
            keywords: item.keywords || null,
            ogTitle: item.ogTitle || null,
            ogDescription: item.ogDescription || null,
            ogImage: item.ogImage || null,
            schemaMarkup: item.schemaMarkup || null,
            canonicalUrl: item.canonicalUrl || null,
          },
        });
      })
    );

    return NextResponse.json({
      data: results.filter(Boolean).map((r) => formatSeo(r!)),
    });
  } catch (error) {
    console.error('CMS SEO PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}