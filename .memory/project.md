# FacilityPro - Project Overview

> **Auto-generated** from codebase scan. Last updated: 2025-06-23T08:00:00Z

## Basic Info

- **Project Name**: FacilityPro (SMART MAINTENANCE SERVICES SDN BHD)
- **Business Registration**: BE1318
- **Contact**: +673 245 6789
- **Version**: 0.2.0
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Runtime**: Bun
- **Database**: SQLite via Prisma ORM 6
- **UI Library**: Tailwind CSS 4 + shadcn/ui (New York style) + Lucide Icons + Framer Motion

## Project Purpose

Enterprise-grade **Computerized Maintenance Management System (CMMS)** for a facility maintenance company in Brunei. Manages the full lifecycle: customer complaints → work orders → preventive maintenance → invoicing → payments.

## Tenant Info

- **Tenant ID**: `cmqnfygv10000p64koo63w5fs`
- **Domain**: FacilityPro (single-tenant deployment, schema supports multi-tenant)

## Key Business Entities

1. **Customers** - Clients who own/maintain equipment
2. **Equipment** - Assets under maintenance (HVAC, Electrical, Plumbing, Generator, Mechanical, FireProtection)
3. **Complaints** - Service requests with full 13-status workflow lifecycle
4. **Work Orders** - Tasks created from accepted complaints
5. **Quotations** - Price quotes with line items, convertible to WO/Invoice
6. **Invoices** - Billing documents with payment tracking
7. **PM Schedules** - Preventive maintenance scheduling
8. **Inventory** - Spare parts and materials
9. **Documents** - Enterprise DMS with chunked upload, versioning, audit
10. **WhatsApp** - Customer communication via WhatsApp Business API
11. **CMS** - Public website content management (hero, services, blogs, careers, etc.)

## Architecture Pattern

- **SPA with view routing**: Uses Zustand store `setView(viewName, viewParams)` instead of Next.js file-based routing
- **Single page**: All user-visible content at `/` route; `app-shell.tsx` renders views via conditional rendering
- **Lazy loading**: All module views use `React.lazy()` with `Suspense`
- **Public routes**: `/equipment/[qrId]` is the only public-facing page (QR code scans)

## Directory Structure

```
src/
  app/                  # Next.js App Router (minimal - mostly API routes)
    api/                # All backend API routes (105 files)
    equipment/[qrId]/   # Public equipment page (only public page)
    page.tsx            # Root page (renders AppShell)
    layout.tsx          # Root layout
    globals.css         # Global styles + print CSS
  components/
    ui/                 # shadcn/ui components (52 files)
    app/                # App shell, sidebar, header, landing page
    modules/            # Feature modules (17 modules, 49 components)
    nav/                # Navigation components
    session/            # Auth session management (heartbeat, idle timer, logout)
  hooks/                # Custom React hooks
  lib/                  # Utilities, services, business logic
    workflow/           # State machine, escalation, notification engine
    whatsapp/           # WhatsApp service provider, conversation engine
    storage/            # File storage abstraction layer
  store/                # Zustand stores (auth, app, notifications)
  types/                # TypeScript type definitions
  middleware.ts          # Security headers + cache control
mini-services/          # External services (WhatsApp service on port 3003)
prisma/                 # Prisma schema + SQLite DB
db/                     # SQLite database file
```

## Development Commands

- `bun run dev` - Start dev server on port 3000
- `bun run lint` - ESLint check
- `bun run db:push` - Push Prisma schema to DB
- `bun run db:generate` - Regenerate Prisma Client
- **Never use `bun run build`** in this environment (OOM limitations)

## Known Constraints

- **OOM Limitation**: Environment has limited memory. Cannot run dev server + Chrome simultaneously. Use lint + TSC for static verification.
- **Single Port**: Only port 3000 exposed externally. Mini-services use `XTransformPort` query parameter for routing via Caddy gateway.
- **`module` variable name**: Never use `const module = ...` in API routes - conflicts with Next.js ESLint rule. Use `modFilter` or similar.
- **viewParams type**: All view params are `string` type. Use `viewParams?.autoPrint === 'true'` not boolean.