# Task 6: Add Notification Triggers to API Routes

## Summary

Added centralized notification service calls to 5 API routes, replacing direct `db.notification.create`/`createMany` calls with the centralized `NotificationService`.

## Changes Made

### 1. `/api/complaints/route.ts` (POST)
- **Added import**: `createNotification` from `@/lib/notifications/notification-service`
- **After complaint creation**: Sends notification to all `super_admin`, `admin`, `manager`, `supervisor` roles using role-based targeting
- Excludes the creator from receiving their own notification
- Wrapped in try/catch to prevent notification failure from blocking complaint creation

### 2. `/api/complaints/[id]/accept-reject/route.ts` (POST)
- **Added import**: `createNotification` from `@/lib/notifications/notification-service`
- **Removed**: Two `tx.notification.createMany` blocks inside the transaction (accept + reject paths)
- **Added**: Centralized `createNotification()` calls after the transaction succeeds
  - Accept: Notifies admins/supervisors/managers with `complaint_accepted` type
  - Reject: Notifies admins/supervisors/managers with `complaint_rejected` type, with high priority for critical complaints
- Uses role-based targeting (`roles: ['admin', 'super_admin', 'supervisor', 'manager']`) excluding the acting technician

### 3. `/api/complaints/[id]/assign-technician/route.ts` (POST)
- **Added import**: `createNotification`, `notifyComplaintAssigned` from `@/lib/notifications/notification-service`
- **Removed import**: Unused `recordWorkflowTransition` from notification-engine
- **Removed**: 4 `tx.notification.create`/`createMany` blocks inside the transaction:
  - Technician notification
  - Customer notification
  - Admin/super_admin notification
  - Previous technician reassignment notification
- **Added** (after transaction):
  - `notifyComplaintAssigned()` convenience function for technician + customer notifications
  - `createNotification()` with role targeting for admins/super_admins
  - `createNotification()` for previous technician (reassignment case only)

### 4. `/api/work-orders/route.ts` (POST)
- **Added import**: `notifyWorkOrderCreated`, `createNotification` from `@/lib/notifications/notification-service`
- **Removed**: Entire `createWoNotifications()` function (42 lines) that used `db.notification.createMany`
- **Added**: After work order creation (non-draft only):
  - `notifyWorkOrderCreated()` for assigned technician (fire-and-forget with `.catch()`)
  - `createNotification()` for supervisor notification (fire-and-forget with `.catch()`)

### 5. `/api/invoices/route.ts` (POST)
- **Added import**: `notifyInvoiceCreated` from `@/lib/notifications/notification-service`
- **After invoice creation**: Calls `notifyInvoiceCreated()` to notify the customer
- Wrapped in try/catch, includes formatted currency amount in the notification message

### 6. `/api/dashboard/route.ts`
- No changes needed (dashboard doesn't create notifications)

## Design Decisions

1. **Non-blocking notifications**: All notification calls are wrapped in try/catch and never fail the main operation
2. **Role-based targeting**: Used `roles` parameter instead of querying user IDs where possible (simpler, leverages NotificationService)
3. **Exclusion of creator**: `excludeUserIds` used to prevent the acting user from receiving their own notification
4. **Moved outside transactions**: Notifications that were inside `db.$transaction()` were moved to after the transaction completes, since the centralized service uses its own `db` client
5. **Deduplication**: The centralized service's 30-second dedup window prevents duplicate notifications for rapid repeated actions
6. **WebSocket push**: All notifications now automatically push via WebSocket for real-time delivery

## Verification

- ESLint: All 5 modified files pass lint with zero errors/warnings
- No changes to API response formats
- All existing RBAC checks and validations preserved