# Inventory Module

> Auto-generated from codebase scan.

## Overview

Spare parts and materials management. Tracks stock levels, costs, and links to work orders.

## Files

| File | Purpose |
|------|---------|
| `src/components/modules/inventory/inventory-list.tsx` | List view with low stock alerts, category filters |
| `src/app/api/inventory/route.ts` | GET (list), POST (create) |
| `src/app/api/inventory/[id]/route.ts` | GET (detail), PUT (update) |

## Inventory Item Fields

| Field | Type | Description |
|-------|------|-------------|
| name | String | Item name |
| sku | String? | Stock keeping unit |
| category | String? | Category (e.g., "Filters", "Belts", "Motors") |
| description | String? | Description |
| unit | String | Unit of measure (default: "pcs") |
| quantity | Int | Current stock quantity |
| minStock | Int | Minimum stock threshold (for alerts) |
| unitCost | Float | Cost per unit |
| supplier | String? | Supplier name |
| location | String? | Storage location |
| photos | String? | JSON array of photo URLs |
| isActive | Boolean | Active/inactive |

## Low Stock Alert

Items where `quantity <= minStock` are flagged as "low stock":
- Shown in dashboard stats (`lowStockItems`)
- Visual indicator (red badge) in inventory list
- Filter option: `?lowStock=true`

## Work Order Material Usage

When materials are used in a work order:
1. `WorkOrderMaterial` record created (links WO + InventoryItem)
2. Inventory `quantity` should be decremented
3. Cost calculated: `quantity × unitCost = totalCost`

## Quotation Item Suggestions

Inventory items are searchable from the quotation form:
- `GET /api/quotations/item-suggestions?search=...`
- Returns matching inventory items + items from past quotations
- Shows stock availability indicator
- Pre-fills unit, rate when selected

## Permissions

| Action | Roles |
|--------|-------|
| View | super_admin, admin, manager, supervisor |
| Create/Update | super_admin, admin, manager |

## Type Definition

```ts
interface InventoryItemData {
  id, tenantId, name, sku?, category?, description?,
  unit, quantity, minStock, unitCost, supplier?, location?,
  isActive, createdAt, updatedAt
}
```