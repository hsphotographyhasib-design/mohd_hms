---
Task ID: 10
Agent: Escalation Rules Builder
Task: Build SLA-based escalation rules engine with auto-notification

Files Created:
1. `src/lib/workflow/escalation-rules.ts` — Core escalation engine
2. `src/app/api/complaints/escalation-check/route.ts` — POST (trigger) + GET (rule defs)
3. `src/app/api/complaints/escalation-rules/route.ts` — GET (read-only rule definitions)

Implementation Details:
- 6 escalation rules covering non-terminal statuses: NEW (15min), ASSIGNED (30min), WORK_ORDER_CREATED (20min), IN_PROGRESS (4h), WAITING_CLIENT_CONFIRMATION (3d), INVOICE_SENT (7d)
- Each rule has severity levels: warning, critical, overdue
- Idempotent: `wasAlreadyEscalated()` checks ComplaintTimeline for existing `escalation_triggered` entries with matching rule label in metadata
- All side effects (timeline + notifications + audit) wrapped in `db.$transaction`
- Notification routing per rule: supervisors, admins, finance, customers as specified
- Auth pattern matches existing workflow route (Bearer token, verifyToken)
- Role gating: admin/super_admin/manager for trigger; admin/super_admin/manager/supervisor for viewing rules
- Super admin can specify a different tenantId in the POST body

Lint: Clean (0 errors, 0 warnings)