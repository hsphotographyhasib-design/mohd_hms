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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;

    const hero = await db.cmsHero.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { publishedAt: 'desc' },
    });

    if (!hero) {
      const latest = await db.cmsHero.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      if (!latest) {
        return NextResponse.json({ data: null });
      }
      return NextResponse.json({ data: formatHero(latest) });
    }

    return NextResponse.json({ data: formatHero(hero) });
  } catch (error) {
    console.error('CMS hero GET error:', error);
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

    const {
      headline,
      subheadline,
      backgroundImage,
      backgroundVideo,
      cta1Text,
      cta1Link,
      cta2Text,
      cta2Link,
      stat1Value,
      stat1Label,
      stat2Value,
      stat2Label,
      stat3Value,
      stat3Label,
      chipText,
      chipSubtext,
      isActive,
    } = body;

    const hero = await db.cmsHero.create({
      data: {
        tenantId,
        headline: headline || null,
        subheadline: subheadline || null,
        backgroundImage: backgroundImage || null,
        backgroundVideo: backgroundVideo || null,
        cta1Text: cta1Text || null,
        cta1Link: cta1Link || null,
        cta2Text: cta2Text || null,
        cta2Link: cta2Link || null,
        stat1Value: stat1Value || null,
        stat1Label: stat1Label || null,
        stat2Value: stat2Value || null,
        stat2Label: stat2Label || null,
        stat3Value: stat3Value || null,
        stat3Label: stat3Label || null,
        chipText: chipText || null,
        chipSubtext: chipSubtext || null,
        isActive: isActive !== undefined ? isActive : true,
        publishedAt: isActive !== false ? new Date() : null,
      },
    });

    return NextResponse.json(formatHero(hero), { status: 201 });
  } catch (error) {
    console.error('CMS hero POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}