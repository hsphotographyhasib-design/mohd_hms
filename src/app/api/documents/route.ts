import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'documents' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { searchParams } = new URL(request.url);

    const modFilter = searchParams.get('module') || undefined;
    const referenceId = searchParams.get('referenceId') || undefined;
    const folder = searchParams.get('folder') || undefined;
    const search = searchParams.get('search') || undefined;
    const statusFilter = searchParams.get('status') || 'active';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase();

    // Document model is not in prisma/schema.prisma (runtime-only table) — no generated type
    const where: Record<string, any> = { tenantId, isActive: true };

    if (modFilter) where.module = modFilter;
    if (referenceId) where.referenceId = referenceId;
    if (folder) where.folder = folder;
    if (search) {
      where.OR = [
        { originalName: { contains: search } },
        { fileName: { contains: search } },
      ];
    }
    if (statusFilter === 'archived') {
      where.isArchived = true;
    } else if (statusFilter !== 'all') {
      where.isArchived = false;
    }

    const validSortFields = ['createdAt', 'updatedAt', 'originalName', 'size', 'version'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, documents] = await Promise.all([
      db.document.count({ where }),
      db.document.findMany({
        where,
        orderBy: { [field]: direction },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { versions: true, auditLogs: true } },
        },
      }),
    ]);

    // Fetch uploader names in batch
    const uploaderIds = [...new Set(documents.map(d => d.uploadedBy).filter(Boolean))] as string[];
    const uploaders = uploaderIds.length > 0
      ? await db.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, name: true } })
      : [];
    const uploaderMap = new Map(uploaders.map(u => [u.id, u.name]));

    const mapped = documents.map(doc => ({
      id: doc.id,
      tenantId: doc.tenantId,
      module: doc.module,
      referenceId: doc.referenceId,
      fileName: doc.fileName,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      checksum: doc.checksum,
      version: doc.version,
      folder: doc.folder,
      tags: doc.tags ? JSON.parse(doc.tags as string) : [],
      storagePath: doc.storagePath,
      thumbnailPath: doc.thumbnailPath,
      virusStatus: doc.virusStatus,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedBy ? (uploaderMap.get(doc.uploadedBy) || null) : null,
      isActive: doc.isActive,
      isArchived: doc.isArchived,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      _count: doc._count,
    }));

    return NextResponse.json({
      documents: mapped,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}