# FacilityPro — Database Schema

## Overview
- **Database**: SQLite (via Prisma ORM)
- **Provider**: `prisma-client-js`
- **Multi-tenancy**: All business data is scoped by `tenantId`

## All Models (30 total)

### Core Models

| # | Model | Purpose | Key Fields |
|---|-------|---------|------------|
| 1 | `Tenant` | Multi-tenant root | id, name, domain (unique), plan, maxUsers |
| 2 | `User` | System users | email (unique per tenant), role, departmentId, passwordHash |
| 3 | `Department` | Organizational units | name, headId, tenantId |

### Business Models

| # | Model | Purpose | Key Fields |
|---|-------|---------|------------|
| 4 | `Customer` | Client companies | customerNumber (unique), phone, isWhatsappVerified, whatsappPhone |
| 5 | `Equipment` | Tracked assets | assetNumber (unique), qrCode (unique), qrId (unique), category, status, condition |
| 6 | `EquipmentQrCode` | QR code registry | qrId (unique, e.g. QR-GEN-NFYH3RZAA), qrUrl, version |
| 7 | `ScanLog` | QR scan tracking | qrId, scannedBy, device, ipAddress |
| 8 | `Complaint` | Service complaints | status (13 states), priority, source, assignedToId, supervisorId |
| 9 | `WorkOrder` | Work tasks | status, type, assignedToId, scheduledDate, GPS fields |
| 10 | `WorkOrderMaterial` | Materials used on WO | inventoryItemId, quantity, unitCost |
| 11 | `ChecklistTemplate` | PM checklists | category, items (JSON) |
| 12 | `PmSchedule` | Preventive maintenance | frequency, nextDueDate, equipmentId |
| 13 | `Quotation` | Price quotes | quotationNo, status (11 states), items (JSON), totals |
| 14 | `Invoice` | Billing | invoiceNumber (unique), status, totals, payment fields |
| 15 | `InventoryItem` | Stock items | sku, quantity, minStock, unitCost |
| 16 | `PurchaseOrder` | Procurement | poNumber (unique), supplier, status |
| 17 | `Vehicle` | Fleet vehicles | plateNumber, vin, status, mileage |
| 18 | `VehicleLog` | Vehicle records | type (fuel/maintenance/repair), odometer, cost |

### Workflow & Tracking Models

| # | Model | Purpose | Key Fields |
|---|-------|---------|------------|
| 19 | `ComplaintTimeline` | Complaint audit trail | action, fromStatus, toStatus, performedBy, metadata |
| 20 | `Notification` | In-app notifications | userId, type, isRead, relatedEntityType/Id |
| 21 | `AuditLog` | System audit trail | userId, action, entity, oldValue/newValue (JSON) |

### HR Models

| # | Model | Purpose | Key Fields |
|---|-------|---------|------------|
| 22 | `LeaveRequest` | Employee leave | type, startDate, endDate, status |
| 23 | `Attendance` | Daily attendance | date, checkIn/checkOut, GPS, hoursWorked |

### CMS Models (18)

| # | Model | Purpose |
|---|-------|---------|
| 24 | `CmsSetting` | Global settings (JSON key-value) |
| 25 | `CmsHero` | Hero section content |
| 26 | `CmsService` | Services listing (slug unique per tenant) |
| 27 | `CmsIndustry` | Industries served |
| 28 | `CmsProject` | Portfolio projects (slug unique per tenant) |
| 29 | `CmsBlogCategory` | Blog categories |
| 30 | `CmsBlog` | Blog posts (slug unique per tenant) |
| 31 | `CmsTestimonial` | Customer testimonials |
| 32 | `CmsCareerJob` | Job postings |
| 33 | `CmsCareerApplication` | Job applications |
| 34 | `CmsContactMessage` | Contact form submissions |
| 35 | `CmsMedia` | Media library |
| 36 | `CmsSeo` | SEO per page (pagePath unique per tenant) |
| 37 | `CmsFooter` | Footer settings |
| 38 | `CmsAnnouncement` | Announcement bar |
| 39 | `CmsPopup` | Popup management |
| 40 | `CmsForm` | Form builder |
| 41 | `CmsActivityLog` | CMS audit log |

### WhatsApp Models (7)

| # | Model | Purpose | Key Fields |
|---|-------|---------|------------|
| 42 | `WhatsAppConfig` | Provider settings | provider (openwa/meta/twilio), isEnabled (unique per tenant) |
| 43 | `WhatsAppSession` | Conversation sessions | phoneNumber, state (16 states), stateData |
| 44 | `WhatsAppMessage` | All messages | direction, messageType, content, isFromBot |
| 45 | `ConversationThread` | Grouped conversations | subject, status, assignedToId |
| 46 | `WhatsAppTemplate` | Message templates | category, content with {{variables}} |
| 47 | `CustomerFeedback` | WhatsApp feedback | rating (1-5), source |
| 48 | `CustomerReport` | Escalations/reports | type, status (OPEN/IN_REVIEW/RESOLVED/DISMISSED) |
| 49 | `BroadcastLog` | Mass campaigns | status, sent/failed/delivered counts |
| 50 | `WhatsAppDeliveryLog` | Per-message delivery | messageId, direction, status |

## Key Relationships

```
Tenant ──1:N──→ User, Customer, Equipment, Complaint, WorkOrder, Invoice, Quotation, etc.
Customer ──1:N──→ Equipment, Complaint, Invoice, Quotation, WhatsAppSession
Equipment ──1:N──→ Complaint, WorkOrder, PmSchedule, ScanLog
Complaint ──1:1──→ assignedTo (User), supervisor (User)
Complaint ──1:N──→ WorkOrder, ComplaintTimeline, Notification
WorkOrder ──N:1──→ Complaint, Equipment, assignedTo (User)
Quotation ──1:N──→ Invoice
WhatsAppSession ──1:N──→ WhatsAppMessage, ConversationThread
WhatsAppConfig ──1:N──→ WhatsAppSession
```

## Notable Patterns
- **JSON fields**: `items`, `terms`, `photos`, `specifications`, `metadata`, `materialsUsed`, `checklistData`, `stateData` — stored as JSON strings, parsed with `parseJsonSafe()` helper
- **ID generation**: Uses `cuid()` for all primary keys
- **Timestamps**: All models have `createdAt` and `updatedAt`
- **Indexes**: Composite indexes on `[tenantId, status]`, `[tenantId, assignedToId]`, etc.
- **Currency**: Default BND (Brunei Dollar)
