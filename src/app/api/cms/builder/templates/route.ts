import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

function formatTemplate(t: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  category: string;
  pageData: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    name: t.name,
    description: t.description,
    thumbnail: t.thumbnail,
    category: t.category,
    pageData: t.pageData,
    isSystem: t.isSystem,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';

    // Templates: system templates (all tenants) + custom tenant templates
    const where: Record<string, unknown>[] = [
      { isSystem: true },
      { tenantId },
    ];

    if (category) {
      const filtered = where.map((w) => ({ ...w, category }));
      return await fetchTemplates(filtered, tenantId);
    }

    return await fetchTemplates(where, tenantId);
  } catch (error) {
    console.error('CMS templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchTemplates(whereConditions: Record<string, unknown>[], tenantId: string) {
  const templates = await db.cmsPageTemplate.findMany({
    where: { OR: whereConditions },
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({
    templates: templates.map(formatTemplate),
    total: templates.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const body = await request.json();
    const { name, description, thumbnail, category, pageData } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!pageData) {
      return NextResponse.json({ error: 'Page data is required' }, { status: 400 });
    }

    const template = await db.cmsPageTemplate.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description?.trim() || null,
        thumbnail: thumbnail || null,
        category: category || 'general',
        pageData: typeof pageData === 'string' ? pageData : JSON.stringify(pageData),
        isSystem: false,
      },
    });

    return NextResponse.json(formatTemplate(template), { status: 201 });
  } catch (error) {
    console.error('CMS templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}