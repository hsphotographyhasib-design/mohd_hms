# Worklog

---
Task ID: supabase-keys-config
Agent: Main Agent
Task: Configure user-provided Supabase API keys in both backend and frontend .env files

Work Log:
- Decoded JWT service_role token to extract Supabase project ref: sbcqgsbdaerdoladmbcc
- Created /home/z/my-project/backend/.env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
- Updated /home/z/my-project/.env with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Added USE_SUPABASE=true to root .env to enable frontend Supabase adapter
- Verified PostgREST connection: curl to /rest/v1/User returns HTTP 200
- Verified login via curl: POST /api/auth/login with admin@mohd.com returns valid JWT + user data
- Confirmed database has 7 users including admin@mohd.com (super_admin) and tech@mohd.com (technician)
- Dev server OOMs during full recompile in sandbox (memory limit), but login API verified working

Stage Summary:
- Supabase project: https://sbcqgsbdaerdoladmbcc.supabase.co
- Backend .env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY configured
- Frontend .env: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY + USE_SUPABASE=true
- Login verified: admin@mohd.com → JWT token + user profile (super_admin, tenant: MOHD HMS Enterprise)
- Both .env files are gitignored (not pushed to repo)

---
Task ID: join-fix
## Date: 2025-07-09

### Summary
Fixed ALL PostgREST join queries across the backend codebase. The Supabase database has NO foreign key relationships, so PostgREST embedded-resource selects like `*, Tenant(name, domain)` would fail with 400 errors. All joins are now resolved at the application layer.

### Changes Made

#### 1. New function: `resolve_includes` in `app/core/database.py`
- Added `resolve_includes(records, select)` async function that parses PostgREST select strings for embedded resource patterns
- Handles: `Table(columns)`, `alias:Table(columns)`, `alias:Table!hint(columns)`, `items(*)`
- Supports has-one (Tenant, Department, User, Customer, etc.) and has-many (items, payments, ItemSupplier, WarehouseStock) relationships
- Supports recursive nested joins (e.g., `WarehouseStock(*,warehouse(id,name))`)
- Added `strip_joins_from_select()` helper to clean select strings
- Added `_ALIAS_TO_TABLE` mapping for resolving table names from aliases
- Added `_HAS_MANY_CONFIG` for has-many relationship configuration
- Added `_get_fk_candidates()` with overrides for non-standard FK field names

#### 2. Files Fixed (10 files, ~30 join queries total)

| File | Join Queries Fixed | Pattern |
|------|-------------------|---------|
| `app/features/auth/service.py` | 11 | `Tenant(name,domain)`, `Department(name)`, `User(id,email,name,isActive)` |
| `app/features/quotations/service.py` | 3 | `customer:Customer(...)`, `preparedByUser:User!preparedBy(name)` |
| `app/features/invoices/service.py` | 3 | `customer:Customer(...)`, `quotation:Quotation(...)`, `workOrder:WorkOrder(...)`, `preparer:User!preparedBy(name)`, `creator:User!createdBy(name)`, `payments:InvoicePayment(...)` |
| `app/features/inventory/service.py` | 4 | `item(...)`, `warehouse(...)`, `inventoryCategory(...)`, `InventorySubcategory(...)`, `ItemSupplier(...)`, `WarehouseStock(*,warehouse(...))` |
| `app/features/employees/service.py` | 6 | `department:Department(id,name)`, `user:User(...)`, `department:Department(name)` |
| `app/features/users/service.py` | 3 | `department:Department(id,name)` |
| `app/features/technicians/service.py` | 1 | `department:Department(name)` |
| `app/features/service_items/service.py` | 1 | `items(*)` (has-many) |
| `app/features/departments/service.py` | 1 | `department:Department(id,name)` |

Also removed 2 dead-code join assignments in `inventory/service.py` (select strings assigned but never used).

#### 3. Approach
For each join query:
1. Changed `select='*, Tenant(name, domain)'` to `select='*'`
2. Added `await resolve_includes(result.get('data', []), '*, Tenant(name, domain)')` after the query
3. For conditional joins (e.g., `_fetch_quotation` with `with_customer`/`with_user` flags), used the includes string only for `resolve_includes`

#### 4. Verification
- All Python files compile successfully: `py_compile` passes for all backend files
- Import test passes: `from app.core.database import resolve_includes` works
- No join patterns remain in `query_table()` or `db.query()` calls (verified via grep)

### Next Actions
- Run integration tests to verify the join resolution works with live data
- Monitor PostgREST query logs for any remaining 400 errors
- Consider adding FK constraints to the database schema in the future to enable native PostgREST joins
