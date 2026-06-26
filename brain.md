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
- Database: SQLite (local dev) / Turso libSQL (production Vercel) with Prisma ORM
- Auth: JWT-based with localStorage persistence
- Primary color: emerald (green)
- Port: 3000

## Vercel Deployment
- **Build**: `prisma generate && next build` (postinstall runs prisma generate)
- **No standalone output** (Vercel handles it)
- **Database auto-detect**: `db.ts` checks if DATABASE_URL starts with `libsql://` → uses @prisma/adapter-libsql, otherwise local SQLite
- **Turso DB**: `libsql://mohd-hms-amdsajib121.aws-ap-south-1.turso.io` (Mumbai region)
- **Turso API token** (for CLI): stored in user's Turso account
- **Vercel env vars needed**:
  - `DATABASE_URL` = `libsql://mohd-hms-amdsajib121.aws-ap-south-1.turso.io`
  - `DATABASE_AUTH_TOKEN` = DB token (created via `turso db tokens create mohd-hms --expiration none`)
  - `JWT_SECRET` = strong random string
  - `NEXT_PUBLIC_APP_URL` = `https://mohd-hms.vercel.app`
- **WhatsApp mini-service**: NOT deployed to Vercel (needs persistent process, e.g. Railway)

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

## DATABASE_URL Undefined Fix (Vercel Runtime)
- **Root cause**: 38 API routes had `import { Prisma } from '@prisma/client'` (runtime import). This triggered Prisma module init at import time, which reads `process.env.DATABASE_URL` before it was available in Vercel's serverless context. Even the lazy Proxy in db.ts couldn't help because Prisma was already initialized by other files' imports.
- **Fix (commit 8a3cbc5)**:
  1. Changed all 38 files to `import type { Prisma } from '@prisma/client'` (type-only, erased at compile time, no runtime module init)
  2. Changed `db.ts` to use dynamic `require('@prisma/client')` inside the lazy `createPrismaClient()` function instead of top-level `import`
  3. `db.ts` sets `process.env.DATABASE_URL` before requiring `@prisma/client` as a safety measure

## Always Remember
- After EVERY code update, push to GitHub: `git add -A && git commit -m "msg" && git push origin main`

## Session History
- Invoice/quotation detail pages built matching printed templates (A4 layout, green theme)
- QR Asset Management System built (public equipment pages, scan logging, label printing)
- Git remote configured and force-pushed to GitHub
- Vercel deployment: fixed build errors (serverExternalPackages + force-dynamic), fixed runtime DATABASE_URL undefined (type-only imports + dynamic require)