/**
 * Centralized Notification Service
 *
 * SINGLE SOURCE OF TRUTH for all notification creation.
 * All modules (complaints, work-orders, invoices, inventory, etc.)
 * MUST use this service to create notifications.
 *
 * Features:
 * - Deduplication: skips if same title + relatedEntityId was created
 *   in the last 30 seconds for the same user
 * - Role-based targeting: send to all users with specific roles
 * - Batch creation
 * - Convenience helpers for common enterprise patterns
 * - Pushes to WebSocket service for real-time delivery
 * - Sends push notifications via FCM (Firebase Cloud Messaging)
 */

import { db } from '@/lib/db';
import { sendFcmToUsers, logFcmDelivery, isFcmAdminConfigured } from '@/lib/fcm-admin';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'approval'
  | 'reminder'
  | 'system_alert'
  | 'complaint_assigned'
  | 'complaint_accepted'
  | 'complaint_rejected'
  | 'complaint_reassigned_away'
  | 'workflow_transition'
  | 'work_order_assigned'
  | 'work_order_supervised'
  | 'invoice_created'
  | 'low_stock'
  | 'general';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CreateNotificationInput {
  tenantId: string;
  /** Single user ID, or array of user IDs. Mutually exclusive with `roles`. */
  userId?: string | string[];
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdBy?: string;
  data?: Record<string, unknown>;
  /** Role-based targeting (alternative to userId) */
  roles?: string[];
  /** Skip specific user IDs (useful with roles) */
  excludeUserIds?: string[];
}

/** Shape of a notification as stored/returned from the DB */
export interface NotificationRecord {
  id: string;
  tenantId: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  data: string | null;
  priority: string;
  isRead: boolean;
  readAt: Date | null;
  archivedAt: Date | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket push helper (fire-and-forget)
// ─────────────────────────────────────────────────────────────────────────────

const WS_SERVICE_URL = 'http://127.0.0.1:3010/send';

async function pushToWebSocket(
  userId: string,
  tenantId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    actionUrl?: string | null;
    actionLabel?: string | null;
  },
): Promise<void> {
  // Fire-and-forget — don't block notification creation on WebSocket delivery
  fetch(WS_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, tenantId, notification }),
  }).catch(() => {
    // WebSocket service may not be running — that's OK, notifications still in DB
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: resolve target user IDs
// ─────────────────────────────────────────────────────────────────────────────

async function resolveTargetUserIds(input: CreateNotificationInput): Promise<string[]> {
  // Explicit user IDs
  if (input.userId) {
    const ids = Array.isArray(input.userId) ? input.userId : [input.userId];
    // Apply exclusion list
    if (input.excludeUserIds?.length) {
      const excludeSet = new Set(input.excludeUserIds);
      return ids.filter((id) => !excludeSet.has(id));
    }
    return ids;
  }

  // Role-based targeting
  if (input.roles && input.roles.length > 0) {
    const users = await db.user.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        role: { in: input.roles },
        ...(input.excludeUserIds?.length
          ? { id: { not: { in: input.excludeUserIds } } }
          : {}),
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: dedup check (30-second window, same user + title + relatedEntityId)
// ─────────────────────────────────────────────────────────────────────────────

const DEDUP_WINDOW_MS = 30_000;

async function isDuplicate(
  userId: string,
  tenantId: string,
  title: string,
  relatedEntityId: string | undefined,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

  const where: Record<string, unknown> = {
    tenantId,
    userId,
    title,
    createdAt: { gte: cutoff },
  };

  if (relatedEntityId) {
    where.relatedEntityId = relatedEntityId;
  }

  const count = await db.notification.count({ where });
  return count > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: create a single notification
// ─────────────────────────────────────────────────────────────────────────────

export async function createNotification(
  input: CreateNotificationInput,
): Promise<string> {
  const targetUserIds = await resolveTargetUserIds(input);

  if (targetUserIds.length === 0) {
    // No target users — nothing to create
    return '';
  }

  let firstId = '';

  for (const userId of targetUserIds) {
    // Dedup check
    const dup = await isDuplicate(
      userId,
      input.tenantId,
      input.title,
      input.relatedEntityId,
    );
    if (dup) continue;

    const notification = await db.notification.create({
      data: {
        tenantId: input.tenantId,
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority || 'normal',
        data: input.data ? JSON.stringify(input.data) : null,
        relatedEntityType: input.relatedEntityType || null,
        relatedEntityId: input.relatedEntityId || null,
        actionUrl: input.actionUrl || null,
        actionLabel: input.actionLabel || null,
        createdBy: input.createdBy || null,
      },
    });

    if (!firstId) firstId = notification.id;

    // Push to WebSocket for real-time delivery
    pushToWebSocket(userId, input.tenantId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
    });
  }

  // ── FCM Push Notification (fire-and-forget) ──
  // Send push notifications to all target users' devices
  if (firstId && isFcmAdminConfigured()) {
    sendFcmToUsers(targetUserIds, input.tenantId, {
      title: input.title,
      body: input.message,
      icon: '/logo.png',
      data: {
        notificationId: firstId,
        type: input.type,
        priority: input.priority || 'normal',
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      },
    }).then((result) => {
      if (result.sent > 0) {
        console.log(`[NotificationService] FCM push sent: ${result.sent} device(s), ${result.usersReached} user(s) reached`);
      }
      if (result.failed > 0) {
        console.warn(`[NotificationService] FCM push failed: ${result.failed} device(s)`);
      }
    }).catch((err) => {
      // FCM failure should never crash the notification flow
      console.error('[NotificationService] FCM push error:', err);
    });
  }

  return firstId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch create
// ─────────────────────────────────────────────────────────────────────────────

export async function createNotifications(
  inputs: CreateNotificationInput[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const input of inputs) {
    const id = await createNotification(input);
    if (id) ids.push(id);
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers — common enterprise notification patterns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify when a complaint is assigned to a technician.
 * Also notifies the customer.
 */
export async function notifyComplaintAssigned(
  complaintId: string,
  tenantId: string,
  technicianId: string,
  customerId: string,
  complaintTitle: string,
  createdBy: string,
): Promise<void> {
  await createNotification({
    tenantId,
    userId: technicianId,
    type: 'info',
    title: 'New Complaint Assigned',
    message: `You have been assigned a new complaint: ${complaintTitle}. Please review and respond promptly.`,
    priority: 'normal',
    relatedEntityType: 'complaint',
    relatedEntityId: complaintId,
    actionLabel: 'View Complaint',
    createdBy,
    data: { complaintId },
  });

  await createNotification({
    tenantId,
    userId: customerId,
    type: 'info',
    title: 'Technician Assigned',
    message: `A technician has been assigned to your complaint: ${complaintTitle}.`,
    priority: 'normal',
    relatedEntityType: 'complaint',
    relatedEntityId: complaintId,
    actionLabel: 'View Complaint',
    createdBy,
    data: { complaintId },
  });
}

/**
 * Notify relevant users when a complaint status changes.
 */
export async function notifyComplaintStatusChange(
  complaintId: string,
  tenantId: string,
  status: string,
  title: string,
  targetUserIds: string[],
  createdBy: string,
): Promise<void> {
  const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  await createNotification({
    tenantId,
    userId: targetUserIds,
    type: 'info',
    title: `Complaint ${statusLabel}`,
    message: `Complaint "${title}" has been updated to: ${statusLabel}.`,
    priority: 'normal',
    relatedEntityType: 'complaint',
    relatedEntityId: complaintId,
    actionLabel: 'View Complaint',
    createdBy,
    data: { complaintId, status },
  });
}

/**
 * Notify when a work order is created for a technician.
 */
export async function notifyWorkOrderCreated(
  workOrderId: string,
  tenantId: string,
  technicianId: string,
  title: string,
  createdBy: string,
): Promise<void> {
  await createNotification({
    tenantId,
    userId: technicianId,
    type: 'info',
    title: 'New Work Order Assigned',
    message: `You have been assigned a new work order: ${title}.`,
    priority: 'normal',
    relatedEntityType: 'work_order',
    relatedEntityId: workOrderId,
    actionLabel: 'View Work Order',
    createdBy,
    data: { workOrderId },
  });
}

/**
 * Notify when an invoice is created for a customer.
 */
export async function notifyInvoiceCreated(
  invoiceId: string,
  tenantId: string,
  customerId: string,
  title: string,
  amount: number,
  createdBy: string,
): Promise<void> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  await createNotification({
    tenantId,
    userId: customerId,
    type: 'info',
    title: 'New Invoice',
    message: `A new invoice "${title}" has been generated for ${formattedAmount}.`,
    priority: 'normal',
    relatedEntityType: 'invoice',
    relatedEntityId: invoiceId,
    actionLabel: 'View Invoice',
    createdBy,
    data: { invoiceId, amount },
  });
}

/**
 * Notify warehouse/inventory managers about low stock items.
 * Uses role-based targeting.
 */
export async function notifyLowStock(
  itemId: string,
  tenantId: string,
  itemName: string,
  quantity: number,
  minStock: number,
  targetRoles: string[],
  createdBy: string,
): Promise<void> {
  await createNotification({
    tenantId,
    type: 'warning',
    title: 'Low Stock Alert',
    message: `"${itemName}" is running low. Current: ${quantity}, Minimum: ${minStock}.`,
    priority: 'high',
    relatedEntityType: 'inventory',
    relatedEntityId: itemId,
    actionLabel: 'View Inventory',
    createdBy,
    roles: targetRoles,
    data: { itemId, itemName, quantity, minStock },
  });
}