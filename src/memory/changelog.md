# FacilityPro — Changelog

## [2025-07] Memory System Created
- Added `src/memory/` directory with 16 knowledge base documents
- Each document covers a specific domain of the codebase
- Purpose: AI agents read these files first instead of scanning the whole project

## [2025-07] Feature-Based Architecture Migration (In Progress)
- Created 25 feature barrel modules in `src/features/` with `index.ts` files
- Each barrel follows pattern: `export * from './components' | './api' | './hooks' | './types' | './store'`
- **Status**: Barrel files exist but are scaffolding (comments only). Actual code remains in:
  - `src/components/modules/` (UI)
  - `src/app/api/` (API routes)
  - `src/lib/` (business logic)
- Path aliases added to `tsconfig.json`: `@features/*`, `@shared/*`, `@core/*`, `@layouts/*`, `@store/*`, `@services/*`, `@memory/*`

## [2025-07] Complaint Workflow System
- Implemented full state machine with 13 statuses and 15 transition rules
- Created escalation engine with 6 SLA rules (idempotent)
- Created notification engine for workflow events
- Added timeline tracking per complaint

## [2025-07] WhatsApp Integration
- Provider abstraction (OpenWA, Meta Cloud API, Twilio)
- Conversation engine with 16 session states
- Workflow automation (auto-route, auto-create WO, status updates)
- Broadcast campaign system
- WhatsApp service manager singleton

## [2025-07] Equipment QR Code System
- QR ID generation (format: QR-GEN-{8CHAR})
- Public equipment page at `/equipment/[qrId]`
- Scan logging with device/IP/location tracking
- QR analytics endpoint
- Bulk QR code generation

## [2025-07] CMS (Content Management System)
- 18 sub-resources (hero, services, blogs, projects, careers, etc.)
- Full CRUD API routes
- 16 frontend CMS components
- Public landing page API

## [2025-07] Session & Security
- JWT-based auth (7-day expiry)
- Session heartbeat
- Idle timer with auto-logout
- Broadcast logout across tabs (BroadcastChannel API)
- History state protection (prevent back button after logout)
- Middleware with security headers + cache control

## Earlier
- Initial project setup: Next.js 16, React 19, TypeScript, Prisma (SQLite), Tailwind CSS 4
- shadcn/ui component library (~50 components)
- Zustand state management (auth, app, notifications)
- Multi-tenant data model with 30+ Prisma models
