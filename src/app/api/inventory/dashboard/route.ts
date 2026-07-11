import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    // Parallel fetches for performance
    const [
      totalItems,
      activeItems,
      allItems,
      purchaseOrders,
    ] = await Promise.all([
      db.inventoryItem.count({ where: { tenantId } }),
      db.inventoryItem.count({ where: { tenantId, isActive: true } }),
      db.inventoryItem.findMany({
        where: { tenantId },
        select: {
          id: true, quantity: true, minStock: true, unitCost: true,
          category: true, isActive: true, supplier: true, name: true,
          updatedAt: true, createdAt: true, sku: true,
        },
      }),
      db.purchaseOrder.findMany({
        where: { tenantId, status: { in: ['DRAFT', 'SENT', 'APPROVED'] } },
        select: { id: true, total: true, items: true, status: true },
      }),
    ]);

    // KPI calculations
    const lowStockItems = allItems.filter(i => i.isActive && i.quantity > 0 && i.quantity <= i.minStock);
    const outOfStockItems = allItems.filter(i => i.isActive && i.quantity === 0);
    const inactiveItems = allItems.filter(i => !i.isActive);
    const totalInventoryValue = allItems.filter(i => i.isActive).reduce((s, i) => s + (i.quantity * i.unitCost), 0);
    const pendingPOCount = purchaseOrders.length;
    const incomingQuantity = purchaseOrders.reduce((s, po) => {
      try {
        const items = JSON.parse(po.items || '[]') as { quantity?: number }[];
        return s + items.reduce((a, item) => a + (item.quantity || 0), 0);
      } catch { return s; }
    }, 0);

    // Stock overview for doughnut chart
    const inStockItems = allItems.filter(i => i.isActive && i.quantity > i.minStock);
    const stockOverview = [
      { name: 'In Stock', value: inStockItems.length, color: '#10B981' },
      { name: 'Low Stock', value: lowStockItems.length, color: '#F59E0B' },
      { name: 'Out of Stock', value: outOfStockItems.length, color: '#EF4444' },
      { name: 'Inactive', value: inactiveItems.length, color: '#9CA3AF' },
    ];

    // Category breakdown for doughnut chart
    const categoryMap = new Map<string, { count: number; value: number }>();
    allItems.filter(i => i.isActive).forEach(i => {
      const cat = i.category || 'Others';
      const existing = categoryMap.get(cat) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += i.quantity * i.unitCost;
      categoryMap.set(cat, existing);
    });
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    // Inventory value trend (last 12 months)
    const now = new Date();
    const valueTrend: { month: string; value: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const itemsCreatedBefore = allItems.filter(i => new Date(i.createdAt) <= monthEnd);
      const value = itemsCreatedBefore.reduce((s, it) => s + (it.quantity * it.unitCost), 0);
      valueTrend.push({ month: monthName, value, count: itemsCreatedBefore.length });
    }

    // Supplier summary
    const supplierMap = new Map<string, { count: number; value: number; poCount: number }>();
    allItems.filter(i => i.isActive && i.supplier).forEach(i => {
      const existing = supplierMap.get(i.supplier!) || { count: 0, value: 0, poCount: 0 };
      existing.count += 1;
      existing.value += i.quantity * i.unitCost;
      supplierMap.set(i.supplier!, existing);
    });
    purchaseOrders.forEach(po => {
      const existing = supplierMap.get(po.supplier) || { count: 0, value: 0, poCount: 0 };
      existing.poCount += 1;
      supplierMap.set(po.supplier, existing);
    });
    const suppliers = Array.from(supplierMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    // Insights generation
    const insights: { type: string; title: string; description: string; severity: string; count: number }[] = [];

    if (lowStockItems.length > 0) {
      insights.push({
        type: 'low_stock', title: 'Low Stock Alert',
        description: `${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} are at or below minimum stock level`,
        severity: 'warning', count: lowStockItems.length,
      });
    }
    if (outOfStockItems.length > 0) {
      insights.push({
        type: 'out_of_stock', title: 'Out of Stock',
        description: `${outOfStockItems.length} item${outOfStockItems.length > 1 ? 's' : ''} have zero quantity`,
        severity: 'critical', count: outOfStockItems.length,
      });
    }
    const overstockItems = allItems.filter(i => i.isActive && i.quantity > i.minStock * 5 && i.minStock > 0);
    if (overstockItems.length > 0) {
      insights.push({
        type: 'overstock', title: 'Overstock Alert',
        description: `${overstockItems.length} item${overstockItems.length > 1 ? 's' : ''} exceed 5x minimum stock`,
        severity: 'info', count: overstockItems.length,
      });
    }
    const itemsWithoutSupplier = allItems.filter(i => i.isActive && !i.supplier);
    if (itemsWithoutSupplier.length > 0) {
      insights.push({
        type: 'no_supplier', title: 'Items Without Supplier',
        description: `${itemsWithoutSupplier.length} item${itemsWithoutSupplier.length > 1 ? 's' : ''} have no supplier assigned`,
        severity: 'info', count: itemsWithoutSupplier.length,
      });
    }
    const duplicateSkus = allItems
      .filter(i => i.sku)
      .reduce((acc, i) => {
        const key = i.sku!.toLowerCase().trim();
        acc.set(key, (acc.get(key) || 0) + 1);
        return acc;
      }, new Map<string, number>());
    const dupCount = Array.from(duplicateSkus.values()).filter((c: any) => c > 1).length;
    if (dupCount > 0) {
      insights.push({
        type: 'duplicate', title: 'Duplicate SKUs Detected',
        description: `${dupCount} duplicate SKU${dupCount > 1 ? 's' : ''} found in inventory`,
        severity: 'warning', count: dupCount,
      });
    }
    const highValueItems = allItems.filter(i => i.isActive && (i.quantity * i.unitCost) > totalInventoryValue * 0.1 && totalInventoryValue > 0);
    if (highValueItems.length > 0) {
      insights.push({
        type: 'high_value', title: 'High Value Items',
        description: `${highValueItems.length} item${highValueItems.length > 1 ? 's' : ''} represent over 10% of total inventory value each`,
        severity: 'info', count: highValueItems.length,
      });
    }

    // Fast moving items
    const recentMovements = await db.inventoryMovement.findMany({
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { inventoryItemId: true },
    });
    const movementCounts = new Map<string, number>();
    recentMovements.forEach(m => movementCounts.set(m.inventoryItemId, (movementCounts.get(m.inventoryItemId) || 0) + 1));
    const fastMoving = Array.from(movementCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (fastMoving.length > 0) {
      const fastMovingItems = await db.inventoryItem.findMany({
        where: { id: { in: fastMoving.map(f => f[0]) } },
        select: { name: true, id: true },
      });
      insights.push({
        type: 'fast_moving', title: 'Fast Moving Items',
        description: `${fastMovingItems.map(i => i.name).slice(0, 3).join(', ')}${fastMovingItems.length > 3 ? ` and ${fastMovingItems.length - 3} more` : ''} have high activity this month`,
        severity: 'info', count: fastMoving.length,
      });
    }

    return NextResponse.json({
      kpi: {
        totalItems,
        activeItems,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalInventoryValue,
        pendingPOCount,
        incomingQuantity,
      },
      stockOverview,
      categoryBreakdown,
      valueTrend,
      supplierSummary: {
        totalSuppliers: suppliers.length,
        topSupplier: suppliers[0] || null,
        outstandingPO: pendingPOCount,
        suppliers,
      },
      warehouseSummary: {
        totalWarehouses: [...new Set(allItems.filter(i => i.location).map(i => i.location!))].length || 1,
        totalLocations: [...new Set(allItems.filter(i => i.location).map(i => i.location!))].length,
      },
      insights,
    });
  } catch (error) {
    console.error('Inventory dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}