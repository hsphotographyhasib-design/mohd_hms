import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { searchParams } = new URL(request.url);

    const documentId = searchParams.get('documentId') || undefined;
    const action = searchParams.get('action') || undefined;
    const performedBy = searchParams.get('performedBy') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const where: Prisma.DocumentAuditLogWhereInput = { tenantId };

    if (documentId) where.documentId = documentId;
    if (action) where.action = action;
    if (performedBy) where.performedBy = performedBy;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Prisma.DateTimeNullableFilter).gte = startDate;
      if (endDate) (where.createdAt as Prisma.DateTimeNullableFilter).lte = endDate;
    }

    const [total, logs] = await Promise.all([
      db.documentAuditLog.count({ where }),
      db.documentAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Fetch performer names
    const performerIds = [...new Set(logs.map(l => l.performedBy).filter(Boolean))] as string[];
    const performers = performerIds.length > 0
      ? await db.user.findMany({ where: { id: { in: performerIds } }, select: { id: true, name: true } })
      : [];
    const performerMap = new Map(performers.map(u => [u.id, u.name]));

    return NextResponse.json({
      logs: logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata as string) : {},
        performedByName: log.performedBy ? (performerMap.get(log.performedBy) || null) : null,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Audit log list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}