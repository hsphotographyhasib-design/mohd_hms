import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/enterprise-log
//
// Enhanced enterprise notification logging endpoint.
// Creates a Notification record with a structured type like
// `LOG_COMPLAINTS_CREATED` so that logs are queryable and filterable.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate & Authorize ──────────────────────────────────────
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId } = auth;

    // ── 2. Parse & validate request body ─────────────────────────────────
    const body = await request.json();
    const {
      notificationType,
      module: notifModule,
      action,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      recordNumber,
      deliveryStatus,
      recipientCount,
    } = body;

    if (!notificationType?.trim()) {
      return NextResponse.json(
        { error: 'notificationType is required' },
        { status: 400 },
      );
    }
    if (!notifModule?.trim()) {
      return NextResponse.json(
        { error: 'module is required' },
        { status: 400 },
      );
    }
    if (!action?.trim()) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 },
      );
    }

    // ── 3. Build structured type & data ──────────────────────────────────
    const logType = `LOG_${notifModule.trim().toUpperCase()}_${action.trim().toUpperCase()}`;

    const dataObj: Record<string, unknown> = {
      notificationType: notificationType.trim(),
      module: notifModule.trim(),
      action: action.trim(),
    };
    if (recordNumber) dataObj.recordNumber = recordNumber;
    if (deliveryStatus) dataObj.deliveryStatus = deliveryStatus;
    if (recipientCount !== undefined && recipientCount !== null) {
      dataObj.recipientCount = recipientCount;
    }

    // ── 4. Create the log entry ──────────────────────────────────────────
    const record = await db.notification.create({
      data: {
        tenantId,
        userId,
        type: logType,
        title: title?.trim() || `${notifModule.trim()}: ${action.trim()}`,
        message: message?.trim() || '',
        data: JSON.stringify(dataObj),
        isRead: true, // Logs are auto-read; they're audit records, not user notifications
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId || null,
      },
    });

    return NextResponse.json({
      success: true,
      logId: record.id,
    });
  } catch (error) {
    console.error('[POST /api/notifications/enterprise-log] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/enterprise-log
//
// List notification logs (admin / super_admin only).
// Supports filtering by module, type prefix, and date range.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // ── 1. Authenticate & Authorize (feature check covers role gate) ─────
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    // ── 2. Parse query parameters ────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const moduleFilter = searchParams.get('module')?.trim(); // e.g. "complaints"
    const typeFilter = searchParams.get('type')?.trim(); // e.g. "success"
    const fromStr = searchParams.get('from')?.trim(); // YYYY-MM-DD
    const toStr = searchParams.get('to')?.trim(); // YYYY-MM-DD

    // ── 3. Build where clause ────────────────────────────────────────────
    const where: Prisma.NotificationWhereInput = {
      tenantId,
    };

    // Filter by LOG_ prefix to only return log entries (not regular notifications)
    where.type = { startsWith: 'LOG_' };

    if (moduleFilter) {
      // type = `LOG_COMPLAINTS_CREATED` → filter by `LOG_COMPLAINTS_`
      const moduleUpper = moduleFilter.toUpperCase();
      (where.type as Prisma.StringNullableFilter).startsWith = `LOG_${moduleUpper}_`;
    }

    // If typeFilter is provided, search within the JSON data.notificationType field
    // Since we can't easily query JSON in a DB-agnostic way across Prisma/Supabase,
    // we'll post-filter. But for Prisma (SQLite/Postgres) we can use data path.
    // We'll include all LOG_ entries and post-filter by notificationType.

    // Date range filtering
    if (fromStr || toStr) {
      const createdAtFilter: Prisma.DateTimeNullableFilter = {};
      if (fromStr) {
        const from = new Date(fromStr);
        if (!isNaN(from.getTime())) {
          createdAtFilter.gte = from;
        }
      }
      if (toStr) {
        const to = new Date(toStr);
        if (!isNaN(to.getTime())) {
          // End of day
          to.setHours(23, 59, 59, 999);
          createdAtFilter.lte = to;
        }
      }
      where.createdAt = createdAtFilter;
    }

    // ── 4. Query ─────────────────────────────────────────────────────────
    const [items, total] = await Promise.all([
      db.notification.findMany({
        where,
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          message: true,
          data: true,
          isRead: true,
          relatedEntityType: true,
          relatedEntityId: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where }),
    ]);

    // ── 5. Post-filter by notificationType if provided ───────────────────
    let logs = items;
    if (typeFilter) {
      const lowerType = typeFilter.toLowerCase();
      logs = items.filter((item: any) => {
        try {
          const parsed = item.data ? JSON.parse(item.data) : {};
          return (
            parsed.notificationType?.toLowerCase() === lowerType ||
            parsed.deliveryStatus?.toLowerCase() === lowerType
          );
        } catch {
          return false;
        }
      });
    }

    // ── 6. Format response ───────────────────────────────────────────────
    const formattedLogs = logs.map((item: any) => ({
      id: item.id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      message: item.message,
      data: item.data ? (() => { try { return JSON.parse(item.data); } catch { return item.data; } })() : null,
      relatedEntityType: item.relatedEntityType,
      relatedEntityId: item.relatedEntityId,
      createdBy: item.createdBy,
      createdAt: item.createdAt?.toISOString?.() ?? item.createdAt ?? null,
      updatedAt: item.updatedAt?.toISOString?.() ?? item.updatedAt ?? null,
    }));

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[GET /api/notifications/enterprise-log] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500 },
    );
  }
}