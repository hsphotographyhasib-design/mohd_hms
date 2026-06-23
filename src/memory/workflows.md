# FacilityPro — Workflow System

## Overview
The complaint workflow is a **state machine** that drives the entire lifecycle of a service request. It is implemented in `src/lib/workflow/` with three files:

| File | Purpose |
|------|---------|
| `state-machine.ts` | Transition rules, validation, status display config |
| `notification-engine.ts` | Timeline + notifications + audit log on each transition |
| `escalation-rules.ts` | SLA-based auto-escalation engine |

## Complaint Lifecycle — Main Flow

```
NEW → ASSIGNED → ACCEPTED → WORK_ORDER_CREATED → IN_PROGRESS →
WAITING_CLIENT_CONFIRMATION → CLIENT_CONFIRMED → DRAFT_INVOICE →
INVOICE_APPROVED → INVOICE_SENT → PAID → CLOSED
```

## Rework Branch
```
WAITING_CLIENT_CONFIRMATION → REWORK_REQUIRED → IN_PROGRESS (loops back)
```

## All 13 Statuses

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| `NEW` | CirclePlus | slate | Complaint created, unassigned |
| `ASSIGNED` | UserCheck | blue | Assigned to technician + supervisor |
| `ACCEPTED` | CheckCircle2 | cyan | Technician accepted the job |
| `WORK_ORDER_CREATED` | ClipboardList | indigo | System auto-created WorkOrder |
| `IN_PROGRESS` | Wrench | amber | Technician started work |
| `WAITING_CLIENT_CONFIRMATION` | Clock | orange | Work done, awaiting customer sign-off |
| `CLIENT_CONFIRMED` | ThumbsUp | emerald | Customer approved completion |
| `DRAFT_INVOICE` | FileText | violet | System auto-created draft invoice |
| `INVOICE_APPROVED` | BadgeCheck | purple | Finance/admin approved invoice |
| `INVOICE_SENT` | Send | sky | Invoice sent to customer |
| `PAID` | Banknote | green | Payment received |
| `CLOSED` | Lock | zinc | Terminal — no further transitions |
| `REWORK_REQUIRED` | RotateCcw | rose | Customer rejected, needs rework |

## Transition Rules (15 defined)

| From | To | Who | Auto? | Required Fields |
|------|----|-----|-------|-----------------|
| NEW | ASSIGNED | admin, manager, supervisor | No | assignedToId, supervisorId |
| ASSIGNED | ACCEPTED | technician | No | — |
| ASSIGNED | NEW | technician | No | rejectionReason |
| ACCEPTED | WORK_ORDER_CREATED | system | **Yes** | — |
| WORK_ORDER_CREATED | IN_PROGRESS | technician | No | — |
| IN_PROGRESS | WAITING_CLIENT_CONFIRMATION | technician | No | — |
| WAITING_CLIENT_CONFIRMATION | CLIENT_CONFIRMED | customer | No | — |
| WAITING_CLIENT_CONFIRMATION | REWORK_REQUIRED | customer | No | reworkReason |
| REWORK_REQUIRED | IN_PROGRESS | technician | No | — |
| CLIENT_CONFIRMED | DRAFT_INVOICE | system | **Yes** | — |
| DRAFT_INVOICE | INVOICE_APPROVED | finance, admin, super_admin | No | — |
| INVOICE_APPROVED | INVOICE_SENT | finance, admin, super_admin | No | sentVia |
| INVOICE_SENT | PAID | finance, admin, super_admin | No | paymentMethod, paymentRef, paidAt |
| PAID | CLOSED | admin, super_admin | **Yes** | — |
| * (any) | NEW | admin, super_admin | No | — (status override) |

**Key rules:**
- Automatic transitions cannot be triggered by users
- `CLOSED` is terminal — only admin override can escape it
- Same-status transitions are blocked
- Admin override (`from: '*'`) allows super_admin and admin to force any status

## Validation Function
```ts
validateTransition(currentStatus, targetStatus, userRole, isAdminOverride?)
// Returns: { success, error?, fromStatus, toStatus, isAutomatic, action }
```

## Notification Engine
On every successful transition, `recordWorkflowTransition()` creates atomically:
1. **ComplaintTimeline** entry (who did what, when)
2. **Notification** records (targeted to relevant users)
3. **AuditLog** entry (full change record)

### Notification Routing by Action
| Action | Notified |
|--------|----------|
| assigned | technician, customer, supervisor, admins |
| accepted | customer, supervisor |
| rejected (assignment) | supervisor, admins |
| started | customer, supervisor |
| completed | customer |
| client_confirmed | finance, admins, supervisor |
| client_rejected | technician, supervisor |
| rework_required | technician, supervisor |
| invoice_generated | finance, admins |
| invoice_approved | admins |
| invoice_sent | customer |
| payment_received | customer, admins |
| closed | customer, technician, supervisor, admins |
| status_override | admins |

## Escalation Rules (SLA)
6 auto-escalation rules that fire once per complaint (idempotent):

| Status | Threshold | Severity | Notified |
|--------|-----------|----------|----------|
| NEW | 15 min | warning | supervisor, admin |
| ASSIGNED | 30 min | warning | admin, supervisor |
| WORK_ORDER_CREATED | 20 min | warning | admin, supervisor |
| IN_PROGRESS | 4 hours | critical | admin, supervisor |
| WAITING_CLIENT_CONFIRMATION | 3 days | warning | customer, supervisor |
| INVOICE_SENT | 7 days | overdue | finance, admin, customer |

Entry point: `checkEscalations(tenantId)` — checks all rules for a tenant.

## API Endpoints
- `POST /api/complaints/[id]/workflow` — trigger a transition
- `GET /api/complaints/escalation-rules` — list escalation rules
- `GET /api/complaints/escalation-check` — run escalation check manually
