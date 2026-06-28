import { db, withRetry } from '@/lib/db';
import type { ComplaintStatus } from './state-machine';

// ============================================================================
// TYPES
// ============================================================================

export interface EscalationRule {
  status: ComplaintStatus;
  thresholdMs: number;
  checkField: string;
  severity: 'warning' | 'critical' | 'overdue';
  label: string;
  description: string;
  /** Which roles to notify when this rule fires. */
  notifyRoles: string[];
  /** Whether to also notify the complaint's customer. */
  notifyCustomer: boolean;
  /** Whether to also notify the complaint's supervisor specifically. */
  notifySupervisor: boolean;
  /** Notification message template for staff/admins. */
  staffMessage: (title: string, elapsed: string) => string;
  /** Notification message template for the customer (if notifyCustomer). */
  customerMessage: (title: string, elapsed: string) => string;
}

export interface EscalationCheckResult {
  triggered: number;
  details: Array<{
    complaintId: string;
    complaintTitle: string;
    rule: string;
    severity: string;
    elapsed: string;
    notifiedUsers: number;
  }>;
}

// ============================================================================
// ESCALATION RULES
// ============================================================================

export const ESCALATION_RULES: EscalationRule[] = [
  {
    status: 'NEW',
    thresholdMs: 15 * 60 * 1000, // 15 minutes
    checkField: 'updatedAt',
    severity: 'warning',
    label: 'new_unassigned',
    description: '15 min unassigned — First escalation',
    notifyRoles: ['supervisor', 'admin'],
    notifyCustomer: false,
    notifySupervisor: true,
    staffMessage: (title, elapsed) =>
      `Complaint "${title}" has been unassigned for ${elapsed}. Please assign a technician.`,
    customerMessage: () => '',
  },
  {
    status: 'ASSIGNED',
    thresholdMs: 30 * 60 * 1000, // 30 minutes
    checkField: 'updatedAt',
    severity: 'warning',
    label: 'assigned_unaccepted',
    description: '30 min unaccepted — Technician unresponsive',
    notifyRoles: ['admin'],
    notifyCustomer: false,
    notifySupervisor: true,
    staffMessage: (title, elapsed) =>
      `Complaint "${title}" was assigned but the technician has not accepted for ${elapsed}. Follow up immediately.`,
    customerMessage: () => '',
  },
  {
    status: 'WORK_ORDER_CREATED',
    thresholdMs: 20 * 60 * 1000, // 20 minutes
    checkField: 'updatedAt',
    severity: 'warning',
    label: 'wo_not_started',
    description: '20 min not started — Work not started',
    notifyRoles: ['admin'],
    notifyCustomer: false,
    notifySupervisor: true,
    staffMessage: (title, elapsed) =>
      `Work order for complaint "${title}" was created but work has not started for ${elapsed}.`,
    customerMessage: () => '',
  },
  {
    status: 'IN_PROGRESS',
    thresholdMs: 4 * 60 * 60 * 1000, // 4 hours
    checkField: 'updatedAt',
    severity: 'critical',
    label: 'work_stalled',
    description: '4 hours not completed — Work stalled',
    notifyRoles: ['admin'],
    notifyCustomer: false,
    notifySupervisor: true,
    staffMessage: (title, elapsed) =>
      `Complaint "${title}" has been in progress for ${elapsed} without completion. Check on the technician.`,
    customerMessage: () => '',
  },
  {
    status: 'WAITING_CLIENT_CONFIRMATION',
    thresholdMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    checkField: 'updatedAt',
    severity: 'warning',
    label: 'client_unresponsive',
    description: '3 days no response — Client unresponsive',
    notifyRoles: [],
    notifyCustomer: true,
    notifySupervisor: true,
    staffMessage: (title, elapsed) =>
      `Client has not responded to the completion confirmation for "${title}" for ${elapsed}. Consider sending a reminder.`,
    customerMessage: (title, _elapsed) =>
      `Your service request "${title}" has been completed. Please log in to review and confirm the work.`,
  },
  {
    status: 'INVOICE_SENT',
    thresholdMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    checkField: 'updatedAt',
    severity: 'overdue',
    label: 'payment_overdue',
    description: '7 days not paid — Payment overdue',
    notifyRoles: ['finance', 'admin'],
    notifyCustomer: true,
    notifySupervisor: false,
    staffMessage: (title, elapsed) =>
      `Invoice for complaint "${title}" has been unpaid for ${elapsed}. Follow up on payment collection.`,
    customerMessage: (title, elapsed) =>
      `Payment for "${title}" is overdue (${elapsed}). Please settle the invoice at your earliest convenience.`,
  },
];

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Checks all escalation rules for a given tenant and fires any that are breached.
 * Each rule fires at most ONCE per complaint (idempotent).
 *
 * Returns a summary of triggered escalations.
 */
export async function checkEscalations(tenantId: string): Promise<EscalationCheckResult> {
  const result: EscalationCheckResult = { triggered: 0, details: [] };
  const now = new Date();

  for (const rule of ESCALATION_RULES) {
    try {
      const triggered = await processRule(tenantId, rule, now);
      result.triggered += triggered.length;
      for (const item of triggered) {
        result.details.push(item);
      }
    } catch (error) {
      console.error(
        `[EscalationRules] Error processing rule "${rule.label}" for tenant ${tenantId}:`,
        error,
      );
    }
  }

  return result;
}

// ============================================================================
// RULE PROCESSING
// ============================================================================

/**
 * Processes a single escalation rule:
 * 1. Find all complaints matching the rule's status in the tenant
 * 2. Filter by elapsed time threshold
 * 3. Skip already-escalated complaints
 * 4. Fire escalation (timeline + notifications + audit)
 */
async function processRule(
  tenantId: string,
  rule: EscalationRule,
  now: Date,
): Promise<EscalationCheckResult['details']> {
  const details: EscalationCheckResult['details'] = [];
  const cutoff = new Date(now.getTime() - rule.thresholdMs);

  // Find all complaints in the tenant that match the rule's status
  // and have been in that status longer than the threshold.
  const complaints = await db.complaint.findMany({
    where: {
      tenantId,
      status: rule.status,
      updatedAt: { lte: cutoff },
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      customerId: true,
      supervisorId: true,
      assignedToId: true,
    },
  });

  if (complaints.length === 0) return details;

  // Resolve a valid system user for audit logging (indexed: tenantId+role)
  const systemUser = await withRetry(
    () =>
      db.user.findFirst({
        where: { tenantId, role: { in: ['super_admin', 'admin'] }, isActive: true },
        select: { id: true },
      }),
    { label: 'escalation-findSystemUser', maxRetries: 2 }
  );

  for (const complaint of complaints) {
    try {
      // Check if this escalation was already fired for this complaint+rule combo
      const alreadyEscalated = await wasAlreadyEscalated(complaint.id, rule.label, complaint.updatedAt);
      if (alreadyEscalated) continue;

      const elapsed = formatElapsed(now.getTime() - complaint.updatedAt.getTime());

      // Resolve notification targets
      const notificationTargets = await resolveEscalationTargets(
        tenantId,
        complaint,
        rule,
        elapsed,
      );

      // Fire the escalation atomically
      await db.$transaction(async (tx) => {
        // 1. Timeline entry
        await tx.complaintTimeline.create({
          data: {
            tenantId,
            complaintId: complaint.id,
            action: 'escalation_triggered',
            fromStatus: rule.status,
            toStatus: rule.status,
            description: rule.description,
            performedBy: null,
            performedByRole: 'system',
            metadata: JSON.stringify({
              rule: rule.label,
              severity: rule.severity,
              threshold: rule.thresholdMs,
              elapsed: now.getTime() - complaint.updatedAt.getTime(),
            }),
          },
        });

        // 2. Notifications
        if (notificationTargets.length > 0) {
          await tx.notification.createMany({
            data: notificationTargets,
          });
        }

        // 3. Audit log (only if we have a valid user for the FK constraint)
        if (systemUser) {
          await tx.auditLog.create({
            data: {
              tenantId,
              userId: systemUser.id,
              action: `escalation.${rule.label}`,
              entity: 'Complaint',
              entityId: complaint.id,
              oldValue: JSON.stringify({ status: rule.status }),
              newValue: JSON.stringify({
                status: rule.status,
                escalation: rule.severity,
              }),
              details: JSON.stringify({
                rule: rule.label,
                severity: rule.severity,
                description: rule.description,
                thresholdMs: rule.thresholdMs,
                elapsedMs: now.getTime() - complaint.updatedAt.getTime(),
                notifiedUserCount: notificationTargets.length,
              }),
              device: 'system',
            },
          });
        }
      });

      details.push({
        complaintId: complaint.id,
        complaintTitle: complaint.title,
        rule: rule.label,
        severity: rule.severity,
        elapsed,
        notifiedUsers: notificationTargets.length,
      });
    } catch (error) {
      console.error(
        `[EscalationRules] Error firing escalation for complaint ${complaint.id}, rule "${rule.label}":`,
        error,
      );
    }
  }

  return details;
}

// ============================================================================
// IDEMPOTENCY CHECK
// ============================================================================

/**
 * Checks if an escalation was already sent for a specific complaint + rule
 * combination by looking for a ComplaintTimeline entry with
 * action='escalation_triggered' and matching rule label in metadata.
 *
 * The `since` parameter ensures we only consider timeline entries created
 * after the complaint entered the current status (i.e. after updatedAt).
 */
async function wasAlreadyEscalated(
  complaintId: string,
  ruleLabel: string,
  since: Date,
): Promise<boolean> {
  const existing = await db.complaintTimeline.findFirst({
    where: {
      complaintId,
      action: 'escalation_triggered',
      createdAt: { gte: since },
    },
  });

  if (!existing) return false;

  // Parse metadata to check the rule label
  if (!existing.metadata) return false;
  try {
    const meta = JSON.parse(existing.metadata) as Record<string, unknown>;
    return meta.rule === ruleLabel;
  } catch {
    return false;
  }
}

// ============================================================================
// NOTIFICATION RESOLUTION
// ============================================================================

/**
 * Resolves which users should be notified for a triggered escalation rule.
 * Returns notification data objects ready for `createMany`.
 */
async function resolveEscalationTargets(
  tenantId: string,
  complaint: {
    id: string;
    title: string;
    customerId: string;
    supervisorId: string | null;
    assignedToId: string | null;
  },
  rule: EscalationRule,
  elapsed: string,
): Promise<
  Array<{
    tenantId: string;
    userId: string | null;
    type: string;
    title: string;
    message: string;
    data: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }>
> {
  const targets: Array<{
    userId: string | null;
    type: string;
    title: string;
    message: string;
  }> = [];

  const severityLabel =
    rule.severity === 'critical'
      ? '🔴 Critical'
      : rule.severity === 'overdue'
        ? '🟠 Overdue'
        : '🟡 Warning';

  const staffTitle = `SLA ${severityLabel}: ${rule.description}`;
  const customerTitle =
    rule.severity === 'overdue'
      ? `Payment Reminder: ${complaint.title}`
      : `Action Required: ${complaint.title}`;

  // Notify specific supervisor of the complaint
  if (rule.notifySupervisor && complaint.supervisorId) {
    targets.push({
      userId: complaint.supervisorId,
      type: 'escalation',
      title: staffTitle,
      message: rule.staffMessage(complaint.title, elapsed),
    });
  }

  // Notify customer
  if (rule.notifyCustomer && complaint.customerId) {
    targets.push({
      userId: complaint.customerId,
      type: 'escalation',
      title: customerTitle,
      message: rule.customerMessage(complaint.title, elapsed),
    });
  }

  // Notify users by role
  for (const role of rule.notifyRoles) {
    try {
      const users = await db.user.findMany({
        where: { tenantId, role, isActive: true },
        select: { id: true },
      });
      for (const user of users) {
        targets.push({
          userId: user.id,
          type: 'escalation',
          title: staffTitle,
          message: rule.staffMessage(complaint.title, elapsed),
        });
      }
    } catch (error) {
      console.error(
        `[EscalationRules] Failed to resolve users by role "${role}":`,
        error,
      );
    }
  }

  // De-duplicate by userId
  const seen = new Set<string | null>();
  const unique = targets.filter((t) => {
    if (seen.has(t.userId)) return false;
    seen.add(t.userId);
    return true;
  });

  return unique.map((t) => ({
    tenantId,
    userId: t.userId,
    type: t.type,
    title: t.title,
    message: t.message,
    data: JSON.stringify({
      complaintId: complaint.id,
      escalationRule: rule.label,
      severity: rule.severity,
    }),
    relatedEntityType: 'complaint',
    relatedEntityId: complaint.id,
  }));
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Formats a duration in milliseconds into a human-readable string.
 * Examples: "2h 15m", "45m", "3d 2h", "7d"
 */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push('< 1m');

  return parts.join(' ');
}