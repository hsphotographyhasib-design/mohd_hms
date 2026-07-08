---
Task ID: 1
Agent: Main
Task: Fix "Something Went Wrong" error page showing instead of dashboard

Work Log:
- Analyzed user screenshot: shows ErrorModal ("Something Went Wrong") from error.tsx
- Discovered dev server was not running (no process found)
- Investigated OOM: `dmesg` confirmed next-server was being OOM-killed (2.3GB RSS, 4GB total)
- Root cause: Turbopack compilation of `/` route uses ~2GB memory. When authenticated users load the page, a brief flash shows `LandingHome` (before localStorage auth restoration completes), which calls `/api/cms/public/landing`, triggering another Turbopack compilation that exceeds remaining memory
- Fixed `src/app/page.tsx`: Added `authChecked` state that gates rendering until localStorage auth check completes. Uses `requestAnimationFrame` to set `authChecked=true` after restoring auth from localStorage. This prevents `LandingHome` from ever mounting for authenticated users, eliminating the CMS API compilation
- Fixed `next.config.ts`: Added `'https://space-z.ai'` to `allowedDevOrigins`
- Verified: Server compiles `/` in 28s (cold) / 14s (cached), returns HTTP 200, stays stable with 1.4GB available memory

Stage Summary:
- Key fix: `authChecked` gate in page.tsx prevents LandingHome flash → no CMS API call → no OOM
- Server confirmed working: compiles, serves HTTP 200, stable for 30+ seconds after compilation
- `.next` cache reduces recompilation from 28s to 14s
---
