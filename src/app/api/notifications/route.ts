import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import {
  createNotification,
  type CreateNotificationInput,
} from '@/modules/notifications/services/notification-service';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET — Enhanced notification listing
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const isAdmin = role === 'admin' || role === 'super_admin';

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const type = searchParams.get('type') || '';
    const isRead = searchParams.get('isRead') || '';
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.NotificationWhereInput = { tenantId };

    // Non-admin users only see their own notifications
    if (!isAdmin) {
      where.userId = userId;
    }

    // Not archived (show active + read, but not archived)
    where.archivedAt = null;

    if (type) {
      where.type = type;
    }

    if (isRead === 'true') {
      where.isRead = true;
    } else if (isRead === 'false') {
      where.isRead = false;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
      ];
    }

    // Fetch data, total, and unread count in parallel
    const [items, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          message: true,
          data: true,
          priority: true,
          isRead: true,
          readAt: true,
          archivedAt: true,
          relatedEntityType: true,
          relatedEntityId: true,
          actionUrl: true,
          actionLabel: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          tenantId,
          ...(isAdmin ? {} : { userId }),
          isRead: false,
          archivedAt: null,
        },
      }),
    ]);

    const data = items.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      priority: n.priority,
      isRead: n.isRead,
      readAt: n.readAt?.toISOString() ?? null,
      archivedAt: n.archivedAt?.toISOString() ?? null,
      relatedEntityType: n.relatedEntityType,
      relatedEntityId: n.relatedEntityId,
      actionUrl: n.actionUrl,
      actionLabel: n.actionLabel,
      createdBy: n.createdBy,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Create notification (delegates to NotificationService)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const body = await request.json();
    const {
      targetUserId,
      type,
      title,
      message,
      priority,
      data: notifData,
      relatedEntityType,
      relatedEntityId,
      actionUrl,
      actionLabel,
      roles,
      excludeUserIds,
    } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    // Only admin/super_admin can send notifications to arbitrary users
    if (targetUserId && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only admins can send notifications to other users' },
        { status: 403 },
      );
    }

    const input: CreateNotificationInput = {
      tenantId,
      type,
      title: title.trim(),
      message: message.trim(),
      priority: priority || 'normal',
      data: notifData || undefined,
      relatedEntityType: relatedEntityType || undefined,
      relatedEntityId: relatedEntityId || undefined,
      actionUrl: actionUrl || undefined,
      actionLabel: actionLabel || undefined,
      createdBy: userId,
      // If targetUserId provided (admin), send to that user; otherwise send to self
      userId: targetUserId || userId,
      roles: roles || undefined,
      excludeUserIds: excludeUserIds || undefined,
    };

    const id = await createNotification(input);

    if (!id) {
      return NextResponse.json({ message: 'Notification was deduplicated or no targets found' });
    }

    return NextResponse.json({
      id,
      message: 'Notification created',
    }, { status: 201 });
  } catch (error) {
    console.error('Notification create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — Mark as read, archive operations
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const isAdmin = role === 'admin' || role === 'super_admin';

    const body = await request.json();
    const now = new Date();

    // ── Mark all unread as read ──
    if (body.markAllRead === true) {
      const where: Prisma.NotificationWhereInput = {
        tenantId,
        userId,
        isRead: false,
      };

      await db.notification.updateMany({
        where,
        data: { isRead: true, readAt: now },
      });

      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    // ── Mark specific notifications as read ──
    if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      // If archive flag is also set, archive instead
      if (body.archive === true) {
        const where: Prisma.NotificationWhereInput = {
          id: { in: body.ids },
          // Non-admin users can only archive their own
          ...(isAdmin ? { tenantId } : { tenantId, userId }),
        };

        await db.notification.updateMany({
          where,
          data: { archivedAt: now },
        });

        return NextResponse.json({ message: 'Notifications archived' });
      }

      // Otherwise, mark as read
      const where: Prisma.NotificationWhereInput = {
        id: { in: body.ids },
        // Non-admin users can only update their own
        ...(isAdmin ? { tenantId } : { tenantId, userId }),
      };

      await db.notification.updateMany({
        where,
        data: { isRead: true, readAt: now },
      });

      return NextResponse.json({ message: 'Notifications marked as read' });
    }

    // ── Archive all read notifications ──
    if (body.archiveAll === true) {
      const where: Prisma.NotificationWhereInput = {
        tenantId,
        userId,
        isRead: true,
        archivedAt: null,
      };

      await db.notification.updateMany({
        where,
        data: { archivedAt: now },
      });

      return NextResponse.json({ message: 'All read notifications archived' });
    }

    return NextResponse.json(
      { error: 'Provide markAllRead, ids, or archiveAll' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Delete notification(s)
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const isAdmin = role === 'admin' || role === 'super_admin';

    const body = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const where: Prisma.NotificationWhereInput = {
      id: { in: body.ids },
      // Non-admin users can only delete their own
      ...(isAdmin ? { tenantId } : { tenantId, userId }),
    };

    const result = await db.notification.deleteMany({ where });

    return NextResponse.json({
      message: `${result.count} notification(s) deleted`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}