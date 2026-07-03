# Workflow Engine

> Auto-generated from codebase scan.

## Overview

Complete workflow system with state machine, notification engine, and escalation rules. Drives the complaint lifecycle from creation to closure.

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/workflow/state-machine.ts` | ~730 | State machine: transitions, validation, status config |
| `src/lib/workflow/notification-engine.ts` | ~515 | Notification creation on transitions |
| `src/lib/workflow/escalation-rules.ts` | ~480 | SLA escalation detection and firing |

## State Machine (state-machine.ts)

### Transition Rules (WORKFLOW_TRANSITIONS array):

Each rule defines:
```ts
interface TransitionRule {
  from: ComplaintStatus | '*';  // '*' = admin override
  to: ComplaintStatus;
  allowedRoles: UserRole[];
  isAutomatic: boolean;
  action: string;           // e.g., 'assigned', 'accepted'
  requiredFields?: string[];
  description?: string;
}
```

### Key Functions:

```ts
validateTransition(current, target, role, isAdminOverride) → TransitionResult
  // Validates if a transition is allowed. Checks: valid statuses, same-status guard,
  // terminal-status guard, admin override, rule match, automatic guard, role check.

getAvailableActions(currentStatus, userRole) → AvailableAction[]
  // Returns all actions the user can perform. Used by UI to render action buttons.

isTerminalStatus(status) → boolean  // Only 'CLOSED'
getNextStatuses(status) → ComplaintStatus[]  // Single-step reachable statuses
getTransitionRule(from, to) → TransitionRule | undefined
validateRequiredFields(rule, body) → string | null
getMainFlowStatuses() → ComplaintStatus[]  // 12 statuses in order
getReworkFlowStatuses() → ComplaintStatus[]  // 3 statuses
```

### Status Display Config (STATUS_CONFIG):

Every status has:
```ts
{ label, color, bgColor, borderColor, icon }
// Example: NEW → { label: 'New', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: 'CirclePlus' }
```

## Notification Engine (notification-engine.ts)

### Main Entry Point:

```ts
recordWorkflowTransition(ctx: WorkflowContext): Promise<void>
  // Called after EVERY successful workflow transition
  // Creates: timeline entry + notifications + audit log
  // All in a single Prisma $transaction
  // Errors are caught and logged — never breaks the workflow
```

### WorkflowContext:
```ts
interface WorkflowContext {
  tenantId, complaintId, customerId,
  fromStatus, toStatus, action,
  performedBy, performedByRole, description,
  metadata?, assignedToId?, supervisorId?,
  ipAddress?, userAgent?
}
```

### Notification Resolution:
- `resolveNotificationTargets(ctx)` - Determines WHO gets notified
- `pushUsersByRole(tenantId, role, targets, template)` - Finds active users by role
- De-duplicates by userId before creating

### Notification Templates:
14 message templates mapped to action names:
```ts
const templates = {
  assigned: { type: 'complaint_assigned', title: 'Complaint Assigned', message: '...' },
  accepted: { type: 'workflow_transition', title: 'Complaint Accepted', message: '...' },
  // ... 12 more
};
```

### Audit Logging:
```ts
createAuditLog(ctx: WorkflowContext): Promise<void>
  // Creates AuditLog with:
  // action: 'workflow.{action}'
  // entity: 'Complaint'
  // entityId: complaintId
  // oldValue: { status: fromStatus }
  // newValue: { status: toStatus }
  // details: { action, description, metadata, performedByRole }
  // device: parsed from userAgent
```

### Timeline Query:
```ts
getComplaintTimeline(tenantId, complaintId) → TimelineEntry[]
  // Returns full timeline ordered chronologically
  // Batch-resolves performedBy names in single query
```

## Escalation Rules (escalation-rules.ts)

### Main Entry Point:
```ts
checkEscalations(tenantId) → EscalationCheckResult
  // Iterates all rules, finds breached complaints, fires escalations
  // Each rule fires AT MOST ONCE per complaint (idempotent)
```

### Idempotency:
```ts
wasAlreadyEscalated(complaintId, ruleLabel, since) → boolean
  // Checks ComplaintTimeline for existing 'escalation_triggered' entry
  // with matching rule label in metadata
  // 'since' parameter = complaint's updatedAt (entered current status)
```

### Escalation Rule Structure:
```ts
interface EscalationRule {
  status: ComplaintStatus;
  thresholdMs: number;
  checkField: string;         // Always 'updatedAt'
  severity: 'warning' | 'critical' | 'overdue';
  label: string;              // e.g., 'new_unassigned'
  description: string;
  notifyRoles: string[];
  notifyCustomer: boolean;
  notifySupervisor: boolean;
  staffMessage: (title, elapsed) → string;
  customerMessage: (title, elapsed) → string;
}
```

### 6 Active Rules:
1. **new_unassigned**: NEW > 15min → supervisor + admin
2. **assigned_unaccepted**: ASSIGNED > 30min → admin + supervisor
3. **wo_not_started**: WORK_ORDER_CREATED > 20min → admin + supervisor
4. **work_stalled**: IN_PROGRESS > 4h → admin + supervisor
5. **client_unresponsive**: WAITING_CLIENT > 3d → customer + supervisor
6. **payment_overdue**: INVOICE_SENT > 7d → finance + admin + customer

### Escalation Firing (atomic):
Each fired escalation creates in a single transaction:
1. ComplaintTimeline entry (action: 'escalation_triggered', metadata: rule + severity + elapsed)
2. Notification records (de-duplicated by userId)
3. AuditLog entry (action: 'escalation.{rule_label}')