import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();
    const { itemId, type, quantity, reason, referenceId, referenceType } = body;

    if (!itemId || !type || !quantity) {
      return NextResponse.json(
        { error: 'itemId, type, and quantity are required' },
        { status: 400 }
      );
    }

    const validTypes = ['stock_in', 'stock_out', 'adjustment', 'reserved', 'reserved_released', 'work_order_used'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
    }

    const item = await db.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const previousQuantity = item.quantity;
    let newQuantity: number;

    switch (type) {
      case 'stock_in':
      case 'reserved_released':
        newQuantity = previousQuantity + Math.abs(quantity);
        break;
      case 'stock_out':
      case 'work_order_used':
        newQuantity = Math.max(0, previousQuantity - Math.abs(quantity));
        break;
      case 'adjustment':
        newQuantity = quantity; // absolute value for adjustments
        break;
      case 'reserved':
        // Reserved doesn't change actual qty, just logs intent
        newQuantity = previousQuantity;
        break;
      default:
        newQuantity = previousQuantity;
    }

    // Create movement record and update item in transaction
    const [movement] = await db.$transaction([
      db.inventoryMovement.create({
        data: {
          tenantId,
          inventoryItemId: itemId,
          type,
          quantity: Math.abs(quantity),
          previousQuantity,
          newQuantity,
          reason: reason || null,
          referenceId: referenceId || null,
          referenceType: referenceType || null,
          performedById: userId,
        },
        include: {
          performedBy: { select: { name: true } },
        },
      }),
      db.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      }),
    ]);

    return NextResponse.json({
      id: movement.id,
      tenantId: movement.tenantId,
      inventoryItemId: movement.inventoryItemId,
      type: movement.type,
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      reason: movement.reason,
      referenceId: movement.referenceId,
      referenceType: movement.referenceType,
      performedByName: movement.performedBy?.name || null,
      createdAt: movement.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Stock adjust error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}