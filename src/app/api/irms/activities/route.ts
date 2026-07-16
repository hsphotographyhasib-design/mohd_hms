import { NextResponse } from 'next/server';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function GET() {
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