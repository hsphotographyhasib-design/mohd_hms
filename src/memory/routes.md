# FacilityPro — API Routes

## Base URL
All API routes are under `/api/` in the Next.js App Router pattern.

## Authentication
All routes (except auth endpoints) require `Authorization: Bearer <jwt_token>` header. Token is verified via `verifyToken()` from `@/lib/auth`. Extracts `tenantId`, `userId`, and `role` from the JWT payload.

## Standard Query Parameters (list endpoints)
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Items per page |
| `search` | string | — | Full-text search |
| `status` | string | — | Filter by status |
| `customerId` | string | — | Filter by customer |
| `category` | string | — | Filter by category |
| `priority` | string | — | Filter by priority |

## Standard Response (paginated)
```json
{ "data": [], "total": 0, "page": 1, "pageSize": 20, "totalPages": 1 }
```

---

## Auth Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (email + password) → JWT |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/profile` | Update profile |

## Complaint Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/complaints` | List complaints (paginated) |
| POST | `/api/complaints` | Create complaint |
| GET | `/api/complaints/[id]` | Get complaint with timeline + actions |
| PUT | `/api/complaints/[id]` | Update complaint |
| DELETE | `/api/complaints/[id]` | Delete complaint |
| POST | `/api/complaints/[id]/workflow` | Trigger workflow transition |
| GET | `/api/complaints/escalation-rules` | List escalation rules |
| GET | `/api/complaints/escalation-check` | Run escalation check |

## Equipment Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/equipment` | List equipment (paginated) |
| POST | `/api/equipment` | Create equipment |
| GET | `/api/equipment/[id]` | Get single equipment |
| PUT | `/api/equipment/[id]` | Update equipment |
| DELETE | `/api/equipment/[id]` | Delete equipment |
| GET | `/api/equipment/qr-analytics` | QR scan analytics |
| POST | `/api/equipment/bulk-qr` | Bulk generate QR codes |
| GET | `/api/equipment/qr/[id]` | Get QR by qrId |

## Work Order Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/work-orders` | List work orders |
| POST | `/api/work-orders` | Create work order |
| GET | `/api/work-orders/[id]` | Get single work order |
| PUT | `/api/work-orders/[id]` | Update work order |
| DELETE | `/api/work-orders/[id]` | Delete work order |

## Invoice Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/invoices/[id]` | Get single invoice |
| PUT | `/api/invoices/[id]` | Update invoice |
| DELETE | `/api/invoices/[id]` | Delete invoice |

## Quotation Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quotations` | List quotations (supports `?stats=true`) |
| POST | `/api/quotations` | Create quotation |
| GET | `/api/quotations/[id]` | Get single quotation |
| PUT | `/api/quotations/[id]` | Update quotation |
| DELETE | `/api/quotations/[id]` | Delete quotation |
| POST | `/api/quotations/create` | Create with full payload |
| GET | `/api/quotations/next-number` | Generate next quotation number |
| PUT | `/api/quotations/[id]/status` | Update quotation status |
| GET | `/api/quotations/item-suggestions` | Search items for line items |

## Inventory Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory` | List inventory (supports `?lowStock=true`) |
| POST | `/api/inventory` | Create item |
| GET | `/api/inventory/[id]` | Get single item |
| PUT | `/api/inventory/[id]` | Update item |
| DELETE | `/api/inventory/[id]` | Delete item |

## Customer Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/[id]` | Get single customer |
| PUT | `/api/customers/[id]` | Update customer |
| DELETE | `/api/customers/[id]` | Delete customer |

## Employee Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/[id]` | Get single employee |
| PUT | `/api/employees/[id]` | Update employee |
| DELETE | `/api/employees/[id]` | Delete employee |

## Vehicle Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vehicles` | List vehicles |
| POST | `/api/vehicles` | Create vehicle |
| GET | `/api/vehicles/[id]` | Get vehicle |
| PUT | `/api/vehicles/[id]` | Update vehicle |
| DELETE | `/api/vehicles/[id]` | Delete vehicle |

## Purchase Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/purchases` | List purchase orders |
| POST | `/api/purchases` | Create purchase order |

## PM Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pm` | List PM schedules |
| POST | `/api/pm` | Create PM schedule |
| GET | `/api/pm/[id]` | Get single PM schedule |
| PUT | `/api/pm/[id]` | Update PM schedule |

## Dashboard & Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Dashboard statistics |
| GET | `/api/reports` | Report data |
| GET | `/api/finance` | Finance data |

## Notification Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List notifications (admin sees all, others see own) |
| PUT | `/api/notifications` | Update notification (mark read) |
| POST | `/api/notifications` | Create notification |

## QR Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/qr/scan` | Record a QR scan |
| GET | `/api/qr/lookup/[qrId]` | Lookup equipment by qrId |
| POST | `/api/qr/service-request` | Create service request from QR |

## WhatsApp Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/whatsapp` | WhatsApp dashboard stats |
| POST | `/api/whatsapp/send` | Send message |
| GET | `/api/whatsapp/connection` | Get connection status |
| POST | `/api/whatsapp/connection` | Connect/disconnect |
| GET | `/api/whatsapp/config` | Get WhatsApp config |
| PUT | `/api/whatsapp/config` | Update WhatsApp config |
| GET/POST | `/api/whatsapp/sessions` | List/create sessions |
| GET/PUT | `/api/whatsapp/sessions/[id]` | Get/update session |
| GET/POST | `/api/whatsapp/sessions/[id]/messages` | List/send messages in session |
| GET/POST | `/api/whatsapp/threads` | List/create threads |
| GET/PUT | `/api/whatsapp/threads/[id]` | Get/update thread |
| GET/POST | `/api/whatsapp/templates` | List/create templates |
| GET/PUT/DELETE | `/api/whatsapp/templates/[id]` | CRUD template |
| GET/POST | `/api/whatsapp/campaigns` | List/create campaigns |
| GET/PUT | `/api/whatsapp/campaigns/[id]` | Get/update campaign |
| GET | `/api/whatsapp/reports` | WhatsApp reports |
| POST | `/api/whatsapp/webhook` | Incoming webhook |
| POST | `/api/whatsapp/seed-templates` | Seed default templates |
| POST | `/api/whatsapp/feedback` | Submit feedback |

## CMS Routes (18 sub-resources)

All CMS routes follow pattern: `GET/POST /api/cms/{resource}` and `GET/PUT/DELETE /api/cms/{resource}/[id]`

| Resource | Sub-paths |
|----------|-----------|
| hero | hero, hero/[id] |
| services | services, services/[id] |
| projects | projects, projects/[id] |
| blogs | blogs, blogs/[id], blogs/categories, blogs/categories/[id] |
| industries | industries, industries/[id] |
| testimonials | testimonials, testimonials/[id] |
| careers | careers, careers/[id], careers/[id]/applications |
| contact | contact, contact/[id] |
| media | media, media/[id] |
| seo | seo, seo/[pagePath] |
| footer | footer |
| announcements | announcements, announcements/[id] |
| popups | popups, popups/[id] |
| forms | forms, forms/[id] |
| activity | activity |
| settings | settings |
| dashboard | dashboard |
| analytics | analytics |
| about | about |
| seed-landing | seed-landing |
| public/landing | public/landing |

## Seed & Utility

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/seed` | Seed database with demo data |
| GET | `/api` | API health check |
