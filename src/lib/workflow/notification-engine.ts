import { db } from '@/lib/db';
import type { ComplaintStatus } from './state-machine';

// ============ TYPES ============

export interface WorkflowContext {
  tenantId: string;
  complaintId: string;
  customerId: string;
  fromStatus: string;
  toStatus: ComplaintStatus;
  action: string; // e.g. 'assigned', 'accepted', 'started', 'completed', etc.
  performedBy: string; // userId
  performedByRole: string;
  description: string;
  metadata?: Record<string, unknown>;
  // Recipients for notifications
  assignedToId?: string;
  supervisorId?: string;
  // Request context for audit logging
  ipAddress?: string;
  userAgent?: string;
}

export interface TimelineEntry {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  description: string;
  performedBy: string | null;
  performedByRole: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  performedByName?: string;
}

interface NotificationTarget {
  userId: string | null; // null means broadcast (all users of a role)
  type: string;
  title: string;
  message: string;
}

// ============ MAIN ENTRY POINT ============

/**
 * Called after every successful workflow transition.
 * Creates timeline entry, notifications, and audit log atomically.
 * All errors are caught and logged — notifications must never break the workflow.
 */
export async function recordWorkflowTransition(ctx: WorkflowContext): Promise<void> {
  try {
    // Pre-compute notification targets before entering the transaction
    // so we don't hold the transaction open longer than necessary for queries.
    const notificationTargets = await resolveNotificationTargets(ctx);

    await db.$transaction(async (tx) => {
      // 1. Create timeline entry
      await tx.complaintTimeline.create({
        data: {
          tenantId: ctx.tenantId,
          complaintId: ctx.complaintId,
          action: ctx.action,
          fromStatus: ctx.fromStatus,
          toStatus: ctx.toStatus,
          description: ctx.description,
          performedBy: ctx.performedBy,
          performedByRole: ctx.performedByRole,
          metadata: ctx.metadata ? JSON.stringify(ctx.metadata) : null,
        },
      });

      // 2. Create notifications (batch inside the same transaction)
      if (notificationTargets.length > 0) {
        await tx.notification.createMany({
          data: notificationTargets.map((target) => ({
            tenantId: ctx.tenantId,
            userId: target.userId,
            type: target.type,
            title: target.title,
            message: target.message,
            data: JSON.stringify({
              complaintId: ctx.complaintId,
              action: ctx.action,
              fromStatus: ctx.fromStatus,
              toStatus: ctx.toStatus,
              performedBy: ctx.performedBy,
              performedByRole: ctx.performedByRole,
            }),
            relatedEntityType: 'complaint',
            relatedEntityId: ctx.complaintId,
          })),
        });
      }

      // 3. Create audit log
      await tx.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.performedBy,
          action: `workflow.${ctx.action}`,
          entity: 'Complaint',
          entityId: ctx.complaintId,
          oldValue: JSON.stringify({ status: ctx.fromStatus }),
          newValue: JSON.stringify({ status: ctx.toStatus }),
          details: JSON.stringify({
            action: ctx.action,
            description: ctx.description,
            metadata: ctx.metadata ?? null,
            performedByRole: ctx.performedByRole,
          }),
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent ?? null,
          device: parseDeviceFromUserAgent(ctx.userAgent),
        },
      });
    });
  } catch (error) {
    // Notifications & audit must never break the workflow
    console.error('[NotificationEngine] Failed to record workflow transition:', {
      complaintId: ctx.complaintId,
      action: ctx.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============ TIMELINE QUERY ============

/**
 * Retrieves the full timeline for a complaint, ordered chronologically.
 * Joins the performedBy user name when available.
 */
export async function getComplaintTimeline(
  tenantId: string,
  complaintId: string,
): Promise<TimelineEntry[]> {
  const entries = await db.complaintTimeline.findMany({
    where: { tenantId, complaintId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      action: true,
      fromStatus: true,
      toStatus: true,
      description: true,
      performedBy: true,
      performedByRole: true,
      metadata: true,
      createdAt: true,
    },
  });

  // Resolve performedBy names in a single batch query
  const performedByIds = Array.from(new Set(entries.map((e) => e.performedBy).filter(Boolean) as string[]));
  let userMap: Record<string, string> = {};

  if (performedByIds.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: performedByIds } },
      select: { id: true, name: true },
    });
    userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  return entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    description: entry.description,
    performedBy: entry.performedBy,
    performedByRole: entry.performedByRole,
    metadata: entry.metadata ? safeJsonParse(entry.metadata) : null,
    createdAt: entry.createdAt.toISOString(),
    performedByName: entry.performedBy ? userMap[entry.performedBy] : undefined,
  }));
}

// ============ NOTIFICATION RESOLUTION ============

/**
 * Resolves which users should receive notifications for a given workflow action
 * and returns fully-formed notification payloads.
 *
 * Notification routing by action:
 * - assigned          → technician, customer, supervisor, admins
 * - accepted          → customer, supervisor
 * - rejected          → supervisor, admins
 * - started           → customer, supervisor
 * - completed         → customer (awaiting confirmation)
 * - client_confirmed  → finance, admins, supervisor
 * - client_rejected   → technician, supervisor
 * - rework_required   → technician, supervisor
 * - invoice_generated → finance, admins
 * - invoice_approved  → admins
 * - invoice_sent      → customer
 * - payment_received  → customer, admins
 * - closed            → customer, technician, supervisor, admins
 * - status_override   → admins
 */
async function resolveNotificationTargets(ctx: WorkflowContext): Promise<NotificationTarget[]> {
  const targets: NotificationTarget[] = [];
  const template = getNotificationTemplate(ctx.action, ctx.metadata);

  if (!template) {
    return targets;
  }

  switch (ctx.action) {
    case 'assigned':
      // Notify the assigned technician
      if (ctx.assignedToId) {
        targets.push({ userId: ctx.assignedToId, ...template });
      }
      // Notify the customer
      targets.push({ userId: ctx.customerId, ...template });
      // Notify the supervisor
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      // Notify all admins
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;

    case 'accepted':
      targets.push({ userId: ctx.customerId, ...template });
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      break;

    case 'rejected':
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;

    case 'started':
      targets.push({ userId: ctx.customerId, ...template });
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      break;

    case 'completed':
      targets.push({ userId: ctx.customerId, ...template });
      break;

    case 'client_confirmed':
      await pushUsersByRole(ctx.tenantId, 'finance', targets, template);
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      break;

    case 'client_rejected':
      if (ctx.assignedToId) {
        targets.push({ userId: ctx.assignedToId, ...template });
      }
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      break;

    case 'rework_required':
      if (ctx.assignedToId) {
        targets.push({ userId: ctx.assignedToId, ...template });
      }
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      break;

    case 'invoice_generated':
      await pushUsersByRole(ctx.tenantId, 'finance', targets, template);
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;

    case 'invoice_approved':
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;

    case 'invoice_sent':
      targets.push({ userId: ctx.customerId, ...template });
      break;

    case 'payment_received':
      targets.push({ userId: ctx.customerId, ...template });
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;

    case 'closed':
      targets.push({ userId: ctx.customerId, ...template });
      if (ctx.assignedToId) {
        targets.push({ userId: ctx.assignedToId, ...template });
      }
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;

    case 'status_override':
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;

    default:
      // Unknown action — notify supervisor and admins as a safety net
      if (ctx.supervisorId) {
        targets.push({ userId: ctx.supervisorId, ...template });
      }
      await pushUsersByRole(ctx.tenantId, 'admin', targets, template);
      break;
  }

  // De-duplicate by userId
  const seen = new Set<string | null>();
  return targets.filter((t) => {
    if (seen.has(t.userId)) return false;
    seen.add(t.userId);
    return true;
  });
}

/**
 * Finds all active users with the given role in a tenant and pushes
 * notification targets for each.
 */
async function pushUsersByRole(
  tenantId: string,
  role: string,
  targets: NotificationTarget[],
  template: { type: string; title: string; message: string },
): Promise<void> {
  try {
    const users = await db.user.findMany({
      where: { tenantId, role, isActive: true },
      select: { id: true },
    });
    for (const user of users) {
      targets.push({ userId: user.id, ...template });
    }
  } catch (error) {
    console.error(`[NotificationEngine] Failed to resolve users by role "${role}":`, error);
  }
}

// ============ NOTIFICATION TEMPLATES ============

/**
 * Returns the notification type, title, and message for a given workflow action.
 * Metadata may contain extra context like technician name, ETA, etc.
 */
function getNotificationTemplate(
  action: string,
  metadata?: Record<string, unknown>,
): { type: string; title: string; message: string } | null {
  const technicianName = (metadata?.technicianName as string) ?? 'a technician';
  const eta = (metadata?.eta as string) ?? '';

  const templates: Record<string, { type: string; title: string; message: string }> = {
    assigned: {
      type: 'complaint_assigned',
      title: 'Complaint Assigned',
      message: `A new complaint has been assigned to ${technicianName}.${eta ? ` ETA: ${eta}.` : ''}`,
    },
    accepted: {
      type: 'workflow_transition',
      title: 'Complaint Accepted',
      message: `${technicianName} has accepted the complaint and will begin work shortly.`,
    },
    rejected: {
      type: 'workflow_transition',
      title: 'Complaint Rejected',
      message: `${technicianName} has rejected the complaint assignment. Please review and reassign.`,
    },
    started: {
      type: 'workflow_transition',
      title: 'Work Started',
      message: `${technicianName} has started working on your complaint.${eta ? ` Estimated completion: ${eta}.` : ''}`,
    },
    completed: {
      type: 'workflow_transition',
      title: 'Work Completed',
      message: 'The work on your complaint has been completed. Please review and confirm.',
    },
    client_confirmed: {
      type: 'workflow_transition',
      title: 'Client Confirmed Completion',
      message: 'The client has confirmed the complaint resolution. Invoice process can proceed.',
    },
    client_rejected: {
      type: 'workflow_transition',
      title: 'Client Rejected Completion',
      message: 'The client has rejected the completion. Please review and address the concerns.',
    },
    rework_required: {
      type: 'workflow_transition',
      title: 'Rework Required',
      message: 'Rework has been requested on this complaint. Please review the feedback and address it.',
    },
    invoice_generated: {
      type: 'workflow_transition',
      title: 'Invoice Generated',
      message: 'A draft invoice has been generated for the completed complaint.',
    },
    invoice_approved: {
      type: 'workflow_transition',
      title: 'Invoice Approved',
      message: 'The invoice has been approved and is ready to be sent to the client.',
    },
    invoice_sent: {
      type: 'workflow_transition',
      title: 'Invoice Sent',
      message: 'Your invoice is ready. Please review and proceed with payment.',
    },
    payment_received: {
      type: 'workflow_transition',
      title: 'Payment Received',
      message: 'Payment has been received. Thank you for your business!',
    },
    closed: {
      type: 'workflow_transition',
      title: 'Complaint Closed',
      message: 'This complaint has been closed successfully.',
    },
    status_override: {
      type: 'workflow_transition',
      title: 'Status Override',
      message: 'A complaint status has been manually overridden by an administrator.',
    },
  };

  return templates[action] ?? null;
}

// ============ AUDIT LOG ============

/**
 * (Kept for standalone use outside of recordWorkflowTransition.)
 * Creates an audit log entry recording who changed what and from where.
 */
async function createAuditLog(ctx: WorkflowContext): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.performedBy,
        action: `workflow.${ctx.action}`,
        entity: 'Complaint',
        entityId: ctx.complaintId,
        oldValue: JSON.stringify({ status: ctx.fromStatus }),
        newValue: JSON.stringify({ status: ctx.toStatus }),
        details: JSON.stringify({
          action: ctx.action,
          description: ctx.description,
          metadata: ctx.metadata ?? null,
          performedByRole: ctx.performedByRole,
        }),
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        device: parseDeviceFromUserAgent(ctx.userAgent),
      },
    });
  } catch (error) {
    console.error('[NotificationEngine] Failed to create audit log:', error);
  }
}

// ============ UTILITIES ============

/**
 * Parses a User-Agent string into a simple device descriptor.
 * Returns null if no user agent is provided.
 */
function parseDeviceFromUserAgent(userAgent?: string): string | null {
  if (!userAgent) return null;

  try {
    if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(userAgent)) {
      return 'mobile';
    }
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) {
      return 'tablet';
    }
    if (/Windows/i.test(userAgent)) {
      return 'desktop';
    }
    if (/Macintosh|Mac OS/i.test(userAgent)) {
      return 'desktop';
    }
    if (/Linux/i.test(userAgent)) {
      return 'desktop';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Safely parses a JSON string, returning null on failure.
 */
function safeJsonParse(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}
