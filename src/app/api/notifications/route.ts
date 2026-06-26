import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const filterUserId = request.nextUrl.searchParams.get('userId') || '';
    const isRead = request.nextUrl.searchParams.get('isRead') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = { tenantId };

    // If not admin/super_admin, only show notifications for this user
    if (payload.role !== 'admin' && payload.role !== 'super_admin' && payload.role !== 'manager') {
      where.userId = userId;
    } else if (filterUserId) {
      where.userId = filterUserId;
    }

    if (isRead === 'true') where.isRead = true;
    else if (isRead === 'false') where.isRead = false;

    const [items, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          tenantId,
          userId: (payload.role !== 'admin' && payload.role !== 'super_admin' && payload.role !== 'manager') ? userId : undefined,
          isRead: false,
        },
      }),
    ]);

    const data = items.map((n) => ({
      id: n.id,
      tenantId: n.tenantId,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      isRead: n.isRead,
      relatedEntityType: n.relatedEntityType,
      relatedEntityId: n.relatedEntityId,
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

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();

    if (body.markAllRead) {
      // Mark all as read for this user
      await db.notification.updateMany({
        where: { tenantId, userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (body.id) {
      // Mark a single notification as read
      await db.notification.updateMany({
        where: { id: body.id, tenantId },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Provide markAllRead or id' }, { status: 400 });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { userId, type, title, message, data: notifData, relatedEntityType, relatedEntityId } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        tenantId,
        userId: userId || null,
        type: type || 'general',
        title,
        message,
        data: notifData ? JSON.stringify(notifData) : null,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId || null,
      },
    });

    return NextResponse.json({
      id: notification.id,
      tenantId: notification.tenantId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      createdAt: notification.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Notification create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
