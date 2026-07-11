import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

function formatForm(f: {
  id: string;
  tenantId: string;
  name: string;
  formType: string;
  fields: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: f.id,
    tenantId: f.tenantId,
    name: f.name,
    formType: f.formType,
    fields: f.fields,
    isActive: f.isActive,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id } = await params;

    const form = await db.cmsForm.findFirst({ where: { id, tenantId } });
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    return NextResponse.json({ data: formatForm(form) });
  } catch (error) {
    console.error('CMS form GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.cmsForm.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    const updated = await db.cmsForm.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.formType !== undefined && { formType: body.formType }),
        ...(body.fields !== undefined && { fields: typeof body.fields === 'string' ? body.fields : JSON.stringify(body.fields) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(formatForm(updated));
  } catch (error) {
    console.error('CMS form PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id } = await params;

    const existing = await db.cmsForm.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    await db.cmsForm.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS form DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}