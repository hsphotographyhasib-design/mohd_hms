import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const headersList = await headers();
  const auth = headersList.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = verifyToken(auth.slice(7));
    return payload;
  } catch {
    return null;
  }
}

function isAdmin(user: JwtPayload | null): user is JwtPayload {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'admin';
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const category = request.nextUrl.searchParams.get('category') || undefined;

    const where: Prisma.CmsSettingWhereInput = { tenantId };
    if (category) where.category = category;

    const settings = await db.cmsSetting.findMany({
      where,
      orderBy: { key: 'asc' },
    });

    const data = settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      category: s.category,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error('CMS settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const body = await request.json();
    const { settings } = body as { settings: Array<{ key: string; value: string; category?: string }> };

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json({ error: 'Settings array is required' }, { status: 400 });
    }

    const results = await Promise.all(
      settings.map((item) =>
        db.cmsSetting.upsert({
          where: { tenantId_key: { tenantId, key: item.key } },
          update: { value: item.value, category: item.category || null },
          create: {
            tenantId,
            key: item.key,
            value: item.value,
            category: item.category || null,
          },
        })
      )
    );

    const data = results.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      category: s.category,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error('CMS settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}