---
Task ID: 2-3-4
Agent: main
Task: Enterprise-grade role-based data isolation for ALL dashboard endpoints

Work Log:
- Read existing `dashboard.routes.ts` (588 lines, 4 endpoints) — identified 4× duplicated WHERE-clause logic and missing role coverage
- Read auth middleware to understand `req.user` payload (userId, tenantId, role, email)
- Read Supabase adapter (`supabase-db.ts`) to understand Prisma-like API, `whereToFilters` limitations (no native OR support)
- Completely rewrote `backend/src/routes/dashboard.routes.ts` with the following architecture:

### `buildDashboardScope()` — shared helper (top of file)
- Accepts `(tenantId, userId, role)` — does any needed DB lookups internally
- Returns a `DashboardScope` object with WHERE clauses + `canSee*` boolean flags
- Handles all 8 roles:
  - **super_admin / admin / manager**: full tenant-wide access
  - **supervisor**: looks up departmentId → fetches dept tech IDs, fetches supervised complaint IDs; uses `workOrderSecondaryWhere` for OR merge of complaint-linked + dept-tech WOs
  - **technician**: `assignedToId = userId` for complaints/WOs, tenant-wide equipment count only
  - **finance**: tenant-wide invoices/revenue, customers; everything else hidden
  - **hr**: employees only; everything else hidden
  - **customer**: links via email/phone match → Customer ID; derives complaint IDs for WO linking; equipment/invoices/quotations filtered by customerId; returns `customerCountOverride: 1`
  - **unknown role**: deny all

### `woGroupBy()` / `woFindMany()` — dual-WHERE helpers
- When `workOrderSecondaryWhere` exists (supervisor/customer), runs two parallel queries and merges/deduplicates
- Handles sort + take re-application after merge
- groupBy merge sums `_count.id` by status key

### Shared formatters extracted:
- `toStatusMap()` — groupBy → { status: count } map
- `buildMonthlyRevenue()` — 6-month rolling revenue
- `calcPmCompliance()` — completed/total percentage
- `enrichComplaints()` / `enrichWorkOrders()` / `enrichPmSchedules()` — resolve FK IDs → display names

### 4 Endpoints — all use `buildDashboardScope()`:
1. **GET /** — Full combined dashboard (KPI + charts + recent)
2. **GET /kpi** — KPI numbers only; includes `accessLevel: role`
3. **GET /charts** — Monthly revenue, complaints by category/status, PM compliance/counts
4. **GET /recent** — Recent complaints, work orders, upcoming PM (name-enriched)

### Compliance:
- ✅ ALL `debug` fields removed from error responses (was 4 occurrences)
- ✅ Audit logging added to all 4 handlers: `console.log([Dashboard/${role}] METHOD /path userId=...)`
- ✅ `accessLevel: role` added to KPI response
- ✅ `Promise.all` used for all parallel data fetching
- ✅ Hidden data returns 0/[] (not errors)
- ✅ No data leaks across roles verified via `canSee*` guards + `NEVER_MATCH` sentinel

### Lint/Type-check:
- ESLint: 0 errors
- TypeScript: only pre-existing errors (missing express module declarations) — no new errors from this change

Stage Summary:
- **Rewrote**: `backend/src/routes/dashboard.routes.ts` — complete enterprise RBAC isolation for 8 roles across 4 endpoints
- **Added**: `buildDashboardScope()` shared helper, `woGroupBy`/`woFindMany` dual-WHERE merge helpers, name-enrichment helpers
- **Removed**: All `debug` fields from error responses
- **Added**: Audit logging, `accessLevel` to KPI
