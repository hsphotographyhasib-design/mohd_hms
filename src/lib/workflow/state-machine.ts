import type { UserRole } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete complaint lifecycle statuses.
 *
 * Main flow:
 *   NEW → ASSIGNED → ACCEPTED → WORK_ORDER_CREATED → IN_PROGRESS →
 *   WAITING_CLIENT_CONFIRMATION → CLIENT_CONFIRMED → DRAFT_INVOICE →
 *   INVOICE_APPROVED → INVOICE_SENT → PAID → CLOSED
 *
 * Rework branch:
 *   WAITING_CLIENT_CONFIRMATION → REWORK_REQUIRED → IN_PROGRESS (loops back)
 */
export type ComplaintStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'WORK_ORDER_CREATED'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT_CONFIRMATION'
  | 'CLIENT_CONFIRMED'
  | 'DRAFT_INVOICE'
  | 'INVOICE_APPROVED'
  | 'INVOICE_SENT'
  | 'PAID'
  | 'CLOSED'
  | 'REWORK_REQUIRED';

/** A single transition rule in the complaint workflow. */
export interface TransitionRule {
  /** Origin status, or `'*'` for the admin override rule that applies from any status. */
  from: ComplaintStatus | '*';
  /** Destination status. */
  to: ComplaintStatus;
  /** Roles allowed to initiate this transition (ignored when `isAutomatic` is true). */
  allowedRoles: UserRole[];
  /** If true the transition is triggered by the system, not a user action. */
  isAutomatic: boolean;
  /** Timeline action name recorded when this transition fires. */
  action: string;
  /** Field names that must be present in the request body for this transition. */
  requiredFields?: string[];
  /** Human-readable description of this transition step. */
  description?: string;
}

/** Returned by `validateTransition`. */
export interface TransitionResult {
  success: boolean;
  error?: string;
  fromStatus: string;
  toStatus: string;
  isAutomatic: boolean;
  action: string;
}

/** Describes an action a UI can render for a given status+role. */
export interface AvailableAction {
  action: string;
  targetStatus: ComplaintStatus;
  label: string;
  icon: string;
  requiredFields?: string[];
  color: string;
  description?: string;
  isAutomatic: boolean;
}

/** Visual configuration for rendering a status badge / chip. */
export interface StatusDisplayConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

// ============================================================================
// TRANSITION RULES
// ============================================================================

/**
 * Every valid transition in the complaint workflow, in declaration order.
 *
 * NOTE: The wildcard rule (`from: '*'`) at the end covers the admin
 * status-override action and must be checked separately.
 */
export const WORKFLOW_TRANSITIONS: TransitionRule[] = [
  // ── NEW → ASSIGNED ─────────────────────────────────────────────────────
  {
    from: 'NEW',
    to: 'ASSIGNED',
    allowedRoles: ['super_admin', 'admin', 'manager', 'supervisor'],
    isAutomatic: false,
    action: 'assigned',
    requiredFields: ['assignedToId', 'supervisorId'],
    description:
      'Assign the complaint to a technician and supervisor. Requires assignedToId and supervisorId.',
  },

  // ── ASSIGNED → ASSIGNED (admin/supervisor reassigns technician) ──────────
  {
    from: 'ASSIGNED',
    to: 'ASSIGNED',
    allowedRoles: ['super_admin', 'admin', 'supervisor'],
    isAutomatic: false,
    action: 'reassigned',
    description:
      'Admin or Supervisor reassigns the complaint to a different technician. Records full reassignment history with reason.',
  },

  // ── ASSIGNED → ACCEPTED (technician accepts) ───────────────────────────
  {
    from: 'ASSIGNED',
    to: 'ACCEPTED',
    allowedRoles: ['technician'],
    isAutomatic: false,
    action: 'accepted',
    description:
      'The assigned technician accepts the job. Optionally provide an estimated time of arrival (eta).',
  },

  // ── ASSIGNED → NEW (technician rejects assignment) ─────────────────────
  {
    from: 'ASSIGNED',
    to: 'NEW',
    allowedRoles: ['technician'],
    isAutomatic: false,
    action: 'assignment_rejected',
    requiredFields: ['rejectionReason'],
    description:
      'The assigned technician rejects the assignment. A rejectionReason is required.',
  },

  // ── ACCEPTED → WORK_ORDER_CREATED (system automatic) ──────────────────
  {
    from: 'ACCEPTED',
    to: 'WORK_ORDER_CREATED',
    allowedRoles: [],
    isAutomatic: true,
    action: 'work_order_created',
    description:
      'The system automatically creates a WorkOrder when the complaint is accepted.',
  },

  // ── WORK_ORDER_CREATED → IN_PROGRESS (technician starts job) ───────────
  {
    from: 'WORK_ORDER_CREATED',
    to: 'IN_PROGRESS',
    allowedRoles: ['technician'],
    isAutomatic: false,
    action: 'work_started',
    description:
      'The technician starts working on the job. Records startedAt and GPS coordinates.',
  },

  // ── IN_PROGRESS → WAITING_CLIENT_CONFIRMATION (technician completes) ──
  {
    from: 'IN_PROGRESS',
    to: 'WAITING_CLIENT_CONFIRMATION',
    allowedRoles: ['technician'],
    isAutomatic: false,
    action: 'work_completed',
    description:
      'The technician marks the job as completed. Records completedAt, checklist data, photos, and other completion details.',
  },

  // ── WAITING_CLIENT_CONFIRMATION → CLIENT_CONFIRMED (customer approves) ─
  {
    from: 'WAITING_CLIENT_CONFIRMATION',
    to: 'CLIENT_CONFIRMED',
    allowedRoles: ['customer'],
    isAutomatic: false,
    action: 'client_confirmed',
    description:
      'The customer approves the completed work. Records clientConfirmedAt.',
  },

  // ── WAITING_CLIENT_CONFIRMATION → REWORK_REQUIRED (customer rejects) ──
  {
    from: 'WAITING_CLIENT_CONFIRMATION',
    to: 'REWORK_REQUIRED',
    allowedRoles: ['customer'],
    isAutomatic: false,
    action: 'rework_requested',
    requiredFields: ['reworkReason'],
    description:
      'The customer rejects the completed work and requests rework. A reworkReason is required.',
  },

  // ── REWORK_REQUIRED → IN_PROGRESS (technician starts rework) ───────────
  {
    from: 'REWORK_REQUIRED',
    to: 'IN_PROGRESS',
    allowedRoles: ['technician'],
    isAutomatic: false,
    action: 'rework_started',
    description:
      'The technician begins rework on the complaint. This loops back into IN_PROGRESS.',
  },

  // ── CLIENT_CONFIRMED → DRAFT_INVOICE (system automatic) ────────────────
  {
    from: 'CLIENT_CONFIRMED',
    to: 'DRAFT_INVOICE',
    allowedRoles: [],
    isAutomatic: true,
    action: 'draft_invoice_created',
    description:
      'The system automatically creates a draft Invoice once the client confirms the work.',
  },

  // ── DRAFT_INVOICE → INVOICE_APPROVED (finance / admin approves) ───────
  {
    from: 'DRAFT_INVOICE',
    to: 'INVOICE_APPROVED',
    allowedRoles: ['finance', 'admin', 'super_admin'],
    isAutomatic: false,
    action: 'invoice_approved',
    description:
      'A finance team member or admin approves the draft invoice.',
  },

  // ── INVOICE_APPROVED → INVOICE_SENT (finance / admin sends) ────────────
  {
    from: 'INVOICE_APPROVED',
    to: 'INVOICE_SENT',
    allowedRoles: ['finance', 'admin', 'super_admin'],
    isAutomatic: false,
    action: 'invoice_sent',
    requiredFields: ['sentVia'],
    description:
      'A finance team member or admin sends the approved invoice. Requires sentVia (email, whatsapp, or portal).',
  },

  // ── INVOICE_SENT → PAID (finance / admin records payment) ─────────────
  {
    from: 'INVOICE_SENT',
    to: 'PAID',
    allowedRoles: ['finance', 'admin', 'super_admin'],
    isAutomatic: false,
    action: 'invoice_paid',
    requiredFields: ['paymentMethod', 'paymentRef', 'paidAt'],
    description:
      'A finance team member or admin records that the invoice has been paid. Requires paymentMethod, paymentRef, and paidAt.',
  },

  // ── PAID → CLOSED (automatic or admin) ────────────────────────────────
  {
    from: 'PAID',
    to: 'CLOSED',
    allowedRoles: ['admin', 'super_admin'],
    isAutomatic: true,
    action: 'complaint_closed',
    description:
      'The complaint is closed automatically after payment is recorded, or manually by an admin.',
  },

  // ── ADMIN OVERRIDE: Any → Any ──────────────────────────────────────────
  {
    from: '*',
    to: 'NEW',
    allowedRoles: ['super_admin', 'admin'],
    isAutomatic: false,
    action: 'status_override',
    description:
      'Admin or super_admin can override the status to any value. Use with caution — this bypasses normal workflow validation.',
  },
];

// Build a set of all valid statuses for quick lookup
const ALL_STATUSES_SET = new Set<string>([
  'NEW',
  'ASSIGNED',
  'ACCEPTED',
  'WORK_ORDER_CREATED',
  'IN_PROGRESS',
  'WAITING_CLIENT_CONFIRMATION',
  'CLIENT_CONFIRMED',
  'DRAFT_INVOICE',
  'INVOICE_APPROVED',
  'INVOICE_SENT',
  'PAID',
  'CLOSED',
  'REWORK_REQUIRED',
]);

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate whether a transition from `currentStatus` to `targetStatus` is
 * permitted for the given `userRole`.
 *
 * @param currentStatus  The complaint's current status.
 * @param targetStatus   The desired target status.
 * @param userRole       The role of the user attempting the transition.
 * @param isAdminOverride  Set to `true` when the caller explicitly intends the
 *                         `status_override` action (admin force-transition).
 * @returns A `TransitionResult` indicating success or the reason for failure.
 */
export function validateTransition(
  currentStatus: string,
  targetStatus: string,
  userRole: UserRole,
  isAdminOverride: boolean = false
): TransitionResult {
  // ── 1. Validate that current status is recognised ─────────────────────
  if (!ALL_STATUSES_SET.has(currentStatus)) {
    return {
      success: false,
      error: `Unknown current status "${currentStatus}". Valid statuses are: ${[...ALL_STATUSES_SET].join(', ')}.`,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: false,
      action: '',
    };
  }

  // ── 2. Validate that target status is recognised ──────────────────────
  if (!ALL_STATUSES_SET.has(targetStatus)) {
    return {
      success: false,
      error: `Unknown target status "${targetStatus}". Valid statuses are: ${[...ALL_STATUSES_SET].join(', ')}.`,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: false,
      action: '',
    };
  }

  // ── 3. Same-status guard (allow reassignment: ASSIGNED → ASSIGNED) ────
  if (currentStatus === targetStatus && !(currentStatus === 'ASSIGNED' && targetStatus === 'ASSIGNED')) {
    return {
      success: false,
      error: `Transition from "${currentStatus}" to itself is not allowed. The complaint is already in "${currentStatus}" status.`,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: false,
      action: '',
    };
  }

  // ── 4. Terminal-status guard ──────────────────────────────────────────
  if (currentStatus === 'CLOSED') {
    return {
      success: false,
      error: `Cannot transition out of terminal status "CLOSED". A closed complaint cannot be reopened through normal workflow. Use admin status override if necessary.`,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: false,
      action: '',
    };
  }

  // ── 5. Admin override path ────────────────────────────────────────────
  if (isAdminOverride) {
    const overrideRule = WORKFLOW_TRANSITIONS.find(
      (r) => r.from === '*' && r.to === 'NEW'
    );

    if (!overrideRule) {
      return {
        success: false,
        error: 'Admin override rule is not configured in the workflow.',
        fromStatus: currentStatus,
        toStatus: targetStatus,
        isAutomatic: false,
        action: '',
      };
    }

    if (!overrideRule.allowedRoles.includes(userRole)) {
      return {
        success: false,
        error: `Role "${userRole}" does not have permission to override complaint status. Only ${overrideRule.allowedRoles.join(', ')} can perform status overrides.`,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        isAutomatic: false,
        action: overrideRule.action,
      };
    }

    return {
      success: true,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: false,
      action: overrideRule.action,
    };
  }

  // ── 6. Normal transition — find matching rule ─────────────────────────
  const matchingRule = WORKFLOW_TRANSITIONS.find(
    (r) => r.from !== '*' && r.from === currentStatus && r.to === targetStatus
  );

  if (!matchingRule) {
    // Provide a helpful error with the valid next statuses
    const validTargets = getNextStatuses(currentStatus as ComplaintStatus);
    const hint =
      validTargets.length > 0
        ? ` Valid next statuses from "${currentStatus}" are: ${validTargets.join(', ')}.`
        : ` There are no valid transitions from "${currentStatus}".`;
    return {
      success: false,
      error: `Transition from "${currentStatus}" to "${targetStatus}" is not defined in the workflow.${hint}`,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: false,
      action: '',
    };
  }

  // ── 7. Automatic transitions cannot be triggered by users ─────────────
  if (matchingRule.isAutomatic) {
    return {
      success: false,
      error: `Transition from "${currentStatus}" to "${targetStatus}" is automatic and cannot be triggered manually. The system will perform this transition automatically: ${matchingRule.description ?? ''}`,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: true,
      action: matchingRule.action,
    };
  }

  // ── 8. Role-based access check ────────────────────────────────────────
  if (!matchingRule.allowedRoles.includes(userRole)) {
    return {
      success: false,
      error: `Role "${userRole}" is not authorized to transition from "${currentStatus}" to "${targetStatus}". Only ${matchingRule.allowedRoles.join(', ')} can perform this action.`,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      isAutomatic: false,
      action: matchingRule.action,
    };
  }

  // ── 9. Success ────────────────────────────────────────────────────────
  return {
    success: true,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    isAutomatic: false,
    action: matchingRule.action,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all actions available to `userRole` when the complaint is in
 * `currentStatus`.
 *
 * Useful for rendering action buttons in the UI.
 *
 * @param currentStatus  The complaint's current status.
 * @param userRole       The role of the viewing user.
 * @returns An array of available actions, each with display metadata.
 */
export function getAvailableActions(
  currentStatus: string,
  userRole: UserRole
): AvailableAction[] {
  const actions: AvailableAction[] = [];

  for (const rule of WORKFLOW_TRANSITIONS) {
    // Skip the wildcard override rule — it is handled separately
    if (rule.from === '*') continue;

    // Must match current status
    if (rule.from !== currentStatus) continue;

    // Automatic transitions are shown but marked (UI can decide to display differently)
    if (rule.isAutomatic) {
      actions.push({
        action: rule.action,
        targetStatus: rule.to,
        label: getActionLabel(rule.action, rule.to),
        icon: getStatusIcon(rule.to),
        requiredFields: rule.requiredFields,
        color: STATUS_CONFIG[rule.to].color,
        description: rule.description,
        isAutomatic: true,
      });
      continue;
    }

    // User must have the required role
    if (!rule.allowedRoles.includes(userRole)) continue;

    actions.push({
      action: rule.action,
      targetStatus: rule.to,
      label: getActionLabel(rule.action, rule.to),
      icon: getStatusIcon(rule.to),
      requiredFields: rule.requiredFields,
      color: STATUS_CONFIG[rule.to].color,
      description: rule.description,
      isAutomatic: false,
    });
  }

  // Admin override: super_admin and admin can override to any status
  const overrideRule = WORKFLOW_TRANSITIONS.find((r) => r.from === '*');
  if (overrideRule && overrideRule.allowedRoles.includes(userRole)) {
    // Add a single "Override Status" action — the UI should present a status picker
    actions.push({
      action: 'status_override',
      targetStatus: 'NEW' as ComplaintStatus, // placeholder; UI allows picking any status
      label: 'Override Status',
      icon: 'ShieldAlert',
      color: 'text-amber-600',
      description:
        'Force-transition this complaint to any status. This bypasses normal workflow rules.',
      isAutomatic: false,
    });
  }

  return actions;
}

/**
 * Check whether a given status is terminal (no further transitions possible
 * through normal workflow).
 */
export function isTerminalStatus(status: string): boolean {
  return status === 'CLOSED';
}

/**
 * Get the list of statuses that can be reached from `status` via a single
 * normal (non-override) transition.
 */
export function getNextStatuses(status: string): ComplaintStatus[] {
  return WORKFLOW_TRANSITIONS
    .filter((r) => r.from !== '*' && r.from === status)
    .map((r) => r.to);
}

/**
 * Get the transition rule for a specific from→to pair, or `undefined` if
 * no such rule exists (other than the wildcard override).
 */
export function getTransitionRule(
  from: ComplaintStatus,
  to: ComplaintStatus
): TransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find((r) => r.from !== '*' && r.from === from && r.to === to);
}

/**
 * Validate that all required fields for a transition are present in the
 * provided body object.
 *
 * @returns `null` if all fields are present, or an error string.
 */
export function validateRequiredFields(
  rule: TransitionRule,
  body: Record<string, unknown>
): string | null {
  if (!rule.requiredFields || rule.requiredFields.length === 0) return null;

  for (const field of rule.requiredFields) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      return `Missing required field "${field}" for transition ${rule.from === '*' ? '(any)' : rule.from} → ${rule.to}. This field is mandatory: ${rule.description ?? ''}`;
    }
  }

  return null;
}

/**
 * Get all statuses in the main (non-rework) flow, in order.
 */
export function getMainFlowStatuses(): ComplaintStatus[] {
  return [
    'NEW',
    'ASSIGNED',
    'ACCEPTED',
    'WORK_ORDER_CREATED',
    'IN_PROGRESS',
    'WAITING_CLIENT_CONFIRMATION',
    'CLIENT_CONFIRMED',
    'DRAFT_INVOICE',
    'INVOICE_APPROVED',
    'INVOICE_SENT',
    'PAID',
    'CLOSED',
  ];
}

/**
 * Get the rework branch statuses, in order.
 */
export function getReworkFlowStatuses(): ComplaintStatus[] {
  return ['WAITING_CLIENT_CONFIRMATION', 'REWORK_REQUIRED', 'IN_PROGRESS'];
}

// ============================================================================
// STATUS DISPLAY CONFIGURATION
// ============================================================================

/**
 * Visual configuration for every status. Used to render status badges,
 * timeline indicators, and color-coded UI elements.
 */
export const STATUS_CONFIG: Record<ComplaintStatus, StatusDisplayConfig> = {
  NEW: {
    label: 'New',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    icon: 'CirclePlus',
  },
  ASSIGNED: {
    label: 'Assigned',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: 'UserCheck',
  },
  ACCEPTED: {
    label: 'Accepted',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    icon: 'CheckCircle2',
  },
  WORK_ORDER_CREATED: {
    label: 'Work Order Created',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    icon: 'ClipboardList',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    icon: 'Wrench',
  },
  WAITING_CLIENT_CONFIRMATION: {
    label: 'Pending Confirmation',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: 'Clock',
  },
  CLIENT_CONFIRMED: {
    label: 'Client Confirmed',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    icon: 'ThumbsUp',
  },
  DRAFT_INVOICE: {
    label: 'Draft Invoice',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    icon: 'FileText',
  },
  INVOICE_APPROVED: {
    label: 'Invoice Approved',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    icon: 'BadgeCheck',
  },
  INVOICE_SENT: {
    label: 'Invoice Sent',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    icon: 'Send',
  },
  PAID: {
    label: 'Paid',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: 'Banknote',
  },
  CLOSED: {
    label: 'Closed',
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-100',
    borderColor: 'border-zinc-300',
    icon: 'Lock',
  },
  REWORK_REQUIRED: {
    label: 'Rework Required',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    icon: 'RotateCcw',
  },
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Map an action name + target status to a human-readable button label.
 */
function getActionLabel(action: string, _targetStatus: ComplaintStatus): string {
  const labels: Record<string, string> = {
    assigned: 'Assign Complaint',
    reassigned: 'Reassign Technician',
    accepted: 'Accept Assignment',
    assignment_rejected: 'Reject Assignment',
    work_order_created: 'Create Work Order',
    work_started: 'Start Work',
    work_completed: 'Complete Work',
    client_confirmed: 'Confirm Completion',
    rework_requested: 'Request Rework',
    rework_started: 'Start Rework',
    draft_invoice_created: 'Generate Draft Invoice',
    invoice_approved: 'Approve Invoice',
    invoice_sent: 'Send Invoice',
    invoice_paid: 'Record Payment',
    complaint_closed: 'Close Complaint',
    status_override: 'Override Status',
  };
  return labels[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get the Lucide icon name for a status (used in action buttons).
 */
function getStatusIcon(status: ComplaintStatus): string {
  return STATUS_CONFIG[status]?.icon ?? 'Circle';
}