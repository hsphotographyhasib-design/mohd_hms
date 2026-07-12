# FacilityPro — Complaints Feature

## Overview
The complaints feature is the **core workflow engine** of FacilityPro. It manages the full lifecycle of service requests from creation through resolution, billing, and closure.

## Data Model (`Complaint` in Prisma schema)

### Key Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Tenant scope |
| `customerId` | String | FK to Customer |
| `equipmentId` | String? | Optional FK to Equipment |
| `title` | String | Complaint title |
| `description` | String | Detailed description |
| `priority` | String | low, medium, high, critical |
| `status` | String | 13 workflow states (see workflows.md) |
| `source` | String | portal, whatsapp, admin, qr_scan, mobile_app |
| `category` | String? | HVAC, Electrical, Plumbing, etc. |
| `assignedToId` | String? | FK to User (technician) |
| `supervisorId` | String? | FK to User (supervisor) |
| `workOrderId` | String? | Auto-linked on ACCEPTED |
| `invoiceId` | String? | Auto-linked on CLIENT_CONFIRMED |
| `photos` | String? | JSON array of photo URLs |
| `gpsLocation` | String? | JSON {lat, lng} |
| `eta` | String? | Technician ETA |
| `rejectionReason` | String? | If technician rejects |
| `reworkReason` | String? | If customer requests rework |
| `resolutionNotes` | String? | Resolution details |
| `customerRating` | Int? | 1-5 rating |
| `customerFeedback` | String? | Feedback text |

### Timestamps
`acceptedAt`, `startedAt`, `completedAt`, `clientConfirmedAt`, `resolvedAt`, `closedAt`

### Relations
- `customer` → Customer (many-to-one)
- `equipment` → Equipment (optional, many-to-one)
- `assignedTo` → User via "TechnicianComplaints" (many-to-one)
- `supervisor` → User via "SupervisorComplaints" (many-to-one)
- `workOrders` → WorkOrder[] (one-to-many)
- `timeline` → ComplaintTimeline[] (one-to-many)
- `notifications` → Notification[] (one-to-many)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/complaints` | List (paginated, filter by status/priority/search) |
| POST | `/api/complaints` | Create complaint |
| GET | `/api/complaints/[id]` | Get with timeline, workOrders, availableActions |
| PUT | `/api/complaints/[id]` | Update complaint fields |
| DELETE | `/api/complaints/[id]` | Delete complaint |
| POST | `/api/complaints/[id]/workflow` | Trigger workflow transition |
| GET | `/api/complaints/escalation-rules` | List SLA escalation rules |
| GET | `/api/complaints/escalation-check` | Manually run escalation check |

### Workflow Transition Request (POST `/api/complaints/[id]/workflow`)
```json
{
  "targetStatus": "ASSIGNED",
  "assignedToId": "user_xxx",
  "supervisorId": "user_yyy",
  "isAdminOverride": false
}
```

## Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| `ComplaintList` | `components/modules/complaints/complaint-list.tsx` | Table view with filters |
| `ComplaintDetail` | `components/modules/complaints/complaint-detail.tsx` | Full detail with timeline + action buttons |
| `NewComplaint` | `components/modules/complaints/new-complaint.tsx` | Create form |

## Complaint Timeline (`ComplaintTimeline` model)
Every status change creates a timeline entry with:
- `action` — e.g. "assigned", "accepted", "work_started"
- `fromStatus` / `toStatus`
- `performedBy` (userId) / `performedByRole`
- `description` — human-readable
- `metadata` — JSON (e.g., technician name, ETA)

## Complaint Sources
- `portal` — Customer submits via web portal
- `whatsapp` — Created via WhatsApp bot conversation
- `admin` — Created by admin/manager manually
- `qr_scan` — Created by scanning equipment QR code
- `mobile_app` — Created via mobile app (future)

## Available Actions (UI)
The `getAvailableActions(currentStatus, userRole)` function returns which action buttons a user can see for a given complaint state. Each action includes: label, icon, color, targetStatus, requiredFields, and description.

## Complaint Stats (computed)
- Open complaints count (status in NEW, ASSIGNED, ACCEPTED, etc.)
- In-progress count
- Overdue count (based on escalation rules)
- Average resolution time
- By category, by priority breakdowns
