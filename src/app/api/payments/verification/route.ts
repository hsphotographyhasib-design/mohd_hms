import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const where: Record<string, unknown> = { tenantId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const verifications = await db.paymentVerification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Lookup customer names and invoice numbers
    const customerIds = [...new Set(verifications.filter((v) => v.customerId).map((v) => v.customerId!))];
    const invoiceIds = [...new Set(verifications.filter((v) => v.invoiceId).map((v) => v.invoiceId!))];

    const [customers, invoices] = await Promise.all([
      customerIds.length > 0
        ? db.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true },
          })
        : [],
      invoiceIds.length > 0
        ? db.invoice.findMany({
            where: { id: { in: invoiceIds } },
            select: { id: true, invoiceNumber: true },
          })
        : [],
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));
    const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));

    return NextResponse.json(
      verifications.map((v) => ({
        id: v.id,
        customerName: v.customerId ? customerMap.get(v.customerId) : undefined,
        invoiceNumber: v.invoiceId ? invoiceMap.get(v.invoiceId) : undefined,
        extractedAmount: v.extractedAmount,
        extractedBank: v.extractedBank,
        extractedDate: v.extractedDate,
        extractedTxnId: v.extractedTxnId,
        extractedSender: v.extractedSender,
        extractedRef: v.extractedRef,
        imageUrl: v.imageUrl,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('[Payment Verification GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
    }

    // Get verification record
    const verification = await db.paymentVerification.findFirst({
      where: { id, tenantId },
    });

    if (!verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
    }

    if (verification.status !== 'pending') {
      return NextResponse.json({ error: `Already ${verification.status}` }, { status: 400 });
    }

    // Update verification
    const updated = await db.paymentVerification.update({
      where: { id },
      data: {
        status,
        verifiedById: userId,
        verifiedAt: new Date(),
        verificationNotes: notes || null,
        rejectionReason: status === 'rejected' ? (notes || 'Rejected by admin') : null,
        invoiceClosed: status === 'approved' && !!verification.invoiceId,
      },
    });

    // On approval: close related invoice
    if (status === 'approved' && verification.invoiceId) {
      await db.invoice.update({
        where: { id: verification.invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod: 'bank_transfer',
          paymentRef: verification.extractedTxnId || verification.extractedRef || null,
          bankName: verification.extractedBank || null,
          transactionId: verification.extractedTxnId || verification.extractedRef || null,
        },
      });
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      verifiedAt: updated.verifiedAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Payment Verification PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}