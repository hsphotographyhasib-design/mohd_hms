# FacilityPro — Feature Index

## Overview
25 feature modules defined in `src/features/`. Each has a barrel `index.ts` file. Migration status indicates whether the feature's code has been moved into the barrel module or remains in the legacy structure.

## Feature Status

| # | Feature | Barrel Module | Status | Key Files (Legacy) |
|---|---------|---------------|--------|---------------------|
| 1 | **Auth** | `features/auth/` | In Progress | `lib/auth.ts`, `app/api/auth/`, `components/session/`, `hooks/use-secure-fetch.ts` |
| 2 | **Dashboard** | `features/dashboard/` | In Progress | `components/modules/dashboard/dashboard-view.tsx`, `app/api/dashboard/` |
| 3 | **Complaints** | `features/complaints/` | In Progress | `components/modules/complaints/`, `app/api/complaints/`, `lib/workflow/` |
| 4 | **Equipment** | `features/equipment/` | In Progress | `components/modules/equipment/`, `app/api/equipment/`, `lib/qr-utils.ts`, `lib/label-pdf.ts` |
| 5 | **Work Orders** | `features/work-orders/` | In Progress | `components/modules/work-orders/`, `app/api/work-orders/` |
| 6 | **Invoices** | `features/invoices/` | In Progress | `components/modules/invoices/`, `app/api/invoices/`, `lib/number-to-words.ts` |
| 7 | **Quotations** | `features/quotations/` | In Progress | `components/modules/quotations/`, `app/api/quotations/`, `lib/quotation-helpers.ts` |
| 8 | **Inventory** | `features/inventory/` | In Progress | `components/modules/inventory/`, `app/api/inventory/` |
| 9 | **Customers** | `features/customers/` | In Progress | `components/modules/customers/`, `app/api/customers/` |
| 10 | **Employees** | `features/employees/` | In Progress | `components/modules/employees/`, `app/api/employees/` |
| 11 | **Purchases** | `features/purchases/` | In Progress | `components/modules/purchases/`, `app/api/purchases/` |
| 12 | **Vehicles** | `features/vehicles/` | In Progress | `components/modules/vehicles/`, `app/api/vehicles/` |
| 13 | **Preventive Maintenance** | `features/preventive-maintenance/` | In Progress | `components/modules/pm/`, `app/api/pm/` |
| 14 | **WhatsApp** | `features/whatsapp/` | In Progress | `components/modules/whatsapp/`, `app/api/whatsapp/`, `lib/whatsapp/`, `lib/whatsapp-service/` |
| 15 | **CMS** | `features/cms/` | In Progress | `components/modules/cms/`, `app/api/cms/` (18 sub-resources) |
| 16 | **Notifications** | `features/notifications/` | In Progress | `components/modules/notifications/`, `app/api/notifications/`, `store/index.ts` |
| 17 | **Reports** | `features/reports/` | In Progress | `components/modules/reports/`, `app/api/reports/` |
| 18 | **Finance** | `features/finance/` | In Progress | `components/modules/finance/`, `app/api/finance/` |
| 19 | **Settings** | `features/settings/` | In Progress | `components/modules/settings/` |
| 20 | **Attendance** | `features/attendance/` | Not Started | Models only (`LeaveRequest`, `Attendance` in schema) |
| 21 | **HR** | `features/hr/` | Not Started | No dedicated components yet |
| 22 | **Payroll** | `features/payroll/` | Not Started | No implementation yet |
| 23 | **Analytics** | `features/analytics/` | Not Started | No dedicated components yet |
| 24 | **CRM** | `features/crm/` | Not Started | Barrel only |
| 25 | **Documents** | `features/documents/` | Not Started | Barrel only |

## Migration Status Legend
- **Migrated**: Code moved into `features/` barrel, exports from there
- **In Progress**: Barrel exists, code is in legacy locations, imports still use old paths
- **Not Started**: Barrel only exists with comments, no feature-specific code

## Notes
- All 25 barrel files exist at `src/features/*/index.ts`
- None have active exports — all contain only comments
- All feature code currently lives in:
  - **UI**: `src/components/modules/{feature}/`
  - **API**: `src/app/api/{feature}/`
  - **Logic**: `src/lib/` (workflow, whatsapp, auth, etc.)
- Feature-based architecture migration requires moving code into the barrel modules and updating all imports
