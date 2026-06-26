import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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