# Task 2-a: RBAC Rebuild Phase 2-5 — Work Record

## Changes Made

### 1. Fixed Register Route (`/api/auth/register`)
- Removed `role` variable declaration and client-provided `body.role` assignment
- Hardcoded `role: 'customer'` in user creation (privilege escalation fix)

### 2. Fixed verifyRouteAuth (`/core/middleware/api-auth.ts`)
- Added runtime role validation using a `Set<string>` of valid roles after line 100
- Changed feature check from `if (allowedRoles && ...)` to `if (!allowedRoles || ...)` for deny-by-default on unknown features

### 3. Deleted Dead auth.ts (`/core/auth/auth.ts`)
- Verified it was never imported (only `auth-lib` imports exist)
- Deleted file entirely (had hardcoded JWT secret fallback)

### 4. Consolidated UserRole Type
- Changed `src/core/types/index.ts` to import + re-export `UserRole` from `src/core/permissions/rbac/types.ts`
- Deleted `DOCUMENT_PERMISSIONS` constant from types/index.ts
- Updated `document-detail.tsx` and `document-list.tsx` in `src/modules/documents/components/` to use `canPerformAction(role, 'document', action)` instead
- Added action name mapping: `upload` → `create`, `version_restore` → `manage_versions`

### 5. Added ALL_ROLES and parseRole to permissions-matrix.ts
- Added `ALL_ROLES` const array (11 roles as `const` tuple)
- Added `parseRole(raw: unknown): UserRole | null` runtime validator
- Both placed after imports, before FEATURE_PERMISSIONS

### 6. Exported from Barrel
- Added `ALL_ROLES` and `parseRole` to `src/core/permissions/rbac/index.ts` exports

### 7. Fixed Role Change Endpoint
- Replaced hardcoded `VALID_ROLES` array with `ALL_ROLES` from permissions-matrix
- Added `ALL_ROLES` to the dynamic import

## Lint Status
- 0 errors, 2780 warnings (all pre-existing)
