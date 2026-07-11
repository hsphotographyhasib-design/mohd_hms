import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
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
    // ── 1. Authenticate & Authorize ──────────────────────────────────────
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;
    const { userId, role, tenantId } = auth;

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
      actionUrl: actionUrl || undefined,
      actionLabel: actionLabel || undefined,
      context: context || undefined,
      data: recordNumber ? { ...(data || {}), recordNumber } : (data || undefined),
      createdBy: userId,
    });

    // ── 4. Log the notification event ────────────────────────────────────
    try {
      await logNotificationEvent({
        tenantId,
        userId,
        notificationType: type,
        module: relatedEntityType || 'general',
        action: 'send_role_based',
        relatedRecordId: relatedEntityId || undefined,
        deliveryStatus: 'sent',
        recipientCount: 0,
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