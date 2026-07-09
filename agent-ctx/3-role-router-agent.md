# Task 3 — RBAC Notification Role Router

## Agent: Role Router Builder
## Status: Completed

## Work Log
- Read `/home/z/my-project/worklog.md` for project context (enterprise HMS, modular architecture, Supabase + SQLite)
- Analyzed existing `notification-service.ts` to understand `createNotification` API and `CreateNotificationInput` interface
- Reviewed `rbac.ts` for role hierarchy and `UserRole` type definition
- Checked `prisma/schema.prisma` for `Notification` and `NotificationLog` table schemas
- Verified import conventions (`@/core/database/db` for Prisma client)
- Checked barrel export file `src/modules/notifications/index.ts` to understand export patterns

## File Created
- **`src/modules/notifications/services/role-router.ts`** — 349 lines

## What Was Built

### 1. ROLE_NOTIFICATION_RULES Map
Comprehensive `Record<NotificationEventKey, RoleRoutingRule>` covering 25 business events across 8 modules:
- **Complaints** (11 events): created, assigned, accepted, rejected, started, completed, closed, escalated, reassigned, client_confirmed, client_rejected
- **Work Orders** (3 events): created, completed, feedback
- **Invoices** (4 events): created, paid, overdue, approved
- **Quotations** (2 events): created, approved
- **Inventory** (2 events): low_stock, adjusted
- **Finance** (1 event): payment_failed
- **HR** (3 events): leave_request, new_employee, attendance_alert
- **Email** (2 events): sent, failed
- **System** (2 events): error, security_alert
- **WhatsApp** (1 event): message_received
- **Auth** (2 events): password_changed, login_failed

Each rule has `roles` (queried from DB) and `contextKeys` (explicit user IDs pulled from event context).

### 2. resolveRecipients()
- Looks up event key in rules map (warns if not found)
- Queries `db.user.findMany()` for active users with matching roles in tenant
- Supports optional `departmentId` filtering from context
- Pulls explicit IDs from context fields (customerId, technicianId, etc.)
- Deduplicates and applies exclusion list
- Returns `{ userIds: string[], roles: string[] }`

### 3. sendRoleBasedNotification()
- Primary entry point for business modules
- Calls `resolveRecipients()` → `createNotification()` → `logNotificationEvent()`
- Embeds routing metadata (`_routing.eventKey`, `_routing.resolvedRoles`, `_routing.recipientCount`) in notification data
- Returns first notification ID or empty string

### 4. logNotificationEvent()
- Creates audit log entry in Notification table with type `'audit_log'`
- Records module, action, delivery status, recipient count, timestamp
- Wrapped in try/catch — never blocks business logic

## ESLint: 0 errors, 0 warnings

## Notes
- No other files were modified (per task instructions)
- The barrel `index.ts` does NOT yet export from this file — that would require a separate task
- The file uses `@/core/database/db` import matching all other service files in the project
- TypeScript type-checking via `tsc --noEmit` reports the same pre-existing path alias resolution error as `notification-service.ts` — this is a tsconfig alias issue, not a code issue