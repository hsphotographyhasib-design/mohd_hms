import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

// ── GET: List all branding assets grouped by type with version history ───────────

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Missing authentication token' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload?.tenantId || !payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Invalid or incomplete token' }, { status: 401 });
    }
    const { tenantId } = payload;

    // Fetch all assets (including inactive/old versions) ordered by type then version desc
    const assets = await db.brandingAsset.findMany({
      where: { tenantId },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });

    // Group by type
    const grouped: Record<string, Array<{
      id: string;
      type: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      width: number | null;
      height: number | null;
      version: number;
      isActive: boolean;
      createdAt: string;
    }>> = {};

    for (const a of assets) {
      const entry = {
        id: a.id,
        type: a.type,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        width: a.width,
        height: a.height,
        version: a.version,
        isActive: a.isActive,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
      };

      if (!grouped[a.type]) {
        grouped[a.type] = [];
      }
      grouped[a.type].push(entry);
    }

    return NextResponse.json({
      grouped,
      totalAssets: assets.length,
      types: Object.keys(grouped),
    });
  } catch (error) {
    console.error('[Branding Assets GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 });
  }
}