/**
 * Centralized Notification Service for MOHD.HMS Backend.
 *
 * This is the SINGLE source of truth for creating and delivering notifications.
 * All modules (complaints, work orders, invoices, etc.) should call this service.
 *
 * Flow:
 *   Module → sendNotification() → DB Notification records → FCM push → UI
 */

import type { BatchResponse, SendResponse, MulticastMessage } from 'firebase-admin/messaging';
import { db } from './db.js';
import { getMessagingInstance, isFirebaseConfigured } from './firebase.js';

// ─── Types ───────────────────────────────────────────────────────────────

export interface NotificationInput {
  tenantId: string;
  userId?: string;
  userIds?: string[];
  roles?: string[];
  excludeUserIds?: string[];
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdBy?: string;
  sendPush?: boolean;
}

export interface DeviceRegisterInput {
  tenantId: string;
  userId: string;
  token: string;
  platform: string;
  browser?: string;
  os?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

// ─── Notification Priority Icon Map ──────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  approval: '📋',
  reminder: '🔔',
  assignment: '👤',
  system_alert: '🚨',
  emergency: '🆘',
};

// ─── Main Notification Function ──────────────────────────────────────────

/**
 * Send a notification to one or more users.
 * Creates DB records + sends FCM push (if configured).
 */
export async function sendNotification(input: NotificationInput): Promise<string[]> {
  const { tenantId } = input;
  const targetUserIds = await resolveTargetUserIds(input);

  if (targetUserIds.length === 0) return [];

  // 1. Create Notification records in DB (one per user)
  const notificationIds: string[] = [];
  const now = new Date().toISOString();

  try {
    const notifications = targetUserIds.map((userId) => ({
      id: generateId(),
      tenantId,
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority || 'normal',
      data: JSON.stringify({
        category: input.category,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      }),
      relatedEntityType: input.relatedEntityType || null,
      relatedEntityId: input.relatedEntityId || null,
      actionUrl: input.actionUrl || null,
      actionLabel: input.actionLabel || null,
      createdBy: input.createdBy || null,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await db.notification.createMany({ data: notifications });
    notificationIds.push(...(result as { ids: string[] })?.ids || notifications.map((n) => n.id));
  } catch (err) {
    console.error('[NotificationService] Failed to create DB records:', err);
  }

  // 2. Send FCM push (fire-and-forget)
  if (input.sendPush !== false && isFirebaseConfigured()) {
    sendFcmPush(targetUserIds, {
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority || 'normal',
      category: input.category,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      notificationId: notificationIds[0], // Use first notification ID as reference
      tenantId,
    }).catch((err) => {
      console.error('[NotificationService] FCM push failed (non-blocking):', err);
    });
  }

  return notificationIds;
}

/**
 * Send notifications to multiple targets at once.
 */
export async function sendNotifications(inputs: NotificationInput[]): Promise<void> {
  await Promise.allSettled(inputs.map((input) => sendNotification(input)));
}

// ─── Test Notification ───────────────────────────────────────────────────

export async function sendTestNotification(userId: string, tenantId: string): Promise<boolean> {
  return sendFcmPush([userId], {
    type: 'success',
    title: '🔔 Firebase Connected Successfully',
    message: 'Real-time notification is working correctly.',
    priority: 'high',
    category: 'system',
    actionUrl: undefined,
    notificationId: `test-${Date.now()}`,
    tenantId,
  }).then(() => true).catch(() => false);
}

// ─── Device Token Management ─────────────────────────────────────────────

export async function registerDeviceToken(input: DeviceRegisterInput): Promise<void> {
  const { tenantId, userId, token, platform, browser, os, deviceName, userAgent, ipAddress } = input;

  try {
    // Check if this token already exists (for any user — tokens are globally unique)
    const existing = await db.deviceToken.findUnique({
      where: { token },
    });

    if (existing) {
      // Update existing token — user may have logged in on a different account
      await db.deviceToken.update({
        where: { token },
        data: {
          tenantId,
          userId,
          platform,
          browser: browser || existing.browser,
          os: os || existing.os,
          deviceName: deviceName || existing.deviceName,
          userAgent: userAgent || existing.userAgent,
          ipAddress: ipAddress || existing.ipAddress,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    } else {
      // Create new token
      await db.deviceToken.create({
        data: {
          tenantId,
          userId,
          token,
          platform,
          browser,
          os,
          deviceName,
          userAgent,
          ipAddress,
          isActive: true,
        },
      });
    }

    // Deactivate old tokens for same user+platform (keep max 5 per user)
    const userTokens = await db.deviceToken.findMany({
      where: { tenantId, userId, platform, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, token: true },
    });

    if (userTokens.length > 5) {
      const toDeactivate = userTokens.slice(5);
      await db.deviceToken.updateMany({
        where: { id: { in: toDeactivate.map((t: { id: string }) => t.id) } },
        data: { isActive: false },
      });
    }
  } catch (err) {
    console.error('[NotificationService] Failed to register device token:', err);
  }
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  try {
    await db.deviceToken.deleteMany({ where: { token } });
  } catch (err) {
    console.error('[NotificationService] Failed to unregister device token:', err);
  }
}

export async function getUserDevices(tenantId: string, userId: string) {
  try {
    return await db.deviceToken.findMany({
      where: { tenantId, userId, isActive: true },
      select: {
        id: true,
        platform: true,
        browser: true,
        os: true,
        deviceName: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  } catch (err) {
    console.error('[NotificationService] Failed to get user devices:', err);
    return [];
  }
}

// ─── Internal: Resolve Target Users ──────────────────────────────────────

async function resolveTargetUserIds(input: NotificationInput): Promise<string[]> {
  const ids = new Set<string>();

  // Direct user IDs
  if (input.userId) ids.add(input.userId);
  if (input.userIds) input.userIds.forEach((id) => ids.add(id));

  // Role-based: find all active users with specified roles
  if (input.roles && input.roles.length > 0) {
    try {
      const users = await db.user.findMany({
        where: {
          tenantId: input.tenantId,
          role: { in: input.roles },
          isActive: true,
        },
        select: { id: true },
      });
      users.forEach((u: { id: string }) => ids.add(u.id));
    } catch (err) {
      console.error('[NotificationService] Failed to resolve role-based users:', err);
    }
  }

  // Exclude specific users
  if (input.excludeUserIds) {
    input.excludeUserIds.forEach((id) => ids.delete(id));
  }

  return [...ids];
}

// ─── Internal: FCM Push Delivery ─────────────────────────────────────────

interface FcmPayload {
  type: string;
  title: string;
  message: string;
  priority: string;
  category?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  notificationId?: string;
  tenantId: string;
}

async function sendFcmPush(targetUserIds: string[], payload: FcmPayload): Promise<void> {
  const messaging = getMessagingInstance();
  if (!messaging) return;

  // Get active device tokens for target users
  const tokens: Array<{ id: string; token: string; userId: string }> = await db.deviceToken.findMany({
    where: {
      userId: { in: targetUserIds },
      isActive: true,
    },
    select: { id: true, token: true, userId: true },
  });

  if (tokens.length === 0) return;

  const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL || '';

  // Build the common FCM message template (same content for all tokens)
  const multicastMessage: MulticastMessage = {
    tokens: tokens.map((t) => t.token),
    notification: {
      title: payload.title,
      body: payload.message,
    },
    data: {
      notificationId: payload.notificationId || '',
      type: payload.type,
      actionUrl: payload.actionUrl || '',
      actionLabel: payload.actionLabel || '',
      category: payload.category || '',
      priority: payload.priority,
      relatedEntityType: payload.relatedEntityType || '',
      relatedEntityId: payload.relatedEntityId || '',
      tenantId: payload.tenantId,
      timestamp: new Date().toISOString(),
    },
    webpush: {
      fcmOptions: {
        link: payload.actionUrl ? `${frontendUrl.replace(/\/$/, '')}/${payload.actionUrl}` : frontendUrl || '/',
      },
      notification: {
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: payload.notificationId || `mohd-hms-${Date.now()}`,
      },
    },
    android: {
      priority: payload.priority === 'urgent' || payload.priority === 'high' ? 'high' : 'normal',
      notification: {
        icon: '/logo-192.png',
        sound: payload.priority === 'urgent' ? 'default' : undefined,
      },
    },
    apns: {
      payload: {
        aps: {
          sound: payload.priority === 'urgent' ? 'default' : undefined,
          badge: 1,
        },
      },
    },
  };

  // Batch send (max 500 per batch)
  const BATCH_SIZE = 500;
  const invalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batchTokens = tokens.slice(i, i + BATCH_SIZE);
    try {
      const response: BatchResponse = await messaging.sendEachForMulticast({
        ...multicastMessage,
        tokens: batchTokens.map((t) => t.token),
      });

      // Log delivery results
      if (response.failureCount > 0) {
        response.responses.forEach((resp: SendResponse, idx: number) => {
          if (!resp.success) {
            const token = batchTokens[idx].token;
            const errInfo = resp.error;
            invalidTokens.push(token);

            console.warn(`[FCM] Token delivery failed: ${errInfo?.code} — ${errInfo?.message}`);
          }
        });
      }

      // Create notification logs
      const logEntries = response.responses.map((resp: SendResponse, idx: number) => ({
        id: generateId(),
        tenantId: payload.tenantId,
        notificationId: payload.notificationId || null,
        userId: batchTokens[idx]?.userId || '',
        fcmToken: batchTokens[idx].token,
        fcmMessageId: resp.messageId || null,
        deliveryStatus: resp.success ? 'sent' : 'failed',
        errorMessage: resp.error?.message || null,
        createdAt: new Date(),
      }));

      try {
        await db.notificationLog.createMany({ data: logEntries });
      } catch {
        // Non-critical
      }
    } catch (err) {
      console.error('[FCM] Batch send error:', err);
    }
  }

  // Cleanup invalid tokens
  if (invalidTokens.length > 0) {
    cleanupInvalidTokens(invalidTokens).catch(() => {});
  }
}

// ─── Internal: Cleanup Invalid Tokens ────────────────────────────────────

async function cleanupInvalidTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  try {
    await db.deviceToken.updateMany({
      where: { token: { in: tokens } },
      data: { isActive: false },
    });
    console.log(`[NotificationService] Deactivated ${tokens.length} invalid device token(s)`);
  } catch (err) {
    console.error('[NotificationService] Failed to cleanup invalid tokens:', err);
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `ntf_${ts}${rand}`;
}