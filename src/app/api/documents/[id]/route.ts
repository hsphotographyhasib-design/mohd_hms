import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { getStorageProvider, formatFileSize } from '@/core/storage/provider';

function createAuditEntry(data: {
  tenantId: string; documentId: string; action: string; fileName: string;
  performedBy: string; performedByRole: string; request: NextRequest; metadata?: Record<string, unknown>;
}) {
  return {
    id: crypto.randomUUID(),
    tenantId: data.tenantId,
    documentId: data.documentId,
    action: data.action,
    fileName: data.fileName,
    metadata: JSON.stringify(data.metadata || {}),
    performedBy: data.performedBy,
    performedByRole: data.performedByRole,
    ipAddress: data.request.headers.get('x-forwarded-for') || data.request.headers.get('x-real-ip') || null,
    userAgent: data.request.headers.get('user-agent') || null,
  };
}

// GET: Document detail with versions and audit logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'documents' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { id } = await params;

    const doc = await db.document.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { versions: true, auditLogs: true } },
      },
    });

    if (!doc || doc.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch uploader name
    let uploadedByName: string | null = null;
    if (doc.uploadedBy) {
      const user = await db.user.findUnique({ where: { id: doc.uploadedBy }, select: { name: true } });
      uploadedByName = user?.name || null;
    }

    // Fetch version uploader names
    const versionCreatorIds = [...new Set(doc.versions.map(v => v.createdBy).filter(Boolean))] as string[];
    const versionCreators = versionCreatorIds.length > 0
      ? await db.user.findMany({ where: { id: { in: versionCreatorIds } }, select: { id: true, name: true } })
      : [];
    const creatorMap = new Map(versionCreators.map(u => [u.id, u.name]));

    // Fetch audit performer names
    const performerIds = [...new Set(doc.auditLogs.map(l => l.performedBy).filter(Boolean))] as string[];
    const performers = performerIds.length > 0
      ? await db.user.findMany({ where: { id: { in: performerIds } }, select: { id: true, name: true } })
      : [];
    const performerMap = new Map(performers.map(u => [u.id, u.name]));

    return NextResponse.json({
      ...doc,
      tags: doc.tags ? JSON.parse(doc.tags as string) : [],
      sizeFormatted: formatFileSize(doc.size),
      uploadedByName,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      versions: doc.versions.map(v => ({
        ...v,
        createdByName: v.createdBy ? (creatorMap.get(v.createdBy) || null) : null,
        createdAt: v.createdAt.toISOString(),
      })),
      auditLogs: doc.auditLogs.map(l => ({
        ...l,
        performedByName: l.performedBy ? (performerMap.get(l.performedBy) || null) : null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Document detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'documents' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    const auditMeta: Record<string, unknown> = {};

    if (body.originalName !== undefined && body.originalName !== doc.originalName) {
      auditMeta.previousName = doc.originalName;
      auditMeta.newName = body.originalName;
      updates.originalName = body.originalName;
    }
    if (body.folder !== undefined && body.folder !== doc.folder) {
      auditMeta.previousFolder = doc.folder;
      auditMeta.newFolder = body.folder;
      updates.folder = body.folder;
    }
    if (body.tags !== undefined) {
      updates.tags = JSON.stringify(body.tags);
    }
    if (body.isArchived !== undefined) {
      updates.isArchived = body.isArchived;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const updated = await db.document.update({
      where: { id },
      data: updates,
    });

    // Determine audit action
    let action = 'rename';
    if (body.isArchived === true) action = 'archive';
    else if (body.isArchived === false) action = 'unarchive';
    else if (body.folder !== undefined) action = 'move';

    await db.documentAuditLog.create({
      data: createAuditEntry({
        tenantId, documentId: id, action, fileName: doc.originalName,
        performedBy: userId, performedByRole: role, request, metadata: auditMeta,
      }),
    });

    return NextResponse.json({
      ...updated,
      tags: updated.tags ? JSON.parse(updated.tags as string) : [],
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'documents' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await db.document.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });

    await db.documentAuditLog.create({
      data: createAuditEntry({
        tenantId, documentId: id, action: 'delete', fileName: doc.originalName,
        performedBy: userId, performedByRole: role, request,
        metadata: { size: doc.size, mimeType: doc.mimeType },
      }),
    });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}