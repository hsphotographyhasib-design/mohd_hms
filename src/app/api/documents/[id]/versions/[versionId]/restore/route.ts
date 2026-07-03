import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const userRole = payload.role as string;
    const { id, versionId } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.tenantId !== tenantId || !doc.isActive) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const version = await db.documentVersion.findUnique({
      where: { id: versionId, documentId: id },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    if (version.version === doc.version) {
      return NextResponse.json({ error: 'This is already the current version' }, { status: 400 });
    }

    // Update document to point to restored version
    await db.document.update({
      where: { id },
      data: {
        version: version.version,
        size: version.size,
        checksum: version.checksum,
        storagePath: version.storagePath,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await db.documentAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        documentId: id,
        action: 'restore',
        fileName: doc.originalName,
        metadata: JSON.stringify({
          restoredToVersion: version.version,
          fromVersion: doc.version,
          restoredOriginalName: version.originalName,
        }),
        performedBy: userId,
        performedByRole: userRole,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      success: true,
      restoredVersion: version.version,
      message: `Document restored to version ${version.version}`,
    });
  } catch (error) {
    console.error('Version restore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}