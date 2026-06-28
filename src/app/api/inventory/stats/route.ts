import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    const [
      totalItems,
      activeItems,
      lowStockItems,
      outOfStockItems,
      pendingApproval,
      totalCategories,
      totalWarehouses,
      totalSuppliers,
      totalValueResult,
      itemsByType,
      itemsByStatus,
      itemsByCategory,
      recentMovements,
    ] = await Promise.all([
      db.inventoryItem.count({ where: { tenantId, isActive: true } }),
      db.inventoryItem.count({ where: { tenantId, isActive: true, status: 'active' } }),
      db.inventoryItem.count({ where: { tenantId, isActive: true, quantity: { gt: 0 }, minStock: { gte: 1 } } }),
      db.inventoryItem.count({ where: { tenantId, isActive: true, quantity: 0 } }),
      db.inventoryItem.count({ where: { tenantId, approvalStatus: 'pending', isActive: true } }),
      db.inventoryCategory.count({ where: { tenantId, isActive: true } }),
      db.warehouse.count({ where: { tenantId, isActive: true } }),
      db.itemSupplier.count({ where: { tenantId, isActive: true } }),
      db.inventoryItem.aggregate({
        where: { tenantId, isActive: true, itemType: { in: ['inventory', 'spare_part', 'consumable', 'supply_only', 'supply_install'] } },
        _sum: { quantity: true, averageCost: true, purchaseCost: true },
      }),
      db.inventoryItem.groupBy({
        by: ['itemType'],
        where: { tenantId, isActive: true },
        _count: true,
      }),
      db.inventoryItem.groupBy({
        by: ['status'],
        where: { tenantId, isActive: true },
        _count: true,
      }),
      db.inventoryCategory.findMany({
        where: { tenantId, isActive: true },
        include: { _count: { select: { items: { where: { isActive: true } } } } },
        orderBy: { items: { _count: 'desc' } },
        take: 10,
      }),
      db.stockMovement.findMany({
        where: { tenantId },
        include: {
          item: { select: { id: true, name: true, itemCode: true, unit: true } },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalValue = (totalValueResult._sum.quantity || 0) * (totalValueResult._sum.averageCost || 0);
    const totalStock = totalValueResult._sum.quantity || 0;

    // Low stock items (quantity <= minStock and quantity > 0)
    const lowStockList = await db.inventoryItem.findMany({
      where: { tenantId, isActive: true, quantity: { gt: 0, lte: 999999 } },
      select: { id: true, name: true, itemCode: true, quantity: true, minStock: true, unit: true, category: { select: { name: true } } },
      orderBy: { quantity: 'asc' },
      take: 5,
    });
    const actualLowStock = lowStockList.filter(i => i.quantity <= i.minStock);

    return NextResponse.json({
      totalItems,
      activeItems,
      lowStockItems: actualLowStock.length,
      outOfStockItems,
      pendingApproval,
      totalCategories,
      totalWarehouses,
      totalSuppliers,
      totalValue,
      totalStock,
      itemsByType: itemsByType.map(t => ({ type: t.itemType, count: t._count })),
      itemsByStatus: itemsByStatus.map(s => ({ status: s.status, count: s._count })),
      itemsByCategory: itemsByCategory.map(c => ({ id: c.id, name: c.name, code: c.code, color: c.color, count: c._count.items })),
      recentMovements: recentMovements.map(m => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        createdAt: m.createdAt.toISOString(),
        item: m.item,
        warehouse: m.warehouse,
      })),
      lowStockItems: actualLowStock,
    });
  } catch (error) {
    console.error('Inventory stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}