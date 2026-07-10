import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'documents' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
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
        performedByRole: role,
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