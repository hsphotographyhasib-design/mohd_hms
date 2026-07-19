import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { withErrorLogging } from '@/core/errors/with-error-logging';

export const dynamic = 'force-dynamic';

// ── DELETE: Soft-delete a branding asset ────────────────────────────────────────
// If deleting the active asset for a type, the previous version becomes active.

async function handleDelete(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Missing authentication token' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload?.tenantId || !payload?.userId || !payload?.role) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Invalid or incomplete token' }, { status: 401 });
  }
  if (payload.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden', message: 'Only super_admin can delete branding assets' }, { status: 403 });
  }

  const { tenantId } = payload;
  const { id } = await params;

  // Fetch the asset (must belong to the tenant)
  const asset = await db.brandingAsset.findFirst({
    where: { id, tenantId },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Not Found', message: 'Branding asset not found' }, { status: 404 });
  }

  // Soft-delete: set isActive to false
  await db.brandingAsset.update({
    where: { id },
    data: { isActive: false },
  });

  // If the deleted asset was the active one, activate the previous version
  if (asset.isActive) {
    const previousVersion = await db.brandingAsset.findFirst({
      where: {
        tenantId,
        type: asset.type,
        isActive: false,
        id: { not: id },
      },
      orderBy: { version: 'desc' },
    });

    if (previousVersion) {
      await db.brandingAsset.update({
        where: { id: previousVersion.id },
        data: { isActive: true },
      });
    }
    // If no previous version exists, the type will fall back to the static default
  }

  return NextResponse.json({
    success: true,
    message: 'Asset deleted successfully',
    assetId: id,
    type: asset.type,
    fallback: asset.isActive ? 'previous_version_or_default' : undefined,
  });
}

export const DELETE = withErrorLogging(handleDelete, { module: 'branding', category: 'api' });