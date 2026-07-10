import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

function formatTemplate(t: {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  thumbnail: string | null;
  schema: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    name: t.name,
    category: t.category,
    thumbnail: t.thumbnail,
    schema: t.schema,
    isSystem: t.isSystem,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// GET /api/cms/builder/templates/[id] — Get template with full schema
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;

    // Allow access to system templates or tenant's own
    const template = await db.cmsTemplate.findFirst({
      where: {
        id,
        OR: [
          { tenantId },
          { isSystem: true },
        ],
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ data: formatTemplate(template) });
  } catch (error) {
    console.error('CMS Builder Template GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/cms/builder/templates/[id] — Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const template = await db.cmsTemplate.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const allowedFields: Record<string, unknown> = {};
    const updatableFields = ['name', 'category', 'schema', 'thumbnail', 'isSystem'];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === 'schema') {
          allowedFields[field] = typeof body[field] === 'string'
            ? body[field]
            : JSON.stringify(body[field]);
        } else {
          allowedFields[field] = body[field];
        }
      }
    }

    const updated = await db.cmsTemplate.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json({ data: formatTemplate(updated) });
  } catch (error) {
    console.error('CMS Builder Template PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cms/builder/templates/[id] — Delete template (only custom, not system)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;

    const template = await db.cmsTemplate.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 403 }
      );
    }

    await db.cmsTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('CMS Builder Template DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}