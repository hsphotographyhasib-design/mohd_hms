import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendFcmToUser, isFcmAdminConfigured, logFcmDelivery } from '@/lib/fcm-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/test
 *
 * Sends a test push notification to the authenticated user's registered devices.
 * Used by admins to verify the FCM pipeline is working end-to-end.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId as string;
    const tenantId = payload.tenantId as string;

    // Check if FCM is configured
    if (!isFcmAdminConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'FCM Admin SDK not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      });
    }

    // Check if user has registered devices
    const devices = await db.deviceToken.findMany({
      where: { userId, tenantId, isActive: true },
      select: { id: true, token: true, deviceName: true, platform: true },
    });

    if (devices.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No registered devices found. Enable push notifications in your browser first.',
      });
    }

    // Send test notification
    const result = await sendFcmToUser(userId, tenantId, {
      title: '🔔 Test Notification',
      body: 'If you see this, your push notifications are working correctly!',
      icon: '/logo-512.png',
      data: {
        type: 'system_alert',
        priority: 'normal',
        actionUrl: '/',
        actionLabel: 'Go to Dashboard',
      },
    });

    // Log the delivery attempt
    for (const device of devices) {
      await logFcmDelivery({
        tenantId,
        userId,
        fcmToken: device.token,
        deviceTokenId: device.id,
        status: result.sent > 0 ? 'sent' : 'failed',
      });
    }

    return NextResponse.json({
      success: result.sent > 0,
      message: result.sent > 0
        ? `Test notification sent to ${result.sent} device(s).`
        : 'Failed to send. Your device tokens may be expired.',
      devices: devices.map((d) => ({
        name: d.deviceName || d.platform,
        platform: d.platform,
      })),
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[TestNotification] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal error',
    }, { status: 500 });
  }
}