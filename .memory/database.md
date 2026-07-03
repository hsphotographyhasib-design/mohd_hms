# Database Schema

> Auto-generated from prisma/schema.prisma. Provider: SQLite. Last updated: 2025-06-22.

## Models Overview (54 models)

### Core Models (8)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **Tenant** | tenants | Multi-tenant root | 12 | 30 | 0 | 1 (domain) |
| **User** | users | System users | 18 | 10 | 1 | 0 |
| **Department** | departments | Org departments | 8 | 2 | 0 | 0 |
| **Customer** | customers | Clients | 24 | 8 | 0 | 1 (customerNumber) |
| **Equipment** | equipment | Assets | 28 | 7 | 0 | 3 (assetNumber, qrCode, qrId) |
| **EquipmentQrCode** | equipmentQrCodes | QR code records | 9 | 2 | 0 | 2 (equipmentId, qrId) |
| **ScanLog** | scanLogs | QR scan tracking | 13 | 2 | 3 | 0 |
| **LeaveRequest** | leaveRequests | Employee leave | 13 | 0 | 0 | 0 |

### Workflow Models (7)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **Complaint** | complaints | Service requests | 34 | 7 | 2 | 0 |
| **ComplaintTimeline** | complaintTimelines | Audit trail | 11 | 2 | 2 | 0 |
| **WorkOrder** | workOrders | Work tasks | 35 | 6 | 2 | 0 |
| **WorkOrderMaterial** | workOrderMaterials | Materials used | 6 | 2 | 0 | 0 |
| **ChecklistTemplate** | checklistTemplates | PM checklists | 9 | 1 | 0 | 0 |
| **PmSchedule** | pmSchedules | Preventive maintenance | 14 | 3 | 0 | 0 |
| **Attendance** | attendances | Employee attendance | 13 | 0 | 1 | 0 |

### Financial Models (4)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **Quotation** | quotations | Price quotes | 32 | 3 | 0 | 0 |
| **Invoice** | invoices | Billing | 42 | 6 | 1 | 1 (invoiceNumber) |
| **InventoryItem** | inventoryItems | Stock items | 16 | 2 | 0 | 0 |
| **PurchaseOrder** | purchaseOrders | Procurement | 15 | 1 | 0 | 1 (poNumber) |

### Fleet Models (2)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **Vehicle** | vehicles | Company vehicles | 13 | 1 | 0 | 0 |
| **VehicleLog** | vehicleLogs | Vehicle activity | 11 | 2 | 0 | 0 |

### System Models (2)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **Notification** | notifications | User notifications | 12 | 2 | 0 | 0 |
| **AuditLog** | auditLogs | System audit trail | 13 | 2 | 3 | 0 |

### CMS Models (18)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **CmsSetting** | cmsSettings | Global settings (JSON blobs) | 7 | 0 | 2 | 1 (tenantId+key) |
| **CmsHero** | cmsHeroes | Hero section content | 24 | 0 | 1 | 0 |
| **CmsService** | cmsServices | Services listing | 15 | 0 | 2 | 1 (tenantId+slug) |
| **CmsIndustry** | cmsIndustries | Industries served | 10 | 0 | 1 | 0 |
| **CmsProject** | cmsProjects | Portfolio projects | 20 | 0 | 2 | 1 (tenantId+slug) |
| **CmsBlogCategory** | cmsBlogCategories | Blog categories | 7 | 1 | 2 | 1 (tenantId+slug) |
| **CmsBlog** | cmsBlogs | Blog posts | 19 | 1 | 2 | 1 (tenantId+slug) |
| **CmsTestimonial** | cmsTestimonials | Customer testimonials | 11 | 0 | 1 | 0 |
| **CmsCareerJob** | cmsCareerJobs | Job listings | 13 | 1 | 1 | 0 |
| **CmsCareerApplication** | cmsCareerApplications | Job applications | 10 | 1 | 1 | 0 |
| **CmsContactMessage** | cmsContactMessages | Contact form submissions | 14 | 0 | 1 | 0 |
| **CmsMedia** | cmsMedias | Media library | 15 | 0 | 1 | 0 |
| **CmsSeo** | cmsSeos | SEO settings per page | 13 | 0 | 2 | 1 (tenantId+pagePath) |
| **CmsFooter** | cmsFooters | Footer settings | 18 | 0 | 1 | 0 |
| **CmsAnnouncement** | cmsAnnouncements | Announcement bar | 10 | 0 | 1 | 0 |
| **CmsPopup** | cmsPopups | Popup management | 11 | 0 | 1 | 0 |
| **CmsForm** | cmsForms | Form builder | 7 | 0 | 1 | 0 |
| **CmsActivityLog** | cmsActivityLogs | CMS audit log | 7 | 0 | 1 | 0 |

### WhatsApp Models (9)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **WhatsAppConfig** | whatsappConfigs | Provider settings | 27 | 2 | 0 | 1 (tenantId) |
| **WhatsAppSession** | whatsappSessions | Per-customer sessions | 14 | 3 | 3 | 0 |
| **WhatsAppMessage** | whatsappMessages | All messages | 22 | 3 | 4 | 0 |
| **ConversationThread** | conversationThreads | Grouped conversations | 11 | 3 | 3 | 0 |
| **WhatsAppTemplate** | whatsappTemplates | Message templates | 11 | 1 | 2 | 1 (tenantId+name) |
| **CustomerFeedback** | customerFeedbacks | WhatsApp feedback | 8 | 2 | 1 | 0 |
| **CustomerReport** | customerReports | Escalations/reports | 14 | 2 | 1 | 0 |
| **BroadcastLog** | broadcastLogs | Mass message campaigns | 17 | 1 | 1 | 0 |
| **WhatsAppDeliveryLog** | whatsAppDeliveryLogs | Delivery tracking | 7 | 2 | 2 | 0 |

### Document Management Models (4)

| Model | Table | Purpose | Fields | Relations | Indexes | Unique |
|-------|-------|---------|--------|-----------|---------|--------|
| **Document** | documents | File metadata | 20 | 2 | 5 | 0 |
| **DocumentVersion** | documentVersions | File versions | 11 | 1 | 2 | 1 (documentId+version) |
| **UploadSession** | uploadSessions | Chunked upload tracking | 18 | 1 | 3 | 0 |
| **DocumentAuditLog** | documentAuditLogs | Document audit trail | 11 | 2 | 4 | 0 |

---

## Key Enum Values (as string literals in schema comments)

### Complaint Status (13 states)
`NEW` → `ASSIGNED` → `ACCEPTED` → `WORK_ORDER_CREATED` → `IN_PROGRESS` → `WAITING_CLIENT_CONFIRMATION` → `CLIENT_CONFIRMED` → `DRAFT_INVOICE` → `INVOICE_APPROVED` → `INVOICE_SENT` → `PAID` → `CLOSED`
Also: `REWORK_REQUIRED` (can return to `IN_PROGRESS`)

### Work Order Status (5 states)
`PENDING` → `IN_PROGRESS` → `COMPLETED` → `READONLY` | `CANCELLED`

### Quotation Status (11 states)
`DRAFT` → `REVIEW` → `APPROVED` → `SENT` → `ACCEPTED` → `REJECTED` | `EXPIRED` | `CONVERTED_WO` | `CONVERTED_INVOICE` → `PAID` → `CLOSED`

### Invoice Status (6 states)
`DRAFT` → `PENDING` → `APPROVED` → `PAID` | `CANCELLED` | `OVERDUE`

### Equipment Status (7 states)
`active`, `inactive`, `under_maintenance`, `decommissioned`, `critical`, `out_of_service`, `overdue_pm`

### Equipment Condition (4 states)
`good`, `fair`, `poor`, `critical`

### User Roles (7 levels)
`super_admin` (100) > `admin` (90) > `manager` (80) > `supervisor` (70) > `finance` (60) > `technician` (50) > `customer` (10)

### PM Frequency (5)
`monthly`, `quarterly`, `half_yearly`, `yearly`, `custom`

### Document Module (10)
`customers`, `equipment`, `workorders`, `quotations`, `invoices`, `reports`, `inspections`, `photos`, `archive`, `general`

### Upload Session Status (6)
`pending`, `uploading`, `paused`, `completed`, `failed`, `cancelled`

### Document Audit Actions (10)
`upload`, `download`, `delete`, `rename`, `share`, `restore`, `move`, `version_change`, `archive`, `unarchive`

### WhatsApp Session States (15)
`menu`, `new_complaint_desc`, `new_complaint_media`, `new_complaint_equipment`, `service_request_desc`, `status_query`, `invoice_query`, `equipment_list`, `emergency_desc`, `feedback_rating`, `feedback_comment`, `escalation_desc`, `chat`, `appointment_date`, `appointment_time`, `appointment_location`

### WhatsApp Message Types (8)
`text`, `image`, `video`, `audio`, `document`, `location`, `contact`, `sticker`

---

## Key JSON Fields

| Model | Field | Type | Description |
|-------|-------|------|-------------|
| Equipment | photos, documents | array | URLs |
| Equipment | specifications | object | Key-value specs |
| Equipment | gpsLocation | object | `{lat, lng}` |
| Complaint | photos | array | Image URLs |
| Complaint | gpsLocation | object | `{lat, lng}` |
| WorkOrder | photos, beforePhotos, afterPhotos | array | Image URLs |
| WorkOrder | checkInGps, checkOutGps | object | `{lat, lng, timestamp}` |
| WorkOrder | materialsUsed | array | `[{name, qty, unit, cost}]` |
| WorkOrder | checklistData | object | Completed checklist |
| Quotation | items | array | Line items `[{title, desc, unit, qty, rate, amount}]` |
| Quotation | terms | array | Terms & conditions strings |
| Invoice | items | array | Line items |
| Invoice | terms | array | Terms & conditions strings |
| WhatsAppConfig | emergencyNumbers | array | Phone numbers |
| WhatsAppSession | stateData | object | Temp flow data |
| WhatsAppMessage | location | object | `{lat, lng, address}` |
| WhatsAppMessage | metadata | object | Extra data |
| Document | tags | array | String tags |
| UploadSession | uploadedChunks | array | Completed chunk numbers |
| UploadSession | resumeData | object | Resume metadata |
| UploadSession | tags | array | String tags |
| DocumentAuditLog | metadata | object | `{from, to, ip, browser, size, etc.}` |
| CmsForm | fields | object | Form field definitions |
| CmsFooter | menuLinks | object | Footer navigation |
| CmsProject | images, galleryImages | array | Image URLs |
| CmsProject | beforeAfterImages | object | Before/after comparison |
| WhatsAppTemplate | variables | array | Variable names |

---

## Tenant Relations Count

Tenant model has 30 outbound relations to:
User[], Customer[], Equipment[], Complaint[], WorkOrder[], Invoice[], Quotation[], PmSchedule[], InventoryItem[], PurchaseOrder[], Vehicle[], Department[], Notification[], AuditLog[], ChecklistTemplate[], WhatsAppConfig[], WhatsAppSession[], WhatsAppMessage[], ConversationThread[], WhatsAppTemplate[], BroadcastLog[], WhatsAppDeliveryLog[], CustomerFeedback[], CustomerReport[], ComplaintTimeline[], EquipmentQrCode[], ScanLog[], Document[], UploadSession[], DocumentAuditLog[]