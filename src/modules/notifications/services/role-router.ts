/**
 * RBAC Notification Role Router
 *
 * Defines WHICH roles should receive notifications for each business event,
 * and resolves the actual user IDs from those roles.
 *
 * This module sits between business logic (API routes / services) and the
 * notification-service. Instead of every API route hard-coding who should
 * receive a notification, they call `sendRoleBasedNotification({ eventKey, ... })`
 * and this router looks up the target roles, queries active users, and
 * delegates to `createNotification`.
 *
 * Architecture:
 *   Business Event → role-router (resolve roles → user IDs) → notification-service (create + push)
 *
 * @module modules/notifications/services/role-router
 */

import { db } from '@/core/database/db';
import { createNotification } from './notification-service';
import type { NotificationPriority } from './notification-service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A `module.action` key used to look up notification routing rules. */
export type NotificationEventKey = `${string}.${string}`;

/**
 * Contextual IDs that influence recipient resolution for a specific event.
 * When present, these users are added to the recipient list regardless
 * of their role (or in addition to their role-based inclusion).
 */
export interface RecipientContext {
  /** The customer who owns the related record (complaint, invoice, quotation). */
  customerId?: string;
  /** The technician assigned to the work order / complaint. */
  technicianId?: string;
  /** The previous technician (when a complaint is reassigned). */
  previousTechnicianId?: string;
  /** The supervisor overseeing the work. */
  supervisorId?: string;
  /** The user who triggered the event (used for own-record events like password change). */
  userId?: string;
  /** Department filter — if provided, only resolve users within this department. */
  departmentId?: string;
}

/**
 * Each entry describes which roles should be notified for a given event,
 * and whether specific context fields (customer, technician, etc.) should
 * also be included as explicit recipients.
 */
interface RoleRoutingRule {
  /** Role-based recipients — active users with these roles will be queried. */
  roles: string[];
  /**
   * Context fields to pull explicit user IDs from.
   * For example, `['customerId', 'technicianId']` means the customer and
   * technician from the context are added even if their roles are not in `roles`.
   */
  contextKeys?: (keyof RecipientContext)[];
}

/**
 * Parameters for resolving recipients from a role routing rule.
 */
export type ResolveRecipientsParams = {
  /** The event key (e.g. 'complaints.created'). */
  eventKey: NotificationEventKey;
  /** The tenant to resolve users within. */
  tenantId: string;
  /** Contextual IDs to include in the recipient list. */
  context?: RecipientContext;
  /** User IDs to exclude from the final recipient list. */
  excludeUserIds?: string[];
};

/**
 * Parameters for sending a role-based notification.
 */
export type SendRoleBasedNotificationParams = {
  /** The event key (e.g. 'complaints.created'). */
  eventKey: NotificationEventKey;
  /** The tenant to resolve users within. */
  tenantId: string;
  /** Notification title. */
  title: string;
  /** Notification body text. */
  message: string;
  /** Notification type (info, warning, error, etc.). */
  type: string;
  /** Notification priority. Defaults to 'normal'. */
  priority?: string;
  /** Entity type the notification relates to (e.g. 'complaint'). */
  relatedEntityType?: string;
  /** Entity ID the notification relates to. */
  relatedEntityId?: string;
  /** URL the user navigates to on clicking the action button. */
  actionUrl?: string;
  /** Label for the action button. */
  actionLabel?: string;
  /** User ID of the person who triggered the notification. */
  createdBy?: string;
  /** Contextual IDs for recipient resolution. */
  context?: RecipientContext;
  /** Extra metadata attached to the notification. */
  data?: Record<string, unknown>;
};

/**
 * Parameters for logging a notification event for audit purposes.
 */
export type LogNotificationEventParams = {
  /** Optional user ID involved in the event. */
  userId?: string;
  /** Role of the user involved. */
  userRole?: string;
  /** Notification type (e.g. 'info', 'warning'). */
  notificationType: string;
  /** Business module (e.g. 'complaints'). */
  module: string;
  /** Business action (e.g. 'created', 'assigned'). */
  action: string;
  /** ID of the related record. */
  relatedRecordId?: string;
  /** Whether the notification was sent, failed, or skipped. */
  deliveryStatus: 'sent' | 'failed' | 'skipped';
  /** Number of recipients targeted. */
  recipientCount: number;
  /** Tenant ID. */
  tenantId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Role Routing Rules Map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprehensive mapping of `module.action` → target roles + context keys.
 *
 * Each entry defines:
 * - `roles`: Which roles to query for active users.
 * - `contextKeys`: Which context fields (customer, technician, etc.) to pull
 *   explicit user IDs from, adding them even if their role isn't in `roles`.
 *
 * Events marked with ONLY contextKeys and an empty `roles` array rely
 * entirely on explicit user IDs from context (e.g. password change).
 */
export const ROLE_NOTIFICATION_RULES: Record<NotificationEventKey, RoleRoutingRule> = {
  // ── Complaints ──────────────────────────────────────────────────────────
  'complaints.created': {
    roles: ['admin', 'supervisor', 'manager'],
    contextKeys: ['customerId'],
  },
  'complaints.assigned': {
    roles: [],
    contextKeys: ['technicianId', 'customerId'],
  },
  'complaints.accepted': {
    roles: ['supervisor', 'admin'],
    contextKeys: ['customerId'],
  },
  'complaints.rejected': {
    roles: ['supervisor', 'admin'],
    contextKeys: [],
  },
  'complaints.started': {
    roles: ['supervisor', 'admin'],
    contextKeys: ['customerId'],
  },
  'complaints.completed': {
    roles: ['supervisor', 'admin'],
    contextKeys: ['customerId'],
  },
  'complaints.closed': {
    roles: [],
    contextKeys: ['customerId'],
  },
  'complaints.escalated': {
    roles: ['manager', 'admin'],
    contextKeys: [],
  },
  'complaints.reassigned': {
    roles: [],
    contextKeys: ['technicianId', 'previousTechnicianId', 'customerId'],
  },
  'complaints.client_confirmed': {
    roles: ['supervisor', 'admin'],
    contextKeys: ['technicianId'],
  },
  'complaints.client_rejected': {
    roles: ['supervisor', 'admin'],
    contextKeys: ['technicianId'],
  },

  // ── Work Orders ──────────────────────────────────────────────────────────
  'work-orders.created': {
    roles: ['supervisor'],
    contextKeys: ['technicianId'],
  },
  'work-orders.completed': {
    roles: ['supervisor', 'admin'],
    contextKeys: [],
  },
  'work-orders.feedback': {
    roles: ['supervisor', 'admin'],
    contextKeys: [],
  },

  // ── Invoices ─────────────────────────────────────────────────────────────
  'invoices.created': {
    roles: ['finance'],
    contextKeys: ['customerId'],
  },
  'invoices.paid': {
    roles: ['finance'],
    contextKeys: ['customerId'],
  },
  'invoices.overdue': {
    roles: ['finance', 'admin'],
    contextKeys: [],
  },
  'invoices.approved': {
    roles: ['finance'],
    contextKeys: [],
  },

  // ── Quotations ───────────────────────────────────────────────────────────
  'quotations.created': {
    roles: [],
    contextKeys: ['customerId'],
  },
  'quotations.approved': {
    roles: ['finance'],
    contextKeys: [],
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  'inventory.low_stock': {
    roles: ['admin', 'supervisor'],
    contextKeys: [],
  },
  'inventory.adjusted': {
    roles: ['admin'],
    contextKeys: [],
  },

  // ── Finance ──────────────────────────────────────────────────────────────
  'finance.payment_failed': {
    roles: ['finance', 'admin'],
    contextKeys: [],
  },

  // ── HR ───────────────────────────────────────────────────────────────────
  'hr.leave_request': {
    roles: ['admin', 'manager'],
    contextKeys: [],
  },
  'hr.new_employee': {
    roles: ['admin', 'manager'],
    contextKeys: [],
  },
  'hr.attendance_alert': {
    roles: ['admin'],
    contextKeys: [],
  },

  // ── Email ────────────────────────────────────────────────────────────────
  'email.sent': {
    roles: ['admin'],
    contextKeys: ['userId'],
  },
  'email.failed': {
    roles: ['admin'],
    contextKeys: [],
  },

  // ── System ───────────────────────────────────────────────────────────────
  'system.error': {
    roles: ['admin', 'super_admin'],
    contextKeys: [],
  },
  'system.security_alert': {
    roles: ['super_admin'],
    contextKeys: [],
  },

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  'whatsapp.message_received': {
    roles: ['admin'],
    contextKeys: [],
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  'auth.password_changed': {
    roles: [],
    contextKeys: ['userId'],
  },
  'auth.login_failed': {
    roles: [],
    contextKeys: ['userId'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. resolveRecipients
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the final set of user IDs and role list for a notification event.
 *
 * Resolution strategy:
 * 1. Look up the event key in `ROLE_NOTIFICATION_RULES`.
 * 2. For each role in the rule, query `db.user.findMany()` for active users
 *    in the given tenant (optionally filtered by department).
 * 3. Pull explicit user IDs from the context fields specified in `contextKeys`.
 * 4. Merge all IDs, deduplicate, and apply exclusions.
 * 5. Return both the resolved user IDs (for creating notifications) and the
 *    role list (for logging / debugging).
 *
 * @returns Object with `userIds` (deduplicated, exclusion-filtered) and `roles` (the raw role list from the rule).
 */
export async function resolveRecipients(
  params: ResolveRecipientsParams,
): Promise<{ userIds: string[]; roles: string[] }> {
  const { eventKey, tenantId, context = {}, excludeUserIds = [] } = params;

  const rule = ROLE_NOTIFICATION_RULES[eventKey];

  // If no rule is registered, return empty — nothing to notify.
  if (!rule) {
    console.warn(
      `[RoleRouter] No routing rule found for event "${eventKey}". ` +
      `Register it in ROLE_NOTIFICATION_RULES to enable notifications for this event.`,
    );
    return { userIds: [], roles: [] };
  }

  const allIds = new Set<string>();

  // ── Step 1: Resolve users by role ────────────────────────────────────────
  if (rule.roles.length > 0) {
    try {
      const whereClause: Record<string, unknown> = {
        tenantId,
        isActive: true,
        role: { in: rule.roles },
      };

      // Optionally filter by department from context
      if (context.departmentId) {
        whereClause.departmentId = context.departmentId;
      }

      // Exclude specified user IDs from role resolution
      if (excludeUserIds.length > 0) {
        whereClause.id = { not: { in: excludeUserIds } };
      }

      const users = await db.user.findMany({
        where: whereClause,
        select: { id: true, role: true, name: true, email: true },
      });

      for (const user of users) {
        allIds.add(user.id);
      }
    } catch (error) {
      console.error(
        `[RoleRouter] Failed to resolve users for roles [${rule.roles.join(', ')}] ` +
        `in tenant ${tenantId}:`,
        error,
      );
    }
  }

  // ── Step 2: Resolve explicit user IDs from context ───────────────────────
  if (rule.contextKeys && rule.contextKeys.length > 0) {
    for (const key of rule.contextKeys) {
      const id = context[key];
      if (id && typeof id === 'string') {
        allIds.add(id);
      }
    }
  }

  // ── Step 3: Apply exclusions to context-derived IDs ─────────────────────
  const excludeSet = new Set(excludeUserIds);
  const finalIds = Array.from(allIds).filter((id) => !excludeSet.has(id));

  return { userIds: finalIds, roles: [...rule.roles] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. sendRoleBasedNotification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * High-level helper: resolve recipients by role rules and send a notification.
 *
 * This is the primary entry point for business modules that want to fire
 * a notification without knowing the details of which roles to target.
 *
 * Flow:
 * 1. Call `resolveRecipients()` to get target user IDs.
 * 2. Call `createNotification()` with the resolved user IDs.
 * 3. Return the first notification ID created (empty string if none).
 *
 * @returns The first notification ID created, or an empty string if no
 *          recipients were resolved or all were duplicates.
 *
 * @example
 * ```ts
 * await sendRoleBasedNotification({
 *   eventKey: 'complaints.assigned',
 *   tenantId: 'tenant_abc',
 *   title: 'Complaint Assigned',
 *   message: 'You have been assigned complaint #1234.',
 *   type: 'info',
 *   priority: 'normal',
 *   relatedEntityType: 'complaint',
 *   relatedEntityId: 'cmt_1234',
 *   actionLabel: 'View Complaint',
 *   context: {
 *     technicianId: 'tech_001',
 *     customerId: 'cust_001',
 *   },
 * });
 * ```
 */
export async function sendRoleBasedNotification(
  params: SendRoleBasedNotificationParams,
): Promise<string> {
  const {
    eventKey,
    tenantId,
    title,
    message,
    type,
    priority = 'normal',
    relatedEntityType,
    relatedEntityId,
    actionUrl,
    actionLabel,
    createdBy,
    context = {},
    data,
  } = params;

  // Step 1: Resolve recipients via role routing rules
  const { userIds, roles } = await resolveRecipients({
    eventKey,
    tenantId,
    context,
  });

  // Step 2: No recipients — skip notification creation
  if (userIds.length === 0) {
    console.log(
      `[RoleRouter] No recipients resolved for "${eventKey}" ` +
      `in tenant ${tenantId} (roles: [${roles.join(', ')}]). Skipping notification.`,
    );
    return '';
  }

  // Step 3: Create notification via the centralized service
  const notificationId = await createNotification({
    tenantId,
    userId: userIds,
    type,
    title,
    message,
    priority: priority as NotificationPriority,
    relatedEntityType,
    relatedEntityId,
    actionUrl,
    actionLabel,
    createdBy,
    data: {
      ...data,
      _routing: {
        eventKey,
        resolvedRoles: roles,
        recipientCount: userIds.length,
      },
    },
  });

  // Step 4: Log the routing event for audit
  await logNotificationEvent({
    userId: createdBy,
    notificationType: type,
    module: eventKey.split('.')[0],
    action: eventKey.split('.')[1],
    relatedRecordId: relatedEntityId,
    deliveryStatus: notificationId ? 'sent' : 'skipped',
    recipientCount: userIds.length,
    tenantId,
  });

  return notificationId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. logNotificationEvent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an audit log entry for a notification routing event.
 *
 * Uses the `Notification` table with a dedicated type `audit_log` to record
 * routing decisions, delivery outcomes, and recipient counts. This provides
 * a traceable history of all notification routing decisions for compliance
 * and debugging purposes.
 *
 * The record is created under a synthetic "system" user pattern — it is
 * not intended to appear in any user's notification inbox. The `userId`
 * field holds the **acting user** (who triggered the event), not the
 * notification recipient.
 *
 * @example
 * ```ts
 * await logNotificationEvent({
 *   userId: 'admin_001',
 *   notificationType: 'info',
 *   module: 'complaints',
 *   action: 'assigned',
 *   relatedRecordId: 'cmt_1234',
 *   deliveryStatus: 'sent',
 *   recipientCount: 3,
 *   tenantId: 'tenant_abc',
 * });
 * ```
 */
export async function logNotificationEvent(
  params: LogNotificationEventParams,
): Promise<void> {
  const {
    userId,
    userRole,
    notificationType,
    module: module_,
    action,
    relatedRecordId,
    deliveryStatus,
    recipientCount,
    tenantId,
  } = params;

  try {
    await db.notification.create({
      data: {
        tenantId,
        userId: userId || null,
        type: 'audit_log',
        title: `[Audit] ${module_}.${action}`,
        message: `Notification event: ${module_}.${action} | Type: ${notificationType} | Status: ${deliveryStatus} | Recipients: ${recipientCount}`,
        priority: 'low',
        relatedEntityType: `audit:${module_}`,
        relatedEntityId: relatedRecordId || null,
        data: JSON.stringify({
          audit: true,
          module: module_,
          action,
          notificationType,
          userRole,
          deliveryStatus,
          recipientCount,
          loggedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    // Audit logging should NEVER block business logic or notification delivery.
    // Log to console and silently continue.
    console.error(
      `[RoleRouter] Failed to log notification audit event for "${module_}.${action}":`,
      error,
    );
  }
}