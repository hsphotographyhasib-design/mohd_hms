import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id: reportId } = await params;

    const photos = await db.irmPhoto.findMany({
      where: { reportId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(photos);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch photos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}