import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  getStorageProvider,
  calculateFileChecksum,
  generateStoragePath,
  isFileTypeAllowed,
  getFileExtension,
} from '@/lib/storage/provider';
import { env } from '@/lib/env';

// GET: List all versions for a document
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
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const versions = await db.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
    });

    // Fetch creator names
    const creatorIds = [...new Set(versions.map(v => v.createdBy).filter(Boolean))] as string[];
    const creators = creatorIds.length > 0
      ? await db.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : [];
    const creatorMap = new Map(creators.map(u => [u.id, u.name]));

    return NextResponse.json({
      versions: versions.map(v => ({
        ...v,
        createdByName: v.createdBy ? (creatorMap.get(v.createdBy) || null) : null,
        createdAt: v.createdAt.toISOString(),
      })),
      currentVersion: doc.version,
    });
  } catch (error) {
    console.error('Document versions list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload new version
export async function POST(
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const changeNote = formData.get('changeNote') as string || undefined;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    const typeCheck = isFileTypeAllowed(file.type, file.name);
    if (!typeCheck.allowed) {
      return NextResponse.json({ error: typeCheck.reason }, { status: 400 });
    }

    // Validate file size
    if (file.size > env.maxFileSize) {
      return NextResponse.json({ error: `File size exceeds maximum allowed size (${Math.round(env.maxFileSize / 1024 / 1024)}MB)` }, { status: 400 });
    }

    const provider = getStorageProvider();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const checksum = await calculateFileChecksum(fileBuffer);

    // Generate storage path for new version
    const ext = getFileExtension(file.name);
    const uuid = crypto.randomUUID();
    const versionStoragePath = `tenants/${tenantId}/${doc.module}/${doc.folder}/v${doc.version + 1}_${uuid}${ext}`;

    await provider.writeFile(versionStoragePath, fileBuffer);

    // Create new version record
    const newVersion = doc.version + 1;
    await db.documentVersion.create({
      data: {
        id: crypto.randomUUID(),
        documentId: id,
        version: newVersion,
        fileName: versionStoragePath.split('/').pop() || `${uuid}${ext}`,
        originalName: file.name,
        size: fileBuffer.length,
        checksum,
        storagePath: versionStoragePath,
        changeNote,
        createdBy: userId,
      },
    });

    // Update document to point to latest version
    await db.document.update({
      where: { id },
      data: {
        version: newVersion,
        size: fileBuffer.length,
        checksum,
        storagePath: versionStoragePath,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await db.documentAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        documentId: id,
        action: 'version_change',
        fileName: doc.originalName,
        metadata: JSON.stringify({
          fromVersion: doc.version,
          toVersion: newVersion,
          changeNote,
          size: fileBuffer.length,
        }),
        performedBy: userId,
        performedByRole: userRole,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      success: true,
      version: newVersion,
      size: fileBuffer.length,
      checksum,
    });
  } catch (error) {
    console.error('Document version upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}