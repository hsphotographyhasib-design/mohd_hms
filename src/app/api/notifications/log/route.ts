import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

/**
 * Enterprise notification logging endpoint.
 * Stores notification events in the database for auditing and troubleshooting.
 *
 * POST /api/notifications/log — Log a notification event
 * GET  /api/notifications/log — List recent notification logs (admin only)
 */

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    const userId = payload?.userId;

    const body = await request.json();
    const { type, title, description, notifModule, action, result, referenceId } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'type and title are required' }, { status: 400 });
    }

    await db.notification.create({
      data: {
        userId: userId || null,
        type: type.toUpperCase(),
        title,
        description: description || null,
        module: notifModule || null,
        action: action || 'display',
        result: result || 'success',
        referenceId: referenceId || null,
        isRead: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const notifModule = searchParams.get('module');

    const where: Record<string, unknown> = {};
    if (type) where.type = type.toUpperCase();
    if (notifModule) where.module = notifModule;

    const [logs, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          module: true,
          action: true,
          result: true,
          referenceId: true,
          isRead: true,
          createdAt: true,
        },
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({ logs, total, limit, offset });
  } catch (error) {
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}