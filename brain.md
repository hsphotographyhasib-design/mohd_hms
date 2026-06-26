# Brain.md - Project Knowledge & Persistent Notes

## GitHub Configuration
- **Repository**: https://github.com/hsphotographyhasib-design/mohd_hms
- **Branch**: main
- **Auth**: GitHub PAT stored in git remote URL (consider rotating)
- **Push method**: `git push origin main` (remote already configured)

## Project Overview
- CMMS (Computerized Maintenance Management System) - HMS
- Framework: Next.js 16 with App Router, TypeScript, Tailwind CSS 4, shadcn/ui
- Single-route SPA: only `/` route, views switched via Zustand store (`useAppStore.setView`)
- Database: SQLite with Prisma ORM
- Auth: JWT-based with localStorage persistence
- Primary color: emerald (green)
- Port: 3000

## Architecture
- `src/store/index.ts` — Zustand stores (auth, app, notification) + `canAccess()` permission helper
- `src/types/index.ts` — All TypeScript types
- `src/components/nav/floating-nav-bar.tsx` — Desktop floating nav with scrollable items + dropdown submenus
- `src/lib/db.ts` — Prisma client
- `prisma/schema.prisma` — Database schema

## Key Conventions
- Use `use client` / `use server` directives
- Use API routes (not server actions) for backend
- Use shadcn/ui components from `src/components/ui/`
- AI/SDK tools (z-ai-web-dev-sdk) only in backend, never client-side
- Footer must be sticky/fixed to bottom
- Mobile-first responsive design
- No indigo/blue colors unless explicitly requested

## Pending Tasks
- Mobile bottom nav: 4+More pattern (user-customizable pinned items)
  - Need to create: `src/hooks/use-menu-preferences.ts`
  - Need to create: `src/components/nav/mobile-bottom-nav.tsx`
  - Need to integrate into `floating-nav-bar.tsx` for mobile view
  - 4 pinned items stored in localStorage key `cmms_mobile_nav_pinned`
  - Default pinned: dashboard, complaints, work-orders, invoices
  - MAX_PINNED = 4
  - More panel: bottom sheet with framer-motion animation
  - CustomizeSheet: let user pick which 4 items to pin

## Session History
- Invoice/quotation detail pages built matching printed templates (A4 layout, green theme)
- QR Asset Management System built (public equipment pages, scan logging, label printing)
- Git remote configured and force-pushed to GitHub