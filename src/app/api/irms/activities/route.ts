import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const activities = await db.irmActivity.findMany({
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
        report: { select: { id: true, number: true, status: true } },
        project: { select: { id: true, name: true, number: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(activities);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch activities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}