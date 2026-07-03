# Roles & Permissions

> Auto-generated from codebase scan.

## User Roles

| Role | Level | Description |
|------|-------|-------------|
| `super_admin` | 100 | Full system access, status override, all modules |
| `admin` | 90 | Full access except some super_admin features |
| `manager` | 80 | Operational management, most modules |
| `supervisor` | 70 | Field supervision, complaints, equipment, work orders |
| `finance` | 60 | Financial operations: invoices, quotations, reports |
| `technician` | 50 | Field work: complaints, equipment, work orders |
| `customer` | 10 | Limited: view own complaints, equipment, invoices |

## Feature Access Matrix (src/store/index.ts - canAccess)

| Feature | super_admin | admin | manager | supervisor | technician | finance | customer |
|---------|:-----------:|:-----:|:-------:|:----------:|:----------:|:-------:|:--------:|
| dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| equipment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| complaints | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| work-orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| invoices | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| pm | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| quotations | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| inventory | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| customers | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| employees | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| purchases | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| vehicles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| finance | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| reports | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| cms | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| whatsapp | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

## Document Permissions (DOCUMENT_PERMISSIONS constant)

| Permission | super_admin | admin | manager | supervisor | technician | finance | customer |
|-----------|:-----------:|:-----:|:-------:|:----------:|:----------:|:-------:|:--------:|
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| download | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| share | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| version_restore | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| folder_create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| archive | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Workflow Role Permissions (complaint state machine)

| Transition | Allowed Roles |
|-----------|---------------|
| NEW → ASSIGNED | super_admin, admin, manager, supervisor |
| ASSIGNED → ACCEPTED | technician |
| ASSIGNED → NEW (reject) | technician |
| ACCEPTED → WORK_ORDER_CREATED | automatic (system) |
| WORK_ORDER_CREATED → IN_PROGRESS | technician |
| IN_PROGRESS → WAITING_CLIENT_CONFIRMATION | technician |
| WAITING → CLIENT_CONFIRMED | customer |
| WAITING → REWORK_REQUIRED | customer |
| REWORK_REQUIRED → IN_PROGRESS | technician |
| CLIENT_CONFIRMED → DRAFT_INVOICE | automatic (system) |
| DRAFT_INVOICE → INVOICE_APPROVED | finance, admin, super_admin |
| INVOICE_APPROVED → INVOICE_SENT | finance, admin, super_admin |
| INVOICE_SENT → PAID | finance, admin, super_admin |
| PAID → CLOSED | admin, super_admin (also automatic) |
| Any → Any (override) | super_admin, admin |

## Quotation Workflow Roles

| Status Transition | Allowed Roles |
|------------------|---------------|
| DRAFT → REVIEW/SENT | admin, manager |
| SENT → ACCEPTED/REJECTED | customer |
| APPROVED → SENT | admin, manager |
| Any → EXPIRED | system (auto) |
| Any → CONVERTED_WO | admin, manager |
| Any → CONVERTED_INVOICE | admin, manager, finance |

## Permission Check Functions

```ts
// Feature-level (sidebar nav)
canAccess(userRole, feature) → boolean

// Role hierarchy (min level required)
hasMinRole(userRole, minRole) → boolean

// Explicit role list
hasPermission(userRole, requiredRoles) → boolean
```

## Sidebar Navigation

### Main Nav Items (always visible for permitted roles):
dashboard, equipment, complaints, work-orders, invoices, pm, quotations, inventory, customers, employees, purchases, vehicles, finance, reports, documents, notifications, settings

### CMS Section (only if canAccess(role, 'cms')):
cms-dashboard, cms-hero, cms-about, cms-services, cms-industries, cms-projects, cms-blogs, cms-testimonials, cms-careers, cms-contact, cms-media, cms-seo, cms-header, cms-footer, cms-announcements, cms-popups, cms-forms, cms-activity

### WhatsApp Section:
Not in sidebar directly - accessed via FloatingNavBar or notifications