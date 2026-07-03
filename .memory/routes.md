# API Routes

> Auto-generated from codebase scan. 105 route files. All routes under src/app/api/.

## Route Convention

- **Auth routes**: JWT Bearer token in `Authorization` header
- **Tenant isolation**: Every authenticated route filters by `payload.tenantId`
- **Public routes**: QR lookup, QR scan, QR service request
- **Gateway**: Mini-service routes use `?XTransformPort=XXXX` query param

---

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login with email+password, returns JWT |
| POST | `/api/auth/register` | No | Register new user |
| GET | `/api/auth/me` | Yes | Get current user info |
| GET | `/api/auth/profile` | Yes | Get user profile |

## Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Yes | Dashboard stats (equipment, complaints, WO, revenue, PM) |

## Equipment

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/equipment` | Yes | List equipment (with filters: category, status, search, customerId) |
| POST | `/api/equipment` | Yes | Create equipment |
| GET | `/api/equipment/[id]` | Yes | Get equipment detail |
| PUT | `/api/equipment/[id]` | Yes | Update equipment |
| DELETE | `/api/equipment/[id]` | Yes | Delete equipment |
| GET | `/api/equipment/qr/[id]` | Yes | Get QR code for equipment |
| POST | `/api/equipment/qr/[id]` | Yes | Regenerate QR code |
| GET | `/api/equipment/qr-analytics` | Yes | QR scan analytics with period filtering |
| POST | `/api/equipment/bulk-qr` | Yes | Batch QR generation |

## QR (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/qr/lookup/[qrId]` | No | Public: Lookup equipment by QR ID |
| POST | `/api/qr/scan` | No | Public: Log scan event |
| POST | `/api/qr/service-request` | No | Public: Submit service request from QR page |

## Complaints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/complaints` | Yes | List complaints (filters: status, priority, assignedToId, search) |
| POST | `/api/complaints` | Yes | Create complaint |
| GET | `/api/complaints/[id]` | Yes | Get complaint detail (with timeline, available actions) |
| PUT | `/api/complaints/[id]` | Yes | Update complaint |
| DELETE | `/api/complaints/[id]` | Yes | Delete complaint |
| POST | `/api/complaints/[id]/workflow` | Yes | Execute workflow transition |
| GET | `/api/complaints/escalation-rules` | Yes | List escalation rules |
| GET | `/api/complaints/escalation-check` | Yes | Run escalation check for tenant |

## Work Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/work-orders` | Yes | List work orders |
| POST | `/api/work-orders` | Yes | Create work order |
| GET | `/api/work-orders/[id]` | Yes | Get work order detail |
| PUT | `/api/work-orders/[id]` | Yes | Update work order |

## Invoices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/invoices` | Yes | List invoices (filters: status, search) |
| POST | `/api/invoices` | Yes | Create invoice |
| GET | `/api/invoices/[id]` | Yes | Get invoice detail |

## Quotations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/quotations` | Yes | List quotations (filters: status, search) |
| POST | `/api/quotations` | Yes | Create quotation |
| POST | `/api/quotations/create` | Yes | Create quotation (alternate) |
| GET | `/api/quotations/[id]` | Yes | Get quotation detail |
| PUT | `/api/quotations/[id]` | Yes | Update quotation |
| PATCH | `/api/quotations/[id]/status` | Yes | Update quotation status |
| GET | `/api/quotations/next-number` | Yes | Generate next quotation number |
| GET | `/api/quotations/item-suggestions` | Yes | Search items from inventory + past quotations |
| POST | `/api/quotations/[id]/convert-wo` | Yes | Convert quotation to work order |
| POST | `/api/quotations/[id]/convert-invoice` | Yes | Convert quotation to invoice |

## PM Schedules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/pm` | Yes | List PM schedules |
| POST | `/api/pm` | Yes | Create PM schedule |
| GET | `/api/pm/[id]` | Yes | Get PM schedule detail |
| PUT | `/api/pm/[id]` | Yes | Update PM schedule |

## Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/inventory` | Yes | List inventory items (filters: category, search, lowStock) |
| POST | `/api/inventory` | Yes | Create inventory item |
| GET | `/api/inventory/[id]` | Yes | Get inventory item |
| PUT | `/api/inventory/[id]` | Yes | Update inventory item |

## Customers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/customers` | Yes | List customers (filters: search, isActive) |
| POST | `/api/customers` | Yes | Create customer |
| GET | `/api/customers/[id]` | Yes | Get customer detail |
| PUT | `/api/customers/[id]` | Yes | Update customer |

## Employees

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/employees` | Yes | List employees |
| POST | `/api/employees` | Yes | Create employee |
| GET | `/api/employees/[id]` | Yes | Get employee detail |
| PUT | `/api/employees/[id]` | Yes | Update employee |

## Purchases

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/purchases` | Yes | List purchase orders |
| POST | `/api/purchases` | Yes | Create purchase order |

## Vehicles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vehicles` | Yes | List vehicles |
| POST | `/api/vehicles` | Yes | Create vehicle |
| GET | `/api/vehicles/[id]` | Yes | Get vehicle detail |
| PUT | `/api/vehicles/[id]` | Yes | Update vehicle |

## Finance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/finance` | Yes | Financial overview (revenue, expenses, aging) |

## Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reports` | Yes | Generate reports (various types) |

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications for user |
| PATCH | `/api/notifications` | Yes | Mark notifications as read |

## Seed

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/seed` | No | Seed demo data |

## Documents (DMS)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/documents/upload` | Yes | Initiate chunked upload session |
| POST | `/api/documents/upload/chunk` | Yes | Upload a chunk |
| POST | `/api/documents/upload/complete` | Yes | Complete upload session |
| GET | `/api/documents/upload/[sessionId]` | Yes | Get upload session status |
| DELETE | `/api/documents/upload/[sessionId]` | Yes | Cancel upload session |
| POST | `/api/documents/upload/[sessionId]/pause` | Yes | Pause upload |
| POST | `/api/documents/upload/[sessionId]/resume` | Yes | Resume paused upload |
| GET | `/api/documents` | Yes | List documents (filters: module, referenceId, search, status, pagination) |
| GET | `/api/documents/[id]` | Yes | Get document detail (with versions + audit logs) |
| PATCH | `/api/documents/[id]` | Yes | Update document (rename, folder, tags, archive) |
| DELETE | `/api/documents/[id]` | Yes | Soft delete document |
| GET | `/api/documents/[id]/download` | Yes | Download document file |
| GET | `/api/documents/[id]/versions` | Yes | List all versions |
| POST | `/api/documents/[id]/versions` | Yes | Upload new version |
| POST | `/api/documents/[id]/versions/[versionId]/restore` | Yes | Restore specific version |
| GET | `/api/documents/audit` | Yes | List audit logs (filters: documentId, action, performedBy, dateRange) |
| POST | `/api/documents/duplicates` | Yes | Check for duplicate files by checksum |

## WhatsApp (via mini-service on :3003)

| Method | Path + XTransformPort | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/whatsapp?XTransformPort=3003` | Yes | Dashboard stats |
| GET | `/api/whatsapp/connection?XTransformPort=3003` | Yes | Connection status |
| POST | `/api/whatsapp/connection?XTransformPort=3003` | Yes | Connect/disconnect |
| GET | `/api/whatsapp/config?XTransformPort=3003` | Yes | Get config |
| PUT | `/api/whatsapp/config?XTransformPort=3003` | Yes | Update config |
| POST | `/api/whatsapp/send?XTransformPort=3003` | Yes | Send message |
| GET | `/api/whatsapp/templates?XTransformPort=3003` | Yes | List templates |
| POST | `/api/whatsapp/templates?XTransformPort=3003` | Yes | Create template |
| GET | `/api/whatsapp/templates/[id]?XTransformPort=3003` | Yes | Get template |
| PUT | `/api/whatsapp/templates/[id]?XTransformPort=3003` | Yes | Update template |
| DELETE | `/api/whatsapp/templates/[id]?XTransformPort=3003` | Yes | Delete template |
| GET | `/api/whatsapp/threads?XTransformPort=3003` | Yes | List threads |
| GET | `/api/whatsapp/threads/[id]?XTransformPort=3003` | Yes | Get thread |
| GET | `/api/whatsapp/threads/[id]/messages?XTransformPort=3003` | Yes | Get thread messages |
| POST | `/api/whatsapp/campaigns?XTransformPort=3003` | Yes | Create campaign |
| GET | `/api/whatsapp/campaigns?XTransformPort=3003` | Yes | List campaigns |
| GET | `/api/whatsapp/campaigns/[id]?XTransformPort=3003` | Yes | Get campaign |
| GET | `/api/whatsapp/reports?XTransformPort=3003` | Yes | Analytics reports |
| GET | `/api/whatsapp/sessions?XTransformPort=3003` | Yes | List sessions |
| GET | `/api/whatsapp/sessions/[id]?XTransformPort=3003` | Yes | Get session |
| POST | `/api/whatsapp/feedback?XTransformPort=3003` | Yes | Submit feedback |
| GET | `/api/whatsapp/seed-templates?XTransformPort=3003` | Yes | Seed default templates |
| POST | `/api/whatsapp/webhook?XTransformPort=3003` | No | Webhook receiver |

## CMS (Public Website)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cms/public/landing` | No | Public landing page data |
| GET | `/api/cms/dashboard` | Yes | CMS dashboard analytics |
| CRUD | `/api/cms/hero[/id]` | Yes | Hero section |
| CRUD | `/api/cms/about` | Yes | About page |
| CRUD | `/api/cms/services[/id]` | Yes | Services |
| CRUD | `/api/cms/industries[/id]` | Yes | Industries |
| CRUD | `/api/cms/projects[/id]` | Yes | Projects |
| CRUD | `/api/cms/blogs[/id]` | Yes | Blog posts |
| GET | `/api/cms/blogs/categories[/id]` | Yes | Blog categories |
| CRUD | `/api/cms/testimonials[/id]` | Yes | Testimonials |
| CRUD | `/api/cms/careers[/id]` | Yes | Job listings |
| GET | `/api/cms/careers/[id]/applications` | Yes | Job applications |
| CRUD | `/api/cms/contact[/id]` | Yes | Contact form submissions |
| CRUD | `/api/cms/media[/id]` | Yes | Media library |
| CRUD | `/api/cms/seo[/pagePath]` | Yes | SEO per page |
| - | - | - | Header is part of Landing Page (cms-hero + layout) |
| CRUD | `/api/cms/footer` | Yes | Website footer |
| CRUD | `/api/cms/announcements[/id]` | Yes | Announcements |
| CRUD | `/api/cms/popups[/id]` | Yes | Popups |
| CRUD | `/api/cms/forms[/id]` | Yes | Form builder |
| GET | `/api/cms/activity` | Yes | Activity log |
| GET | `/api/cms/analytics` | Yes | CMS analytics |
| GET | `/api/cms/seed-landing` | Yes | Seed landing page data |
| GET | `/api/cms/settings` | Yes | CMS settings |

> Note: There is also a catch-all route at /api/route.ts.