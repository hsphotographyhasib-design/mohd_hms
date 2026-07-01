---
Task ID: 1
Agent: main
Task: Fix "Error evaluating Node.js code" in globals.css and dev server startup failure

Work Log:
- Diagnosed root cause: PostCSS `unclosedBracket` error at globals.css:315 — the `var()` function on the `font-family` declaration was missing a closing `)`
- Fixed `globals.css` line 315: `var(--font-poppins, var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;` → `var(--font-poppins, var(--font-geist-sans)), ui-sans-serif, system-ui, sans-serif;`
- Fixed `prisma.config.ts`: replaced `throw new Error(...)` with a placeholder PostgreSQL URL so `prisma generate` succeeds without a real DB
- Rewrote `src/lib/prisma.ts`: replaced eager PrismaClient initialization (crashed at import time without DB) with a lazy Proxy-based singleton that defers connection until first actual query
- Added `allowedDevOrigins` to `next.config.ts` to suppress cross-origin preview iframe warning
- Verified: dev server starts, page loads with HTTP 200, lint passes (0 errors)

Stage Summary:
- **globals.css unclosed bracket** — was the user-facing error, now fixed
- **prisma.config.ts** — no longer throws on missing DB URL, uses placeholder for `prisma generate`
- **src/lib/prisma.ts** — lazy Proxy singleton, safe to import without DB; `isDatabaseAvailable()` utility exported
- **next.config.ts** — `allowedDevOrigins: ['https://*.space-z.ai']` added
- Server runs locally, API routes gracefully return 500 when DB unavailable (expected without local PostgreSQL)
