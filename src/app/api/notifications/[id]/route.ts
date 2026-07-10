import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET — Get single notification by ID
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const { id } = await params;

    const notification = await db.notification.findFirst({
      where: {
        id,
        // Non-admin users can only fetch their own
        ...(isAdmin ? { tenantId } : { tenantId, userId }),
      },
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
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString() ?? null,
      archivedAt: notification.archivedAt?.toISOString() ?? null,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      createdBy: notification.createdBy,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Get notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — Update single notification (mark read, archive)
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const { id } = await params;

    // Verify ownership
    const existing = await db.notification.findFirst({
      where: {
        id,
        ...(isAdmin ? { tenantId } : { tenantId, userId }),
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.isRead === true) {
      updateData.isRead = true;
      updateData.readAt = new Date();
    }

    if (body.archive === true) {
      updateData.archivedAt = new Date();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided. Use isRead or archive.' },
        { status: 400 },
      );
    }

    const updated = await db.notification.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        isRead: true,
        readAt: true,
        archivedAt: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt?.toISOString() ?? null,
      archivedAt: updated.archivedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Delete single notification
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const { id } = await params;

    // Verify ownership
    const existing = await db.notification.findFirst({
      where: {
        id,
        ...(isAdmin ? { tenantId } : { tenantId, userId }),
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.notification.delete({ where: { id } });

    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}