import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const { id } = await params;

    const quotation = await db.quotation.findFirst({
      where: { id, tenantId },
      include: { customer: { select: { name: true, phone: true, email: true, address: true } } },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (!['DRAFT', 'APPROVED', 'SENT', 'ACCEPTED'].includes(quotation.status)) {
      return NextResponse.json(
        { error: `Cannot convert quotation in ${quotation.status} status to Work Order` },
        { status: 400 }
      );
    }

    // Generate WO number
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
    const woCount = await db.workOrder.count({
      where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd } },
    });
    const woNumber = `WO/${year}${month}/${String(woCount + 1).padStart(4, '0')}`;

    // Parse items for description
    let itemsDescription = '';
    try {
      const items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : quotation.items;
      if (Array.isArray(items)) {
        itemsDescription = items
          .map((item: any, i: number) => `${i + 1}. ${item.title || item.description || 'Item'} — Qty: ${item.quantity || 0} × ${item.rate || item.unitPrice || 0}`)
          .join('\n');
      }
    } catch {
      itemsDescription = quotation.title || 'Quotation work items';
    }

    // Create work order
    const workOrder = await db.workOrder.create({
      data: {
        tenantId,
        customerId: quotation.customerId,
        title: `WO from Quotation ${quotation.quotationNo}`,
        description: `${quotation.description || quotation.title || ''}\n\nItems:\n${itemsDescription}`,
        status: 'PENDING',
        priority: 'medium',
        type: 'corrective',
        createdBy: userId,
        scheduledDate: null,
        notes: `Converted from Quotation ${quotation.quotationNo}. Total: ${quotation.currency || 'BND'} ${Number(quotation.total).toFixed(2)}`,
      },
    });

    // Update quotation status
    await db.quotation.update({
      where: { id },
      data: { status: 'CONVERTED_WO' },
    });

    return NextResponse.json({
      workOrderId: workOrder.id,
      workOrderNumber: woNumber,
      quotationId: id,
      quotationNo: quotation.quotationNo,
      message: `Work Order ${woNumber} created successfully from Quotation ${quotation.quotationNo}`,
    });
  } catch (error) {
    console.error('Convert quotation to WO error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}