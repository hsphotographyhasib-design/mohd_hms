---
Task ID: frontend-vercel-1  
Agent: fullstack-developer
Task: Configure Next.js frontend for Vercel deployment with remote backend

Files Modified:
- `/home/z/my-project/vercel.json` — NEW: Vercel deployment config
- `/home/z/my-project/src/hooks/use-secure-fetch.ts` — MODIFIED: Added API_BASE + resolveApiUrl()
- `/home/z/my-project/.env.production.example` — NEW: Production env template
- `/home/z/my-project/.env.example` — MODIFIED: Added NEXT_PUBLIC_API_URL entry
- `/home/z/my-project/.gitignore` — MODIFIED: Added backend/ entries
- `/home/z/my-project/deploy/README.md` — NEW: Deployment guide
- `/home/z/my-project/worklog.md` — MODIFIED: Appended work record

Key Design Decisions:
- `resolveApiUrl()` only transforms paths starting with `/api/` to avoid breaking non-API fetches
- When `NEXT_PUBLIC_API_URL` is empty (local dev), all calls stay same-origin
- Both `secureFetch()` hook and global `setupFetchInterceptor()` use the same resolver
- Lint passes clean on use-secure-fetch.ts (pre-existing errors in other files are unrelated)