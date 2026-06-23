# Feature-Based Architecture Migration Plan

**Project:** FacilityPro CMMS  
**Pattern:** Feature-Based Architecture (incremental migration)  
**Date:** 2026-06-23  
**Status:** Phase 1 Complete — Infrastructure Ready

---

## What's Been Done (Phase 1)

### Infrastructure
- ✅ Path aliases configured in `tsconfig.json`: `@features/*`, `@shared/*`, `@core/*`, `@layouts/*`, `@store/*`, `@services/*`, `@memory/*`
- ✅ 25 feature directory skeletons created under `src/features/`
- ✅ Barrel exports (`index.ts`) for every feature

### Core Layer (`src/core/`)
- ✅ `auth/` — `auth.ts` (JWT, hashing), `rbac.ts` (role hierarchy, permissions), `permissions.ts`
- ✅ `config/` — `env.ts` (centralized env with validation + production warnings)
- ✅ `database/` — `db.ts` (Prisma singleton)
- ✅ `uploads/` — `storage-provider.ts` (filesystem storage with chunked uploads)
- ✅ `logger/` — Level-aware logger

### Shared Layer (`src/shared/`)
- ✅ `hooks/` — `use-toast.ts`, `use-mobile.ts`, `use-secure-fetch.ts` (moved from `src/hooks/`)
- ✅ `utils/` — Re-exports from `@/lib/utils`
- ✅ `constants/` — App-wide constants
- ✅ `types/`, `validators/`, `components/`, `services/` — Placeholders

### Memory System (`src/memory/`)
- ✅ 16 reference documents: architecture, database, workflows, routes, roles, complaints, equipment, inventory, quotations, invoices, whatsapp, notifications, bugs, changelog, feature_index, dependencies

### Backward Compatibility
- ✅ All original files have re-export stubs (`src/lib/auth.ts` → `@/core/auth`)
- ✅ Zero breaking changes — existing imports continue to work

### Bug Fix
- ⚠️ `src/app/middleware.ts` disabled (renamed to `.bak`) — Turbopack crashes with deprecated middleware convention in Next.js 16. Needs migration to `proxy` pattern.

---

## Migration Pattern

Each feature migrates in this order:

1. **Extract types** → `src/features/<name>/types/index.ts` (from `src/types/index.ts`)
2. **Extract API** → `src/features/<name>/api/` (from `src/app/api/<name>/`)
3. **Extract components** → `src/features/<name>/components/` (from `src/components/modules/<name>/`)
4. **Extract hooks** → `src/features/<name>/hooks/`
5. **Extract store** → `src/features/<name>/store/` (from `src/store/index.ts`)
6. **Extract services/utils** → `src/features/<name>/services/`, `src/features/<name>/utils/`
7. **Update barrel** → Uncomment exports in `src/features/<name>/index.ts`
8. **Create re-export stubs** in original locations
9. **Test and verify**

---

## Feature Migration Status

| # | Feature | API Routes | Components | Types | Status |
|---|---------|-----------|------------|-------|--------|
| 1 | auth | ✅ Migrated to core | ⬜ In session/ | ⬜ In types/ | **Core done** |
| 2 | dashboard | 1 route | 1 component | ⬜ | Skeleton |
| 3 | complaints | 5 routes | 3 components | ⬜ | Skeleton |
| 4 | work-orders | 2 routes | 2 components | ⬜ | Skeleton |
| 5 | equipment | 4 routes | 2 components | ⬜ | Skeleton |
| 6 | preventive-maintenance | 2 routes | 1 component | ⬜ | Skeleton |
| 7 | inventory | 2 routes | 1 component | ⬜ | Skeleton |
| 8 | customers | 2 routes | 1 component | ⬜ | Skeleton |
| 9 | quotations | 5 routes | 3 components | ⬜ | Skeleton |
| 10 | invoices | 2 routes | 2 components | ⬜ | Skeleton |
| 11 | finance | 1 route | 1 component | ⬜ | Skeleton |
| 12 | employees | 2 routes | 1 component | ⬜ | Skeleton |
| 13 | hr | — | — | ⬜ | Skeleton |
| 14 | attendance | — | — | ⬜ | Skeleton |
| 15 | payroll | — | — | ⬜ | Skeleton |
| 16 | purchases | 1 route | 1 component | ⬜ | Skeleton |
| 17 | vehicles | 2 routes | 1 component | ⬜ | Skeleton |
| 18 | reports | 1 route | 1 component | ⬜ | Skeleton |
| 19 | notifications | 1 route | 1 component | ⬜ | Skeleton |
| 20 | whatsapp | 17 routes | 5 components | ⬜ | Skeleton |
| 21 | cms | 30+ routes | 16 components | ⬜ | Skeleton |
| 22 | crm | — | — | ⬜ | Skeleton |
| 23 | documents | 2 routes | — | ⬜ | Skeleton |
| 24 | settings | — | 1 component | ⬜ | Skeleton |
| 25 | analytics | — | — | ⬜ | Skeleton |

---

## Import Rules

### ✅ DO
```typescript
import { useAuthStore } from '@features/auth';
import { db } from '@core/database';
import { env } from '@core/config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
```

### ❌ DON'T
```typescript
import { something } from '@features/complaints/api/createComplaint'; // Internal file
import { db } from '@/lib/db';  // Use @core/database instead
```

### Import only from barrel exports
```typescript
// ✅ From barrel
import { ComplaintList, ComplaintDetail } from '@features/complaints';

// ❌ Direct file import
import ComplaintList from '@features/complaints/components/list';
```

---

## Next Steps

1. **Migrate auth feature fully** — Move session components, auth guard, types
2. **Migrate complaints** — First real feature migration (medium complexity)
3. **Migrate equipment** — QR system, bulk operations
4. **Continue remaining features** one at a time
5. **Split types/index.ts** — Distribute types to their feature folders
6. **Split store/index.ts** — Distribute state to feature stores
7. **Fix middleware** — Migrate from deprecated `middleware.ts` to `proxy` pattern
8. **Remove re-export stubs** — Once all consumers migrated

---

## Directory Reference

```
src/
├── app/                    # Next.js App Router (routes stay here)
├── features/               # 🆕 25 feature modules
│   ├── auth/               # ✅ Core migrated
│   ├── dashboard/
│   ├── complaints/
│   └── ... (22 more)
├── shared/                 # 🆕 Shared hooks, utils, constants
│   ├── hooks/              # ✅ 3 hooks migrated
│   ├── utils/
│   ├── constants/
│   └── ...
├── core/                   # 🆕 Auth, DB, config, storage, logger
│   ├── auth/               # ✅ Migrated
│   ├── config/             # ✅ Migrated
│   ├── database/           # ✅ Migrated
│   ├── uploads/            # ✅ Migrated
│   ├── logger/             # ✅ Created
│   └── ...
├── memory/                 # 🆕 AI reference docs (16 files)
├── components/             # Existing (UI + modules — migrate incrementally)
├── lib/                    # Re-export stubs (backward compat)
├── store/                  # Existing (migrate to feature stores)
├── types/                  # Existing (split into features)
└── hooks/                  # Re-export stubs (backward compat)
```