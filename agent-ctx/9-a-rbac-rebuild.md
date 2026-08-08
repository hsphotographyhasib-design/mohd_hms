# Task 9-a: Fix Quick Actions & Role Change Endpoint

## Files Modified

### 1. `src/core/constants/quick-actions-config.ts` (TASK A)
- Added `ACTION_PERMISSIONS` import from RBAC permissions matrix
- Added `entity` and `actionName` optional fields to `QuickActionItem` type
- Mapped ~80 quick actions to their corresponding `ACTION_PERMISSIONS[entity][action]` entries
- Removed inline `roles` arrays from actions that now use matrix derivation
- Kept inline `roles` only for ~15 actions with no clear matrix mapping (e.g., Stock Transfer, Import Inventory, Session Management)
- Updated `getQuickActionsForView` filter: matrix lookup → inline roles → feature check → always show
- Cleaned up 10 unused lucide-react imports

### 2. `src/app/api/admin/users/[id]/role/route.ts` (TASK B + C)
- Replaced manual `verifyToken` auth with centralized `verifyRouteAuth` middleware
- Added `[RBAC] Role changed` log line after db update for real-time session invalidation tracking
- Replaced `payload.name` references with `auth.email` (verifyRouteAuth doesn't expose name)

## Key Design Decisions
- **Matrix-first approach**: Actions with `entity`+`actionName` derive roles from `ACTION_PERMISSIONS` at runtime, eliminating drift risk
- **Graceful fallback**: If matrix lookup fails (entity/action not found), falls through to inline roles, then feature check
- **15 actions retain inline roles**: No ACTION_PERMISSIONS mapping exists for actions like Import Inventory, Print Barcode, Schedule Report, Session Management

## Verification
- `npx tsc --noEmit` — 0 errors
- `bun run lint` — 0 errors (warnings unchanged)
- `npx eslint src/core/constants/quick-actions-config.ts` — clean