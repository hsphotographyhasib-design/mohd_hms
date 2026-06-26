import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
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

function formatHero(h: {
  id: string;
  tenantId: string;
  headline: string | null;
  subheadline: string | null;
  backgroundImage: string | null;
  backgroundVideo: string | null;
  cta1Text: string | null;
  cta1Link: string | null;
  cta2Text: string | null;
  cta2Link: string | null;
  stat1Value: string | null;
  stat1Label: string | null;
  stat2Value: string | null;
  stat2Label: string | null;
  stat3Value: string | null;
  stat3Label: string | null;
  chipText: string | null;
  chipSubtext: string | null;
  isActive: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: h.id,
    tenantId: h.tenantId,
    headline: h.headline,
    subheadline: h.subheadline,
    backgroundImage: h.backgroundImage,
    backgroundVideo: h.backgroundVideo,
    cta1Text: h.cta1Text,
    cta1Link: h.cta1Link,
    cta2Text: h.cta2Text,
    cta2Link: h.cta2Link,
    stat1Value: h.stat1Value,
    stat1Label: h.stat1Label,
    stat2Value: h.stat2Value,
    stat2Label: h.stat2Label,
    stat3Value: h.stat3Value,
    stat3Label: h.stat3Label,
    chipText: h.chipText,
    chipSubtext: h.chipSubtext,
    isActive: h.isActive,
    publishedAt: h.publishedAt?.toISOString() ?? null,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const { id } = await params;

    const hero = await db.cmsHero.findFirst({ where: { id, tenantId } });
    if (!hero) return NextResponse.json({ error: 'Hero not found' }, { status: 404 });

    return NextResponse.json({ data: formatHero(hero) });
  } catch (error) {
    console.error('CMS hero GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.cmsHero.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Hero not found' }, { status: 404 });

    const updated = await db.cmsHero.update({
      where: { id },
      data: {
        ...(body.headline !== undefined && { headline: body.headline || null }),
        ...(body.subheadline !== undefined && { subheadline: body.subheadline || null }),
        ...(body.backgroundImage !== undefined && { backgroundImage: body.backgroundImage || null }),
        ...(body.backgroundVideo !== undefined && { backgroundVideo: body.backgroundVideo || null }),
        ...(body.cta1Text !== undefined && { cta1Text: body.cta1Text || null }),
        ...(body.cta1Link !== undefined && { cta1Link: body.cta1Link || null }),
        ...(body.cta2Text !== undefined && { cta2Text: body.cta2Text || null }),
        ...(body.cta2Link !== undefined && { cta2Link: body.cta2Link || null }),
        ...(body.stat1Value !== undefined && { stat1Value: body.stat1Value || null }),
        ...(body.stat1Label !== undefined && { stat1Label: body.stat1Label || null }),
        ...(body.stat2Value !== undefined && { stat2Value: body.stat2Value || null }),
        ...(body.stat2Label !== undefined && { stat2Label: body.stat2Label || null }),
        ...(body.stat3Value !== undefined && { stat3Value: body.stat3Value || null }),
        ...(body.stat3Label !== undefined && { stat3Label: body.stat3Label || null }),
        ...(body.chipText !== undefined && { chipText: body.chipText || null }),
        ...(body.chipSubtext !== undefined && { chipSubtext: body.chipSubtext || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isActive === true && { publishedAt: new Date() }),
      },
    });

    return NextResponse.json(formatHero(updated));
  } catch (error) {
    console.error('CMS hero PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const { id } = await params;

    const existing = await db.cmsHero.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Hero not found' }, { status: 404 });

    await db.cmsHero.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS hero DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}