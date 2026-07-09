# FacilityPro — Roles & Permissions

## All 7 Roles

| Role | Level | Description |
|------|-------|-------------|
| `super_admin` | 100 | Full system access, can override any workflow state |
| `admin` | 90 | Full tenant access, can override workflow states |
| `manager` | 80 | Department management, most features |
| `supervisor` | 70 | Field supervision, manages technicians |
| `finance` | 60 | Financial operations (invoices, quotations, payments) |
| `technician` | 50 | Field work — complaints, work orders, equipment |
| `customer` | 10 | Client portal — view own data, approve work |

## Role Hierarchy
Defined in `src/store/index.ts` as `ROLE_HIERARCHY`:
```ts
{ super_admin: 100, admin: 90, manager: 80, supervisor: 70, finance: 60, technician: 50, customer: 10 }
```

Use `hasMinRole(userRole, minRole)` to check if a user's level >= the minimum required.

## Permission Helpers

```ts
hasPermission(userRole, requiredRoles[])  // True if user's role is in the allowed list
hasMinRole(userRole, minRole)              // True if user's level >= minRole's level
canAccess(userRole, feature)               // True if user's role can access the feature
```

## Feature Access Matrix

| Feature | super_admin | admin | manager | supervisor | finance | technician | customer |
|---------|:----------:|:-----:|:-------:|:----------:|:-------:|:----------:|:--------:|
| dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| equipment | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| equipment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| complaints | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| work-orders | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| invoices | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| pm | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| quotations | ✅ | ✅ | ✅ | — | — | — | ✅ |
| inventory | ✅ | ✅ | ✅ | ✅ | — | — | — |
| customers | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| employees | ✅ | ✅ | ✅ | — | — | — | — |
| purchases | ✅ | ✅ | ✅ | — | — | — | — |
| vehicles | ✅ | ✅ | ✅ | — | — | — | — |
| finance | ✅ | ✅ | ✅ | — | ✅ | — | — |
| reports | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| notifications | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| settings | ✅ | ✅ | — | — | — | — | — |
| cms | ✅ | ✅ | — | — | — | — | — |
| whatsapp | ✅ | ✅ | ✅ | ✅ | — | — | — |

## Workflow Transition Permissions
From `state-machine.ts`:

- **Assign complaint** (NEW → ASSIGNED): admin, manager, supervisor
- **Accept/Reject assignment** (ASSIGNED → ACCEPTED/NEW): technician
- **Start work** (WORK_ORDER_CREATED → IN_PROGRESS): technician
- **Complete work** (IN_PROGRESS → WAITING_CLIENT_CONFIRMATION): technician
- **Confirm/Request rework** (WAITING_CLIENT_CONFIRMATION → CLIENT_CONFIRMED/REWORK_REQUIRED): customer
- **Start rework** (REWORK_REQUIRED → IN_PROGRESS): technician
- **Approve/Send invoice** (DRAFT_INVOICE → INVOICE_APPROVED → INVOICE_SENT): finance, admin, super_admin
- **Record payment** (INVOICE_SENT → PAID): finance, admin, super_admin
- **Close complaint** (PAID → CLOSED): admin, super_admin
- **Status override** (any → any): admin, super_admin

## AuthUser Type
```ts
interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  tenantId: string;
  tenantName?: string;
  tenantDomain?: string;
  employeeNumber?: string;
  departmentId?: string;
  profileCompleted: boolean;
}
```

## JWT Token Payload
The JWT contains: `{ userId, tenantId, role, email }` — used by all API routes for authorization.
