# Brain.md - Project Knowledge & Persistent Notes

## GitHub Configuration
- **Repository**: https://github.com/hsphotographyhasib-design/mohd_hms
- **Branch**: main
- **Auth**: GitHub PAT stored in git remote URL (consider rotating)
- **Push method**: `git push origin main` (remote already configured)
- **Secret safety**: `.env` is in `.gitignore` — never commit secrets. Use `git rm --cached .env` if accidentally tracked.

## Project Overview
- CMMS (Computerized Maintenance Management System) - HMS
- Company: MOHD.HMS ENTERPRISE (Brunei)
- Framework: Next.js 16 with App Router, TypeScript, Tailwind CSS 4, shadcn/ui
- Single-route SPA: only `/` route, views switched via Zustand store (`useAppStore.setView`)
- Database: PostgreSQL (Prisma adapter) in current dev, SQLite/Turso libSQL (production Vercel) with Prisma ORM
- Auth: JWT-based with localStorage persistence
- Primary color: emerald (green)
- Port: 3000
- Domain: mohdhms.com

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
- `src/types/index.ts` — All TypeScript types (AppView union type for all views)
- `src/components/nav/floating-nav-bar.tsx` — **PRIMARY navigation** (horizontal floating bar with scroll). NOT the sidebar.
- `src/components/app/sidebar.tsx` — Legacy sidebar, NOT used in current layout
- `src/components/app/app-shell.tsx` — Layout shell: AppHeader + FloatingNavBar + ViewRouter
- `src/components/app/landing-page.tsx` — Public landing page (shown when not authenticated)
- `src/lib/db.ts` — Prisma client
- `prisma/schema.prisma` — Database schema
- `src/app/layout.tsx` — Root layout with OG meta tags, JSON-LD, manifest

## Key Conventions
- Use `use client` / `use server` directives
- Use API routes (not server actions) for backend
- Use shadcn/ui components from `src/components/ui/`
- AI/SDK tools (z-ai-web-dev-sdk) only in backend, never client-side
- Footer must be sticky/fixed to bottom
- Mobile-first responsive design
- No indigo/blue colors unless explicitly requested
- **Lint rule**: `react-hooks/set-state-in-effect` — avoid calling setState synchronously in useEffect. Use async IIFE inside effect instead.
- **Landing page**: Users see landing page by default. Auth state is in localStorage (`cmms_token`, `cmms_user`). The `page.tsx` hydrates auth from localStorage in useEffect.

## Email System (Brevo)
- **Provider**: Brevo (formerly Sendinblue) — HTTP API v3, NOT sib-api-v3-sdk package
- **Env vars**: `BREVO_API_KEY`, `BREVO_SENDER_NAME`, `BREVO_SENDER_EMAIL`
- **Single email**: `src/lib/email-service/providers/brevo.ts` — uses `POST /v3/smtp/email`
- **Campaigns**: `src/app/api/email/campaigns/route.ts` — uses `GET/POST /v3/emailCampaigns`
- **Campaign actions**: `src/app/api/email/campaigns/[id]/route.ts` — sendNow, sendTest, delete
- **Campaigns UI**: `src/components/modules/email/campaigns-tab.tsx` — 4th tab in Email Management
- **Email dashboard**: `src/components/modules/email/email-dashboard.tsx` — tabs: Dashboard, Logs, Templates, Campaigns
- **Brevo IP whitelist**: Server IP must be whitelisted at https://app.brevo.com/security/authorised_ips
- **Permission**: `email` feature only accessible by `super_admin` and `admin` roles

## Social Sharing / Open Graph
- **OG image**: `/public/og-image.png` (1344×768, AI-generated)
- **Meta tags**: Full OG + Twitter Card + JSON-LD Organization in `layout.tsx`
- **Canonical URL**: https://mohdhms.com
- **robots.txt**: Includes WhatsApp, LinkedIn, Telegram, Discord, Facebook, Twitter bots
- **Manifest**: `/public/manifest.json` (PWA/mobile)

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
- **READ brain.md FIRST** at the start of every session
- The floating nav bar (`floating-nav-bar.tsx`) is the PRIMARY nav, not the sidebar
- When adding new nav items, add to BOTH `navItems` in `sidebar.tsx` AND `NAV_ITEMS` in `floating-nav-bar.tsx`, plus add the view to `AppView` type and the view router in `app-shell.tsx`
- `.env` must NEVER be committed to git (GitHub push protection will block it)

## Session History
- Invoice/quotation detail pages built matching printed templates (A4 layout, green theme)
- QR Asset Management System built (public equipment pages, scan logging, label printing)
- Git remote configured and force-pushed to GitHub
- Vercel deployment: fixed build errors (serverExternalPackages + force-dynamic), fixed runtime DATABASE_URL undefined (type-only imports + dynamic require)
- **Brevo Email Campaign system**: Full CRUD for email campaigns via Brevo API. Campaigns tab in Email Management. Backend API routes at `/api/email/campaigns`. Supports create, list, send now, send test, delete. Added Email nav item to floating nav bar.
- **Open Graph / Social Sharing**: OG image, full meta tags (OG + Twitter Cards + JSON-LD), robots.txt with all social crawlers, web manifest. Verified all tags render in HTML output.
- **Nav cleanup**: Removed sub-menus from Equipment and Complaints nav items per user request.
- **Git secret fix**: .env with BREVO_API_KEY was accidentally committed. Fixed with `git rm --cached .env` and force push.