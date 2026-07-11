import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { getStorageProvider } from '@/core/storage/provider';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'documents' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.tenantId !== tenantId || !doc.isActive) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const provider = getStorageProvider();
    const exists = await provider.fileExists(doc.storagePath);
    if (!exists) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    const fileBuffer = await provider.readFile(doc.storagePath);

    // Log download in audit
    await db.documentAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        documentId: id,
        action: 'download',
        fileName: doc.originalName,
        metadata: JSON.stringify({ size: doc.size, mimeType: doc.mimeType }),
        performedBy: userId,
        performedByRole: role,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    // Determine content disposition filename encoding
    const encodedName = encodeURIComponent(doc.originalName).replace(/'/g, '%27');

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Document download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}