import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

/**
 * Enterprise notification logging endpoint.
 * Creates notification records for auditing and cross-module event tracking.
 *
 * POST /api/notifications/log — Create a notification event
 * GET  /api/notifications/log — List recent notification logs (admin only)
 */

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { type, title, message, module: notifModule, action, result, referenceId, relatedEntityType, relatedEntityId } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'type and title are required' }, { status: 400 });
    }

    // Build the data JSON blob for extra metadata
    const dataObj: Record<string, unknown> = {};
    if (notifModule) dataObj.module = notifModule;
    if (action) dataObj.action = action;
    if (result) dataObj.result = result;

    await db.notification.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: type.toUpperCase(),
        title,
        message: message || '',
        data: Object.keys(dataObj).length > 0 ? JSON.stringify(dataObj) : null,
        isRead: false,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: referenceId || relatedEntityId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const notifModule = searchParams.get('module');
    const relatedType = searchParams.get('relatedEntityType');

    const where: Record<string, unknown> = {};
    if (type) where.type = type.toUpperCase();
    if (relatedType) where.relatedEntityType = relatedType;

    // If filtering by module, search within the JSON data field
    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        data: true,
        isRead: true,
        relatedEntityType: true,
        relatedEntityId: true,
        createdAt: true,
      },
    });

    const total = await db.notification.count({ where });

    // Post-process: parse data JSON for module/action filtering
    const logs = notifModule
      ? notifications.filter((n) => {
          try {
            const d = n.data ? JSON.parse(n.data) : {};
            return d.module === notifModule;
          } catch {
            return false;
          }
        })
      : notifications;

    return NextResponse.json({ logs, total, limit, offset });
  } catch (error) {
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}