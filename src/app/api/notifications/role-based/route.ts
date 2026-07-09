import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/core/auth/auth-lib';
import {
  sendRoleBasedNotification,
  logNotificationEvent,
} from '@/modules/notifications/services/role-router';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/role-based
//
// Server-side endpoint for role-based notification delivery.
// Resolves target recipients based on the eventKey + context, then creates
// individual Notification records for every matched user.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId as string;
    const role = payload.role as string;
    const tenantId = payload.tenantId as string;

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: 'Invalid token: missing userId or tenantId' },
        { status: 401 },
      );
    }

    // ── 2. Parse & validate request body ─────────────────────────────────
    const body = await request.json();
    const {
      eventKey,
      title,
      message,
      type = 'info',
      priority = 'normal',
      relatedEntityType,
      relatedEntityId,
      recordNumber,
      actionUrl,
      actionLabel,
      context,
      data,
    } = body;

    if (!eventKey?.trim()) {
      return NextResponse.json(
        { error: 'eventKey is required' },
        { status: 400 },
      );
    }
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 },
      );
    }
    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 },
      );
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `priority must be one of: ${validPriorities.join(', ')}` },
        { status: 400 },
      );
    }

    // ── 3. Delegate to role-router service ──────────────────────────────
    const notificationId = await sendRoleBasedNotification({
      tenantId,
      eventKey: eventKey.trim(),
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      relatedEntityType: relatedEntityType || undefined,
      relatedEntityId: relatedEntityId || undefined,
      recordNumber: recordNumber || undefined,
      actionUrl: actionUrl || undefined,
      actionLabel: actionLabel || undefined,
      context: context || undefined,
      data: data || undefined,
      createdBy: userId,
      actorRole: role,
    });

    // ── 4. Log the notification event ────────────────────────────────────
    try {
      await logNotificationEvent({
        tenantId,
        userId,
        eventKey: eventKey.trim(),
        title: title.trim(),
        message: message.trim(),
        module: relatedEntityType || undefined,
        action: 'send_role_based',
        relatedEntityType,
        relatedEntityId,
        recordNumber,
        notificationId,
        context: context || undefined,
        data: data || undefined,
      });
    } catch (logErr) {
      // Logging failure should not break the response
      console.error('[role-based] Failed to log notification event:', logErr);
    }

    // ── 5. Return success ───────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      notificationId,
    });
  } catch (error) {
    console.error('[POST /api/notifications/role-based] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}