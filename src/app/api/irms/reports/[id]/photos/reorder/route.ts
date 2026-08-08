import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

const TYPE_PREFIXES: Record<string, string> = {
  before: 'B', after: 'A', progress: 'P', defect: 'D',
  inspection: 'I', completion: 'C', final: 'F', evidence: 'E',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id: reportId } = await params;
    const { photoIds } = await request.json() as { photoIds: string[] };

    if (!Array.isArray(photoIds)) {
      return NextResponse.json({ error: 'photoIds must be an array' }, { status: 400 });
    }

    // Update sortOrder for each photo based on position in array
    const updates = photoIds.map((photoId: string, index: number) =>
      db.irmPhoto.update({
        where: { id: photoId },
        data: { sortOrder: index },
      })
    );
    await Promise.all(updates);

    // Re-number photos within each category group
    const photos = await db.irmPhoto.findMany({
      where: { reportId },
      orderBy: [{ sortOrder: 'asc' }],
    });

    // Group by type and re-number
    const byType: Record<string, string[]> = {};
    for (const p of photos) {
      if (!byType[p.type]) byType[p.type] = [];
      byType[p.type].push(p.id);
    }

    for (const [type, ids] of Object.entries(byType)) {
      const prefix = TYPE_PREFIXES[type] || 'B';
      const renames = ids.map((id: string, idx: number) =>
        db.irmPhoto.update({
          where: { id },
          data: { photoNumber: `${prefix}${String(idx + 1).padStart(3, '0')}` },
        })
      );
      await Promise.all(renames);
    }

    const updated = await db.irmPhoto.findMany({
      where: { reportId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reorder photos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}