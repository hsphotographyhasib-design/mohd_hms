/**
 * Firebase Admin SDK — Server-side FCM Service
 *
 * Handles:
 * - Firebase Admin SDK initialization (lazy, singleton)
 * - Sending push notifications to specific device tokens
 * - Sending to all active devices of a user
 * - Batch sending to multiple users
 * - Delivery logging
 *
 * Gracefully degrades if Firebase Admin credentials are not configured.
 */

import { db } from '@/core/database/db';

// ─── Types ───────────────────────────────────────────────────────

export interface FcmMessagePayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: {
    notificationId?: string;
    type?: string;
    actionUrl?: string;
    actionLabel?: string;
    priority?: string;
    category?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    [key: string]: string | undefined;
  };
}

export interface FcmSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  invalidTokens?: string[];
}

// ─── Lazy Firebase Admin Initialization ─────────────────────────

let _adminApp: import('firebase-admin/app').App | null = null;
let _messaging: import('firebase-admin/messaging').Messaging | null = null;
let _initAttempted = false;
let _initError: string | null = null;

function getConfig(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function isFcmAdminConfigured(): boolean {
  return getConfig() !== null;
}

async function getAdminMessaging(): Promise<import('firebase-admin/messaging').Messaging | null> {
  if (_messaging) return _messaging;
  if (_initAttempted) return null;

  _initAttempted = true;

  try {
    const config = getConfig();
    if (!config) {
      console.log('[FCM Admin] Not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      return null;
    }

    // Dynamic import to avoid loading admin SDK at build time
    const { initializeApp, getApps, getApp, cert } = await import('firebase-admin/app');
    const { getMessaging } = await import('firebase-admin/messaging');

    if (!getApps().length) {
      _adminApp = initializeApp({
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      _adminApp = getApp();
    }

    _messaging = getMessaging(_adminApp);
    console.log('[FCM Admin] Initialized successfully');
    return _messaging;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[FCM Admin] Initialization failed:', msg);
    _initError = msg;
    return null;
  }
}

// ─── Core: Send to a single token ───────────────────────────────

export async function sendFcmToToken(
  token: string,
  payload: FcmMessagePayload,
): Promise<FcmSendResult> {
  const messaging = await getAdminMessaging();
  if (!messaging) {
    return { success: false, error: 'FCM Admin not configured' };
  }

  try {
    const message: import('firebase-admin/messaging').Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.icon ? { icon: payload.icon } : {}),
        ...(payload.image ? { image: payload.image } : {}),
      },
      data: payload.data ? {
        // Firebase Admin data values must be strings
        ...Object.fromEntries(
          Object.entries(payload.data).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ),
      } : undefined,
      webpush: {
        notification: {
          icon: payload.icon || '/logo-512.png',
          badge: '/logo-512.png',
          tag: payload.data?.notificationId || `mohd-hms-${Date.now()}`,
          requireInteraction: payload.data?.priority === 'urgent' || payload.data?.priority === 'high',
        },
        fcmOptions: {
          link: payload.data?.actionUrl || '/',
        },
      },
    };

    const messageId = await messaging.send(message);
    return { success: true, messageId };
  } catch (err: any) {
    const errorCode = err?.errorInfo?.code || '';
    const errorMessage = err?.errorInfo?.message || err?.message || String(err);

    // Check for invalid/expired tokens
    if (
      errorCode === 'messaging/invalid-registration-token' ||
      errorCode === 'messaging/registration-token-not-registered' ||
      errorMessage.includes('not a valid FCM registration token') ||
      errorMessage.includes('requested entity was not found')
    ) {
      return {
        success: false,
        error: errorMessage,
        invalidTokens: [token],
      };
    }

    return { success: false, error: errorMessage };
  }
}

// ─── Core: Send to all active devices of a user ─────────────────

export async function sendFcmToUser(
  userId: string,
  tenantId: string,
  payload: FcmMessagePayload,
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  // Fetch all active device tokens for this user
  const devices = await db.deviceToken.findMany({
    where: {
      userId,
      tenantId,
      isActive: true,
    },
    select: { id: true, token: true },
  });

  if (devices.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const messaging = await getAdminMessaging();
  if (!messaging) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  // Send to each device (Firebase doesn't have a "send to user" concept — we manage tokens ourselves)
  const promises = devices.map(async (device) => {
    const result = await sendFcmToToken(device.token, payload);
    if (result.success) {
      sent++;
      // Update lastUsedAt
      await db.deviceToken.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
      });
    } else {
      failed++;
      if (result.invalidTokens?.length) {
        invalidTokens.push(...result.invalidTokens);
      }
    }
  });

  await Promise.allSettled(promises);

  // Deactivate invalid tokens
  if (invalidTokens.length > 0) {
    await db.deviceToken.updateMany({
      where: { token: { in: invalidTokens } },
      data: { isActive: false },
    });
    console.log(`[FCM Admin] Deactivated ${invalidTokens.length} invalid token(s)`);
  }

  return { sent, failed, invalidTokens };
}

// ─── Core: Send to multiple users (batch) ───────────────────────

export async function sendFcmToUsers(
  userIds: string[],
  tenantId: string,
  payload: FcmMessagePayload,
): Promise<{ sent: number; failed: number; usersReached: number }> {
  // Batch-fetch all active tokens for all target users
  const devices = await db.deviceToken.findMany({
    where: {
      userId: { in: userIds },
      tenantId,
      isActive: true,
    },
    select: { id: true, token: true, userId: true },
  });

  if (devices.length === 0) {
    return { sent: 0, failed: 0, usersReached: 0 };
  }

  const messaging = await getAdminMessaging();
  if (!messaging) {
    return { sent: 0, failed: 0, usersReached: 0 };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  // Use multicast for efficiency (max 500 tokens per batch)
  const BATCH_SIZE = 500;
  const uniqueTokens: string[] = Array.from(new Set(devices.map(d => d.token)));

  for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
    const batch = uniqueTokens.slice(i, i + BATCH_SIZE);

    try {
      const message: import('firebase-admin/messaging').MulticastMessage = {
        tokens: batch,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.icon ? { icon: payload.icon } : {}),
          ...(payload.image ? { image: payload.image } : {}),
        },
        data: payload.data ? {
          ...Object.fromEntries(
            Object.entries(payload.data).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          ),
        } : undefined,
        webpush: {
          notification: {
            icon: payload.icon || '/logo-512.png',
            badge: '/logo-512.png',
          },
          fcmOptions: {
            link: payload.data?.actionUrl || '/',
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      sent += response.successCount;
      failed += response.failureCount;

      // Check for invalid tokens in responses
      response.responses.forEach((resp, idx) => {
        const errorCode = (resp.error as any)?.code || '';
        if (
          !resp.success &&
          (errorCode === 'messaging/invalid-registration-token' ||
           errorCode === 'messaging/registration-token-not-registered')
        ) {
          invalidTokens.push(batch[idx]);
        }
      });
    } catch (err) {
      console.error('[FCM Admin] Multicast batch failed:', err);
      failed += batch.length;
    }
  }

  // Deactivate invalid tokens
  if (invalidTokens.length > 0) {
    await db.deviceToken.updateMany({
      where: { token: { in: invalidTokens } },
      data: { isActive: false },
    });
    console.log(`[FCM Admin] Deactivated ${invalidTokens.length} invalid token(s)`);
  }

  const usersReached = new Set(devices.filter(d => !invalidTokens.includes(d.token)).map(d => d.userId)).size;

  return { sent, failed, usersReached };
}

// ─── Log delivery ───────────────────────────────────────────────

export async function logFcmDelivery(params: {
  tenantId: string;
  userId: string;
  notificationId?: string;
  deviceTokenId?: string;
  fcmMessageId?: string;
  fcmToken?: string;
  status: 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.notificationLog.create({
      data: {
        tenantId: params.tenantId,
        notificationId: params.notificationId || null,
        userId: params.userId,
        deviceTokenId: params.deviceTokenId || null,
        fcmMessageId: params.fcmMessageId || null,
        fcmToken: params.fcmToken || null,
        deliveryStatus: params.status,
        errorMessage: params.errorMessage || null,
      },
    });
  } catch (err) {
    // Logging should never crash the notification flow
    console.error('[FCM Admin] Failed to log delivery:', err);
  }
}