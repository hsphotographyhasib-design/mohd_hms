# FacilityPro — Architecture

## Overview
FacilityPro is a **Computerized Maintenance Management System (CMMS)** built with Next.js 16 (App Router), React 19, TypeScript, Prisma ORM (SQLite), and Tailwind CSS 4. It supports **multi-tenancy** via a `Tenant` model that scopes all data.

## Folder Structure

```
src/
├── app/                      # Next.js App Router — pages & API routes
│   ├── page.tsx              # SPA entry (landing/login/dashboard)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles (Tailwind)
│   ├── api/                  # REST API route handlers
│   │   ├── auth/             # Login, register, me, profile
│   │   ├── complaints/       # CRUD + workflow + escalation
│   │   ├── equipment/        # CRUD + QR codes + analytics
│   │   ├── invoices/         # CRUD
│   │   ├── inventory/        # CRUD
│   │   ├── quotations/       # CRUD + status + number + create + suggestions
│   │   ├── work-orders/      # CRUD
│   │   ├── customers/        # CRUD
│   │   ├── employees/        # CRUD
│   │   ├── vehicles/         # CRUD
│   │   ├── purchases/        # CRUD
│   │   ├── pm/               # Preventive maintenance
│   │   ├── dashboard/        # Dashboard stats
│   │   ├── reports/          # Reports data
│   │   ├── finance/          # Finance data
│   │   ├── notifications/     # Notification CRUD
│   │   ├── cms/              # CMS (18 sub-resources)
│   │   ├── whatsapp/         # WhatsApp (templates, sessions, campaigns, etc.)
│   │   ├── qr/               # QR scan & lookup
│   │   └── seed/             # Database seeding
│   └── equipment/[qrId]/     # Public equipment page (QR landing)
├── components/
│   ├── app/                  # Shell components (header, sidebar, login, landing)
│   ├── ui/                   # shadcn/ui primitives (~50 components)
│   ├── modules/              # Feature UI components (one folder per feature)
│   │   ├── complaints/       # complaint-list, complaint-detail, new-complaint
│   │   ├── equipment/        # equipment-list, equipment-detail
│   │   ├── invoices/         # invoice-list, invoice-detail
│   │   ├── quotations/       # quotation-list, quotation-form, quotation-detail
│   │   ├── inventory/        # inventory-list
│   │   ├── dashboard/        # dashboard-view
│   │   ├── work-orders/      # work-order-list, work-order-detail
│   │   ├── customers/        # customer-list
│   │   ├── employees/        # employee-list
│   │   ├── whatsapp/         # dashboard, chats, templates, campaigns, settings
│   │   ├── cms/              # 16 CMS sub-components
│   │   ├── notifications/    # notification-list
│   │   └── ...               # vehicles, purchases, pm, reports, finance, settings
│   ├── session/              # Auth session (guard, idle-timer, heartbeat, broadcast-logout)
│   └── nav/                  # Navigation (floating-nav-bar, app-header)
├── features/                 # Feature-based barrel modules (MIGRATION IN PROGRESS)
│   ├── auth/index.ts
│   ├── complaints/index.ts
│   ├── equipment/index.ts
│   ├── invoices/index.ts
│   ├── quotations/index.ts
│   ├── inventory/index.ts
│   ├── work-orders/index.ts
│   ├── customers/index.ts
│   ├── employees/index.ts
│   ├── purchases/index.ts
│   ├── vehicles/index.ts
│   ├── preventive-maintenance/index.ts
│   ├── whatsapp/index.ts
│   ├── cms/index.ts
│   ├── dashboard/index.ts
│   ├── notifications/index.ts
│   ├── reports/index.ts
│   ├── finance/index.ts
│   ├── settings/index.ts
│   ├── attendance/index.ts
│   ├── hr/index.ts
│   ├── payroll/index.ts
│   ├── analytics/index.ts
│   ├── crm/index.ts
│   └── documents/index.ts
├── hooks/                    # Custom React hooks
│   ├── use-toast.ts
│   ├── use-secure-fetch.ts
│   └── use-mobile.ts
├── lib/                      # Shared utilities & libraries
│   ├── auth.ts               # JWT, bcrypt, ID generators
│   ├── db.ts                 # Prisma client singleton
│   ├── utils.ts              # cn() helper, misc utilities
│   ├── workflow/             # Complaint workflow engine (3 files)
│   ├── whatsapp/             # WhatsApp logic (3 files)
│   ├── whatsapp-service/     # WhatsApp service manager (singleton)
│   ├── qr-utils.ts           # QR code utilities
│   ├── label-pdf.ts          # PDF label generation
│   ├── label-templates.ts    # Label template definitions
│   ├── number-to-words.ts    # Number formatting
│   └── quotation-helpers.ts  # Quotation helpers
├── store/                    # Zustand global state
│   └── index.ts              # Auth store, App store, Notification store, permissions
├── types/                    # Shared TypeScript types
│   └── index.ts              # All type definitions
├── memory/                   # AI knowledge base (this directory)
└── middleware.ts              # Security headers + cache control
```

## Path Aliases (tsconfig.json)

| Alias | Maps to | Usage |
|-------|---------|-------|
| `@/*` | `./src/*` | Primary — all imports use this |
| `@features/*` | `./src/features/*` | Feature module imports |
| `@shared/*` | `./src/shared/*` | Shared utilities (planned) |
| `@core/*` | `./src/core/*` | Core logic (planned) |
| `@layouts/*` | `./src/layouts/*` | Layout components (planned) |
| `@store/*` | `./src/store/*` | Store imports |
| `@services/*` | `./src/services/*` | Service layer (planned) |
| `@memory/*` | `./src/memory/*` | AI memory docs |

## Import Rules
1. Always use `@/` path alias — never relative paths across folders
2. UI components: `import { Button } from '@/components/ui/button'`
3. Module components: `import { ComplaintList } from '@/components/modules/complaints/complaint-list'`
4. Library utilities: `import { db } from '@/lib/db'`
5. Types: `import type { ComplaintItem } from '@/types'`

## Barrel Export Pattern (Feature Modules)
Each feature in `src/features/` has an `index.ts` barrel file:
```ts
// src/features/complaints/index.ts
export * from './components';  // UI components
export * from './api';         // API handlers
export * from './hooks';       // Custom hooks
export * from './types';       // Feature-specific types
export * from './store';       // Zustand store slice
```
**Current status**: All 25 feature barrel files exist but contain only comments (scaffolding). Actual code is still in `components/modules/`, `app/api/`, and `lib/`. Migration is in progress.

## SPA Architecture
The app is a **single-page application** using `useAppStore` to manage which "view" is shown. There's only one physical page (`src/app/page.tsx`) that conditionally renders the appropriate module component based on `currentView`. This avoids full page navigation.

## State Management
- **Zustand** stores in `src/store/index.ts`:
  - `useAuthStore` — authentication (login, logout, token, user)
  - `useAppStore` — navigation (currentView, viewParams)
  - `useNotificationStore` — notifications (unread count, list)
- **No React Query** yet for server state (fetching is done via custom hooks / direct fetch)

## API Pattern
All API routes follow the same pattern:
1. Extract JWT from `Authorization: Bearer <token>` header
2. Call `verifyToken(token)` to get `tenantId` and `userId`
3. Query with `tenantId` scope
4. Return `{ data, total, page, pageSize, totalPages }` for lists
5. Return `{ error: string }` for errors

## Authentication
- JWT-based auth (7-day expiry)
- `bcryptjs` for password hashing (12 salt rounds)
- Tokens stored in `localStorage` (`cmms_token`, `cmms_user`)
- Middleware adds security headers but does NOT enforce auth (auth is checked per-route)
- Session management: idle timer, heartbeat, broadcast logout across tabs
