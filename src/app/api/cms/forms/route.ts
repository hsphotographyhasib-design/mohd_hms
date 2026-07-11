import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
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

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const formType = request.nextUrl.searchParams.get('formType') || '';
    const isActive = request.nextUrl.searchParams.get('isActive');

    const where: Prisma.CmsFormWhereInput = { tenantId };

    if (formType) where.formType = formType;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const items = await db.cmsForm.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: items.map(formatForm) });
  } catch (error) {
    console.error('CMS forms GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const body = await request.json();
    const { name, formType, fields, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!fields) {
      return NextResponse.json({ error: 'Fields are required' }, { status: 400 });
    }

    const form = await db.cmsForm.create({
      data: {
        tenantId,
        name,
        formType: formType || 'contact',
        fields: typeof fields === 'string' ? fields : JSON.stringify(fields),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(formatForm(form), { status: 201 });
  } catch (error) {
    console.error('CMS forms POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}