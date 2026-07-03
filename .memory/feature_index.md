# Feature Index

> Quick lookup for all application features.

## Core Modules

| Feature | View Name | List Component | Detail Component | API Base |
|---------|-----------|----------------|-----------------|----------|
| Dashboard | `dashboard` | DashboardView | - | `/api/dashboard` |
| Equipment | `equipment` | EquipmentList | EquipmentDetail | `/api/equipment` |
| Complaints | `complaints` | ComplaintList | ComplaintDetail | `/api/complaints` |
| New Complaint | `new-complaint` | NewComplaint | - | `/api/complaints` |
| Work Orders | `work-orders` | WorkOrderList | WorkOrderDetail | `/api/work-orders` |
| Invoices | `invoices` | InvoiceList | InvoiceDetail | `/api/invoices` |
| PM Schedules | `pm` | PmList | - | `/api/pm` |
| Quotations | `quotations` | QuotationList | QuotationDetail | `/api/quotations` |
| New Quotation | `new-quotation` | QuotationForm | - | `/api/quotations` |
| Edit Quotation | `quotation-edit` | QuotationForm | - | `/api/quotations/[id]` |
| Inventory | `inventory` | InventoryList | - | `/api/inventory` |
| Customers | `customers` | CustomerList | - | `/api/customers` |
| Employees | `employees` | EmployeeList | - | `/api/employees` |
| Purchases | `purchases` | PurchaseList | - | `/api/purchases` |
| Vehicles | `vehicles` | VehicleList | - | `/api/vehicles` |
| Finance | `finance` | FinanceView | - | `/api/finance` |
| Reports | `reports` | ReportView | - | `/api/reports` |
| Documents | `documents` | DocumentList | DocumentDetail | `/api/documents` |
| Notifications | `notifications` | NotificationList | - | `/api/notifications` |
| Settings | `settings` | SettingsView | - | - |

## CMS Modules (Website Management)

| Feature | View Name | Component |
|---------|-----------|-----------|
| CMS Dashboard | `cms-dashboard` | CmsDashboard |
| Hero Section | `cms-hero` | CmsHero |
| About Us | `cms-about` | CmsAbout |
| Services | `cms-services` | CmsServices |
| Industries | `cms-industries` | CmsIndustries |
| Projects | `cms-projects` | CmsProjects |
| Blog | `cms-blogs` | CmsBlogs |
| Testimonials | `cms-testimonials` | CmsTestimonials |
| Careers | `cms-careers` | CmsCareers |
| Contact Inbox | `cms-contact` | CmsContact |
| Media Library | `cms-media` | CmsMedia |
| SEO | `cms-seo` | CmsSeo |
| Header | `cms-header` | CmsHeader |
| Footer | `cms-footer` | CmsFooter |
| Announcements | `cms-announcements` | CmsAnnouncements |
| Popups | `cms-popups` | CmsPopups |
| Form Builder | `cms-forms` | CmsForms |
| Activity Log | `cms-activity` | CmsActivity |

## WhatsApp Modules

| Feature | View Name | Component |
|---------|-----------|-----------|
| WhatsApp Dashboard | `whatsapp` | WhatsAppDashboard |
| Chats | `whatsapp-chats` | WhatsAppChats |
| Templates | `whatsapp-templates` | WhatsAppTemplates |
| Campaigns | `whatsapp-campaigns` | WhatsAppCampaigns |
| Settings | `whatsapp-settings` | WhatsAppSettings |

## Public Pages

| Page | Path | Description |
|------|------|-------------|
| Equipment QR | `/equipment/[qrId]` | Public equipment info page |

## Business Logic Libraries

| Library | Path | Purpose |
|---------|------|---------|
| Auth Utils | `src/lib/auth.ts` | Password hashing, JWT, number generators, sanitization |
| QR Utils | `src/lib/qr-utils.ts` | QR ID generation, validation, device parsing |
| Label Templates | `src/lib/label-templates.ts` | 10 label templates in 5 sizes |
| Label PDF | `src/lib/label-pdf.ts` | A4 PDF label generation |
| Storage Provider | `src/lib/storage/provider.ts` | File system abstraction with chunk support |
| Number to Words | `src/lib/number-to-words.ts` | BND currency words conversion |
| Quotation Helpers | `src/lib/quotation-helpers.ts` | Quotation-specific utilities |
| State Machine | `src/lib/workflow/state-machine.ts` | Complaint workflow validation |
| Notification Engine | `src/lib/workflow/notification-engine.ts` | Workflow notification creation |
| Escalation Rules | `src/lib/workflow/escalation-rules.ts` | SLA escalation detection |
| WhatsApp Provider | `src/lib/whatsapp/provider.ts` | WhatsApp API abstraction |
| WhatsApp Manager | `src/lib/whatsapp/manager.ts` | Connection/session management |
| Conversation Engine | `src/lib/whatsapp/conversation-engine.ts` | WhatsApp chat state machine |
| Workflow Engine | `src/lib/whatsapp/workflow-engine.ts` | WhatsApp → complaint bridge |

## Hooks

| Hook | Path | Purpose |
|------|------|---------|
| useSecureFetch | `src/hooks/use-secure-fetch.ts` | Auth-injected fetch with 401 handling |
| useMobile | `src/hooks/use-mobile.ts` | Mobile detection |
| useToast | `src/hooks/use-toast.ts` | Toast notification hook |

## Session Management

| Component | Path | Purpose |
|-----------|------|---------|
| SessionProvider | `src/components/session/session-provider.tsx` | Auth init, fetch interceptor, idle timer |
| AuthGuard | `src/components/session/auth-guard.tsx` | Route protection |
| IdleTimer | `src/components/session/idle-timer.tsx` | Auto-logout on inactivity |
| LogoutModal | `src/components/session/logout-modal.tsx` | Logout warning dialog |
| BroadcastLogout | `src/components/session/broadcast-logout.tsx` | Cross-tab logout |
| SessionHeartbeat | `src/components/session/session-heartbeat.tsx` | Keep-alive pings |