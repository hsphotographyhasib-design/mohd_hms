# Work Orders Module

> Auto-generated from codebase scan.

## Overview

Work order management for maintenance tasks. Created automatically from accepted complaints or manually. Tracks labor, materials, costs, checklists, and signatures.

## Files

| File | Purpose |
|------|---------|
| `src/components/modules/work-orders/work-order-list.tsx` | List view with status filters, priority, assignment |
| `src/components/modules/work-orders/work-order-detail.tsx` | Detail view with materials, checklist, signatures, cost summary |
| `src/app/api/work-orders/route.ts` | GET (list), POST (create) |
| `src/app/api/work-orders/[id]/route.ts` | GET (detail), PUT (update) |

## Work Order Statuses

| Status | Description |
|--------|-------------|
| PENDING | Awaiting start |
| IN_PROGRESS | Work in progress |
| COMPLETED | Work finished |
| READONLY | Locked for viewing only |
| CANCELLED | Cancelled |

## Work Order Types

| Type | Description |
|------|-------------|
| corrective | Fixing a breakdown/fault |
| preventive | Scheduled maintenance |
| emergency | Urgent/critical repair |

## Key Fields

### Core:
- `title`, `description` - What needs to be done
- `complaintId` - Link to originating complaint (nullable for manual WOs)
- `equipmentId` - Equipment being serviced
- `assignedToId` - Technician assigned
- `createdBy` - User who created (admin/manager)

### Scheduling:
- `scheduledDate` - Planned date
- `startedAt`, `completedAt` - Actual timestamps

### GPS Tracking:
- `checkInGps` - JSON: `{lat, lng, timestamp}` when technician arrives
- `checkOutGps` - JSON: `{lat, lng, timestamp}` when technician leaves

### Cost Tracking:
- `laborHours` - Hours worked
- `laborCost` - Labor cost amount
- `materialCost` - Total material cost
- `totalCost` - Grand total (labor + materials)

### Documentation:
- `photos` - JSON array of work-in-progress photos
- `beforePhotos` - JSON array of before-condition photos
- `afterPhotos` - JSON array of after-condition photos
- `videoUrl` - Video recording URL
- `notes` - Free text notes
- `remarks` - Additional remarks
- `checklistData` - JSON: completed checklist items
- `technicianSignature` - Base64 signature
- `customerSignature` - Base64 signature
- `serviceReportPdf` - Generated PDF report URL

### Control:
- `isLocked` - Prevents further editing

## Materials System

Work orders track materials used via `WorkOrderMaterial` model:
- `workOrderId` - FK to WorkOrder
- `inventoryItemId` - FK to InventoryItem
- `quantity` - Quantity used
- `unitCost` - Cost per unit
- `totalCost` - quantity × unitCost

## Auto-Creation from Complaints

When a complaint transitions ACCEPTED → WORK_ORDER_CREATED:
```ts
await db.workOrder.create({
  data: {
    tenantId, complaintId: complaint.id, equipmentId: complaint.equipmentId,
    title: `WO: ${complaint.title}`,
    description: complaint.description,
    status: 'PENDING',
    priority: complaint.priority,
    type: 'corrective',
    assignedToId: complaint.assignedToId,
    createdBy: complaint.assignedToId,
  }
});
```

## Checklist Templates

Pre-defined checklists per equipment category:
- Stored in `ChecklistTemplate` model
- `items` field: JSON array of checklist items
- `isDefault`: Whether this is the default for the category
- Can be attached to PmSchedule or used in WorkOrders

## Invoice Linkage

Work orders can generate invoices:
- `Invoice.workOrderId` links invoice to work order
- Cost data from WO (labor + materials) populates invoice
- Created automatically via complaint workflow (CLIENT_CONFIRMED → DRAFT_INVOICE)

## Permissions

| Action | Roles |
|--------|-------|
| View | super_admin, admin, manager, supervisor, technician |
| Create | super_admin, admin, manager |
| Update | super_admin, admin, manager, supervisor, technician (assigned) |
| Lock | super_admin, admin |

## Type Definition

```ts
interface WorkOrderItem {
  id, tenantId, complaintId?, equipmentId?, equipmentName?,
  title, description, status, priority, type,
  assignedToId?, assignedToName?, createdBy?, creatorName?,
  scheduledDate?, startedAt?, completedAt?,
  laborHours?, laborCost?, materialCost?, totalCost?,
  notes?, photos?, checklistData?,
  technicianSignature?, customerSignature?,
  createdAt, updatedAt,
  materials?: WorkOrderMaterialItem[]
}
```