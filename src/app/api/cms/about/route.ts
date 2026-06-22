import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
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

const ABOUT_KEYS = [
  'mission',
  'vision',
  'values',
  'description',
  'ceoMessage',
  'image',
  'timeline',
  'certificates',
] as const;

type AboutKey = (typeof ABOUT_KEYS)[number];

function formatSetting(s: { id: string; key: string; value: string; category: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: s.id,
    key: s.key,
    value: s.value,
    category: s.category,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;

    const where: Prisma.CmsSettingWhereInput = {
      tenantId,
      category: 'about',
      key: { in: [...ABOUT_KEYS] },
    };

    const settings = await db.cmsSetting.findMany({
      where,
      orderBy: { key: 'asc' },
    });

    const data: Record<string, unknown> = {};
    for (const key of ABOUT_KEYS) {
      data[key] = null;
    }

    for (const s of settings) {
      try {
        data[s.key] = JSON.parse(s.value);
      } catch {
        data[s.key] = s.value;
      }
    }

    return NextResponse.json({
      data,
      settings: settings.map(formatSetting),
      total: settings.length,
    });
  } catch (error) {
    console.error('CMS about GET error:', error);
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

    const validKeys = new Set<string>(ABOUT_KEYS);
    const entries = Object.entries(body).filter(([key]) => validKeys.has(key as AboutKey));

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No valid about fields provided' }, { status: 400 });
    }

    const results = await Promise.all(
      entries.map(([key, value]) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        return db.cmsSetting.upsert({
          where: { tenantId_key: { tenantId, key } },
          update: { value: stringValue, category: 'about' },
          create: {
            tenantId,
            key,
            value: stringValue,
            category: 'about',
          },
        });
      })
    );

    const data: Record<string, unknown> = {};
    for (const key of ABOUT_KEYS) {
      data[key] = null;
    }

    for (const r of results) {
      try {
        data[r.key] = JSON.parse(r.value);
      } catch {
        data[r.key] = r.value;
      }
    }

    return NextResponse.json({
      data,
      settings: results.map(formatSetting),
      total: results.length,
    });
  } catch (error) {
    console.error('CMS about PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}