---
Task ID: 1
Agent: full-stack-developer
Task: Create Supabase proxy mini-service

Work Log:
- Created `mini-services/supabase-service/package.json` (zero deps, `bun --hot index.ts` dev script)
- Created `mini-services/supabase-service/index.ts` — full HTTP server on port 3001
- Implemented POST `/query` endpoint accepting `{ table, method, args }`
- Implemented 11 Prisma operations: findFirst, findMany, findUnique, create, update, updateMany, delete, deleteMany, count, aggregate, groupBy
- Built `whereToFilters()` → PostgREST conversion: eq, neq, in, notIn, contains, startsWith, endsWith, gte/gt/lte/lt (combinable), is (null/boolean), not (with recursive operator negation)
- Built `selectToString()` that extracts top-level columns and defers nested relations
- Built `resolveNested()` for batched separate FK lookups using FK_MAP
- Built `buildReadParams()` returning `[string, string][]` tuples for proper multi-value URLSearchParams
- Used `url.searchParams.append()` in `supabaseRequest()` to handle same-key filters
- Added `/health` GET endpoint
- Added request logging with timing
- Verified: service starts, health check returns 200, queries reach Supabase REST API

Stage Summary:
- Service at `mini-services/supabase-service/index.ts` — 580 lines, zero npm dependencies
- Start with `cd mini-services/supabase-service && bun --hot index.ts`
- POST `/query` with `{ table, method, args }` for all Prisma operations
- GET `/health` for liveness checks