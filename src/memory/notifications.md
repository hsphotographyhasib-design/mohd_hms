# FacilityPro — Notification System

## Overview
The notification system provides in-app notifications for workflow events, escalations, and system alerts. Notifications are created by the workflow engine, escalation engine, and WhatsApp workflow engine.

## Data Model (`Notification` in Prisma schema)

### Key Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Tenant scope |
| `userId` | String? | Target user (null = broadcast) |
| `type` | String | Notification type |
| `title` | String | Notification title |
| `message` | String | Notification body |
| `data` | String? | JSON — related entity IDs |
| `isRead` | Boolean | Read status (default: false) |
| `relatedEntityType` | String? | complaint, work_order, invoice, pm_schedule |
| `relatedEntityId` | String? | FK to related entity |
| `createdAt` | DateTime | Created timestamp |
| `updatedAt` | DateTime | Updated timestamp |

### Relations
- `tenant` → Tenant
- `complaint` → Complaint (optional, via `relatedEntityId`)

## Notification Types

### Workflow Notifications
| Type | Trigger |
|------|---------|
| `complaint_assigned` | Complaint assigned to technician |
| `workflow_transition` | Any status change (generic) |
| `work_order_created` | Work order auto-created |
| `emergency` | Emergency complaint received |

### Escalation Notifications
| Type | Trigger |
|------|---------|
| `escalation` | SLA breach detected |

### System Notifications
| Type | Trigger |
|------|---------|
| `pm_reminder` | PM schedule due |
| `invoice_reminder` | Invoice overdue |
| `eta_update` | Technician ETA update |

## Notification Sources

### 1. Workflow Engine (`notification-engine.ts`)
Called after every complaint status transition via `recordWorkflowTransition()`. Creates notifications for relevant users based on the action type (see workflows.md for routing table).

### 2. Escalation Engine (`escalation-rules.ts`)
Called by `checkEscalations(tenantId)`. Creates notifications for staff and/or customers when SLA thresholds are breached.

### 3. WhatsApp Workflow Engine (`workflow-engine.ts`)
Creates notifications when auto-routing complaints, creating work orders, or handling emergencies.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List notifications |
| PUT | `/api/notifications` | Update notification (mark read) |
| POST | `/api/notifications` | Create notification |

### GET `/api/notifications` Details
- Admin/manager/super_admin see all notifications for the tenant
- Other roles see only their own (`userId` filter)
- Query params: `page`, `pageSize`, `isRead`, `userId`
- Returns `unreadCount` in response
- Supports `PUT` with `{ ids: [...], isRead: true }` to batch mark as read

## Frontend State (`useNotificationStore`)
Zustand store in `src/store/index.ts`:
```ts
interface NotificationState {
  unreadCount: number;
  notifications: NotificationItem[];
  setNotifications(notifications);
  setUnreadCount(count);
  markAsRead(id);
  markAllAsRead();
}
```

## Frontend Components
| Component | File | Purpose |
|-----------|------|---------|
| `NotificationList` | `components/modules/notifications/notification-list.tsx` | Notification panel/dropdown |

## Notification Panel
Accessed via the header's notification bell icon. Shows unread count badge and lists notifications with mark-as-read functionality.

## Feature Access
All roles can view and manage their own notifications. Admins/managers can see all tenant notifications.

## Notification Creation Pattern
```ts
await db.notification.create({
  data: {
    tenantId,
    userId: targetUserId,
    type: 'workflow_transition',
    title: 'Complaint Assigned',
    message: 'A new complaint has been assigned...',
    data: JSON.stringify({ complaintId: '...', action: 'assigned' }),
    relatedEntityType: 'complaint',
    relatedEntityId: complaintId,
  }
});
```
