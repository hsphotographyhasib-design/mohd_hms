import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage/provider';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const userRole = payload.role as string;
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
        performedByRole: userRole,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    // Determine content disposition filename encoding
    const encodedName = encodeURIComponent(doc.originalName).replace(/'/g, '%27');

    return new NextResponse(fileBuffer, {
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