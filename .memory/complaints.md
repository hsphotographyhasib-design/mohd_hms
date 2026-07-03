# Complaints Module

> Auto-generated from codebase scan.

## Overview

Full complaint lifecycle management with 13-status workflow, escalation rules, timeline tracking, and customer feedback.

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/modules/complaints/complaint-list.tsx` | ~500 | List view with filters, status badges, priority, assignment |
| `src/components/modules/complaints/complaint-detail.tsx` | ~800+ | Detail view with workflow actions, timeline, related WO/invoice |
| `src/components/modules/complaints/new-complaint.tsx` | ~400 | Create complaint form |
| `src/app/api/complaints/route.ts` | ~300 | GET (list), POST (create) |
| `src/app/api/complaints/[id]/route.ts` | ~400 | GET (detail), PUT (update), DELETE |
| `src/app/api/complaints/[id]/workflow/route.ts` | ~200 | POST (execute transition) |
| `src/app/api/complaints/escalation-rules/route.ts` | ~50 | GET (list rules) |
| `src/app/api/complaints/escalation-check/route.ts` | ~50 | GET (run escalation) |

## Workflow State Machine (13 statuses)

### Main Flow:
```
NEW → ASSIGNED → ACCEPTED → WORK_ORDER_CREATED → IN_PROGRESS →
WAITING_CLIENT_CONFIRMATION → CLIENT_CONFIRMED → DRAFT_INVOICE →
INVOICE_APPROVED → INVOICE_SENT → PAID → CLOSED
```

### Rework Branch:
```
WAITING_CLIENT_CONFIRMATION → REWORK_REQUIRED → IN_PROGRESS (loops back)
```

### Status Details:

| Status | Who Acts | Automatic? | Description |
|--------|----------|-----------|-------------|
| NEW | admin/manager/supervisor | No | Initial state, awaiting assignment |
| ASSIGNED | technician | No | Assigned to technician, awaiting acceptance |
| ACCEPTED | system | **Yes** | Technician accepted → auto-creates WorkOrder |
| WORK_ORDER_CREATED | technician | No | Work order created, awaiting start |
| IN_PROGRESS | technician | No | Work in progress |
| WAITING_CLIENT_CONFIRMATION | customer | No | Work done, awaiting customer confirmation |
| CLIENT_CONFIRMED | system | **Yes** | Customer confirmed → auto-creates draft Invoice |
| DRAFT_INVOICE | finance/admin | No | Invoice draft created, awaiting approval |
| INVOICE_APPROVED | finance/admin | No | Invoice approved, ready to send |
| INVOICE_SENT | finance/admin | No | Invoice sent to customer |
| PAID | finance/admin | No | Payment received |
| CLOSED | system/admin | **Yes** | Complaint closed after payment |
| REWORK_REQUIRED | customer | No | Customer rejected, needs rework |

### Required Fields Per Transition:

| Transition | Required Fields |
|-----------|----------------|
| NEW → ASSIGNED | `assignedToId`, `supervisorId` |
| ASSIGNED → NEW (reject) | `rejectionReason` |
| WAITING → REWORK | `reworkReason` |
| INVOICE_APPROVED → INVOICE_SENT | `sentVia` |
| INVOICE_SENT → PAID | `paymentMethod`, `paymentRef`, `paidAt` |

## Escalation Rules

| Rule | Status | Threshold | Severity | Notifies |
|------|--------|-----------|----------|----------|
| new_unassigned | NEW | 15 min | warning | supervisor, admin |
| assigned_unaccepted | ASSIGNED | 30 min | warning | admin, supervisor |
| wo_not_started | WORK_ORDER_CREATED | 20 min | warning | admin, supervisor |
| work_stalled | IN_PROGRESS | 4 hours | critical | admin, supervisor |
| client_unresponsive | WAITING_CLIENT | 3 days | warning | customer, supervisor |
| payment_overdue | INVOICE_SENT | 7 days | overdue | finance, admin, customer |

- Each rule fires **at most once** per complaint (idempotent)
- Checks ComplaintTimeline for existing escalation with matching rule label
- Creates: timeline entry + notifications + audit log (in transaction)

## Complaint Sources

| Source | Description |
|--------|-------------|
| portal | Web portal submission |
| whatsapp | WhatsApp conversation |
| admin | Created by admin/manager |
| qr_scan | QR code scan service request |
| mobile_app | Mobile app submission |

## Priority Levels

| Level | Color | Description |
|-------|-------|-------------|
| low | gray/blue | Minor issues |
| medium | amber/yellow | Standard requests |
| high | orange | Urgent issues |
| critical | red | Emergency/breakdown |

## Complaint → Work Order Auto-Creation

When complaint transitions from ACCEPTED → WORK_ORDER_CREATED:
- System automatically creates a WorkOrder record
- Links to complaint via `complaintId`
- Sets title from complaint title
- Sets assignedToId from complaint's assigned technician
- Updates complaint.workOrderId

## Complaint → Invoice Auto-Creation

When complaint transitions from CLIENT_CONFIRMED → DRAFT_INVOICE:
- System automatically creates an Invoice record
- Links to complaint via quotation or directly
- Sets DRAFT status
- Updates complaint.invoiceId

## Timeline System

Each workflow action creates a ComplaintTimeline entry:
- `action`: e.g., 'assigned', 'accepted', 'work_started', 'escalation_triggered'
- `fromStatus` / `toStatus`: state transition
- `performedBy` / `performedByRole`: who did it
- `description`: human-readable text
- `metadata`: JSON with extra context (ETA, rule details, etc.)

## Customer Feedback

After CLOSED, customer can rate (1-5) and provide feedback:
- `customerRating`: Int
- `customerFeedback`: String (free text)

## Key Type Definitions

```ts
interface ComplaintItem {
  id, tenantId, customerId, customerName, equipmentId, equipmentName,
  title, description, priority, status, source, category,
  assignedToId, assignedToName, supervisorId, supervisorName,
  workOrderId, invoiceId, eta,
  rejectionReason, reworkReason, resolutionNotes,
  customerRating, customerFeedback,
  acceptedAt, startedAt, completedAt, clientConfirmedAt, resolvedAt, closedAt,
  createdAt, updatedAt,
  workOrders?, timeline?, availableActions?
}
```