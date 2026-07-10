import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { randomUUID } from 'node:crypto';

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

    const {
      invoiceId,
      amount,
      method,
      referenceNo,
      transactionId,
      notes,
    } = body;

    if (!invoiceId || !amount || !method) {
      return NextResponse.json(
        { error: 'invoiceId, amount, and method are required' },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Verify invoice exists and belongs to tenant
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create the payment record
    const payment = await db.invoicePayment.create({
      data: {
        id: randomUUID(),
        tenantId,
        invoiceId,
        amount: paymentAmount,
        method,
        referenceNo: referenceNo || null,
        transactionId: transactionId || null,
        notes: notes || null,
        paidAt: new Date(),
        createdBy: userId,
        updatedAt: new Date(),
      },
    });

    // Recalculate total amountPaid from all payments
    const allPayments = await db.invoicePayment.findMany({
      where: { invoiceId, tenantId },
      select: { amount: true },
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Determine new status based on payments
    const invoiceTotal = Number(invoice.total);
    let newStatus: string;
    let updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (totalPaid >= invoiceTotal) {
      newStatus = 'PAID';
      updateData.paidAt = new Date();
      updateData.status = 'PAID';
    } else if (totalPaid > 0) {
      // Only move to PARTIALLY_PAID from certain statuses
      const allowedStatuses = ['DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'];
      if (allowedStatuses.includes(invoice.status)) {
        newStatus = 'PARTIALLY_PAID';
        updateData.status = 'PARTIALLY_PAID';
      } else {
        newStatus = invoice.status;
      }
    } else {
      newStatus = invoice.status;
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    return NextResponse.json({
      id: payment.id,
      tenantId: payment.tenantId,
      invoiceId: payment.invoiceId,
      amount: Number(payment.amount),
      method: payment.method,
      referenceNo: payment.referenceNo,
      transactionId: payment.transactionId,
      notes: payment.notes,
      paidAt: payment.paidAt,
      createdBy: payment.createdBy,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      invoiceStatus: newStatus,
      amountPaid: totalPaid,
      amountRemaining: Math.max(0, invoiceTotal - totalPaid),
    }, { status: 201 });
  } catch (error) {
    console.error('Invoice payment create error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}