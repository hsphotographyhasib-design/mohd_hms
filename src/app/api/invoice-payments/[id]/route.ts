import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const payment = await db.invoicePayment.findFirst({
      where: { id, tenantId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: payment.id,
      tenantId: payment.tenantId,
      invoiceId: payment.invoiceId,
      amount: Number(payment.amount),
      method: payment.method,
      referenceNo: payment.referenceNo,
      transactionId: payment.transactionId,
      receiptUrl: payment.receiptUrl,
      notes: payment.notes,
      paidAt: payment.paidAt,
      createdBy: payment.createdBy,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  } catch (error) {
    console.error('Invoice payment get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    // Fetch the payment to get invoiceId before deleting
    const payment = await db.invoicePayment.findFirst({
      where: { id, tenantId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const invoiceId = payment.invoiceId;

    // Delete the payment (cascade will handle related records)
    await db.invoicePayment.delete({
      where: { id },
    });

    // Recalculate invoice status from remaining payments
    const remainingPayments = await db.invoicePayment.findMany({
      where: { invoiceId, tenantId },
      select: { amount: true },
    });

    const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Fetch invoice to get total
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    let newStatus: string;
    let updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (invoice) {
      const invoiceTotal = Number(invoice.total);

      if (totalPaid >= invoiceTotal) {
        newStatus = 'PAID';
        updateData.status = 'PAID';
        updateData.paidAt = new Date();
      } else if (totalPaid > 0) {
        const allowedStatuses = ['PAID', 'PARTIALLY_PAID', 'CLOSED'];
        if (allowedStatuses.includes(invoice.status)) {
          newStatus = 'PARTIALLY_PAID';
          updateData.status = 'PARTIALLY_PAID';
          // Clear paidAt since no longer fully paid
          updateData.paidAt = null;
        } else {
          newStatus = invoice.status;
        }
      } else {
        // No payments left — revert status based on what makes sense
        if (['PAID', 'PARTIALLY_PAID'].includes(invoice.status)) {
          newStatus = 'APPROVED';
          updateData.status = 'APPROVED';
          updateData.paidAt = null;
        } else {
          newStatus = invoice.status;
        }
      }

      await db.invoice.update({
        where: { id: invoiceId },
        data: updateData,
      });
    } else {
      newStatus = 'UNKNOWN';
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted',
      deletedPaymentId: id,
      invoiceId,
      invoiceStatus: newStatus,
      amountPaid: totalPaid,
    });
  } catch (error) {
    console.error('Invoice payment delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}