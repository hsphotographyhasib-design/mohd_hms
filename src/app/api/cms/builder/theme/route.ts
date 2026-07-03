import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
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

function formatTheme(t: {
  id: string;
  tenantId: string;
  colors: string;
  typography: string;
  borderRadius: string;
  shadows: string;
  spacing: string;
  buttons: string;
  cards: string;
  darkMode: boolean;
  customCSS: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    colors: t.colors,
    typography: t.typography,
    borderRadius: t.borderRadius,
    shadows: t.shadows,
    spacing: t.spacing,
    buttons: t.buttons,
    cards: t.cards,
    darkMode: t.darkMode,
    customCSS: t.customCSS,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// GET /api/cms/builder/theme — Get theme settings for tenant
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;

    let theme = await db.cmsThemeSetting.findUnique({
      where: { tenantId },
    });

    // Return defaults if no theme exists yet
    if (!theme) {
      return NextResponse.json({
        data: {
          id: null,
          tenantId,
          colors: '{}',
          typography: '{}',
          borderRadius: '{}',
          shadows: '{}',
          spacing: '{}',
          buttons: '{}',
          cards: '{}',
          darkMode: false,
          customCSS: '',
        },
      });
    }

    return NextResponse.json({ data: formatTheme(theme) });
  } catch (error) {
    console.error('CMS Builder Theme GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/cms/builder/theme — Update theme settings (upsert)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const body = await request.json();

    const jsonFields = ['colors', 'typography', 'borderRadius', 'shadows', 'spacing', 'buttons', 'cards'];
    const data: Record<string, unknown> = { tenantId };

    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        data[field] = typeof body[field] === 'string'
          ? body[field]
          : JSON.stringify(body[field]);
      }
    }

    if (body.darkMode !== undefined) {
      data.darkMode = Boolean(body.darkMode);
    }

    if (body.customCSS !== undefined) {
      data.customCSS = String(body.customCSS);
    }

    const theme = await db.cmsThemeSetting.upsert({
      where: { tenantId },
      update: data,
      create: data,
    });

    return NextResponse.json({ data: formatTheme(theme) });
  } catch (error) {
    console.error('CMS Builder Theme PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}