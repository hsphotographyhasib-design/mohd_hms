# FacilityPro — Inventory Feature

## Overview
Inventory management tracks stock items (spare parts, materials, tools) used in maintenance work. Items can be linked to work orders via `WorkOrderMaterial` to track material usage and costs.

## Data Model (`InventoryItem` in Prisma schema)

### Key Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Tenant scope |
| `name` | String | Item name |
| `sku` | String? | Stock keeping unit |
| `category` | String? | Category |
| `description` | String? | Description |
| `unit` | String | Unit of measure (default: "pcs") |
| `quantity` | Int | Current stock level |
| `minStock` | Int | Minimum stock threshold |
| `unitCost` | Float | Cost per unit |
| `supplier` | String? | Supplier name |
| `location` | String? | Storage location |
| `photos` | String? | JSON array of URLs |
| `isActive` | Boolean | Active flag (default: true) |

### Relations
- `tenant` → Tenant
- `workOrderMaterials` → WorkOrderMaterial[] (items used on work orders)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory` | List items (supports `?lowStock=true`) |
| POST | `/api/inventory` | Create item |
| GET | `/api/inventory/[id]` | Get single item |
| PUT | `/api/inventory/[id]` | Update item |
| DELETE | `/api/inventory/[id]` | Delete item |

### Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `pageSize` | number | Items per page |
| `search` | string | Search name, SKU, supplier |
| `category` | string | Filter by category |
| `lowStock` | "true" | Filter to items where quantity <= minStock |

## Frontend Components
| Component | File | Purpose |
|-----------|------|---------|
| `InventoryList` | `components/modules/inventory/inventory-list.tsx` | Table with filters, low-stock indicators |

## Material Usage on Work Orders
When a technician uses materials on a work order, a `WorkOrderMaterial` record is created:
```ts
WorkOrderMaterial {
  workOrderId: String
  inventoryItemId: String
  quantity: Int
  unitCost: Float
  totalCost: Float
}
```
This deducts from inventory and adds to work order costs.

## Low Stock Alerts
- Dashboard shows `lowStockItems` count
- `?lowStock=true` query param returns items where `quantity <= minStock`
- SQLite limitation: filtering done in JavaScript (no native `<=` comparison for computed fields)

## Feature Access
| Role | Access |
|------|--------|
| super_admin, admin, manager, supervisor | Full CRUD |
| technician | Read only |
| finance | No access |
| customer | No access |
