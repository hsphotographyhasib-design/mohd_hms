import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REVIEW', 'REJECTED'],
  REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['SENT', 'DRAFT'],
  SENT: ['ACCEPTED', 'EXPIRED'],
  ACCEPTED: ['CONVERTED_WO', 'CONVERTED_INVOICE', 'CLOSED'],
  REJECTED: ['DRAFT'],
  EXPIRED: ['DRAFT'],
  CONVERTED_WO: ['CLOSED', 'PAID'],
  CONVERTED_INVOICE: ['PAID', 'CLOSED'],
  PAID: ['CLOSED'],
  CLOSED: [],
};

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
    const body = await request.json();

    const { status, notes } = body as { status?: string; notes?: string };

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const existing = await db.quotation.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const allowedTransitions = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${existing.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (status === 'SENT') {
      updateData.sentAt = new Date();
    }

    if (status === 'ACCEPTED') {
      updateData.acceptedAt = new Date();
    }

    if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
    }

    const updated = await db.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true, phone: true, email: true, address: true } },
      },
    });

    let preparedByName: string | null = null;
    if (updated.preparedBy) {
      const user = await db.user.findUnique({
        where: { id: updated.preparedBy },
        select: { name: true },
      });
      if (user) preparedByName = user.name;
    }

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customer: {
        name: updated.customer.name,
        phone: updated.customer.phone,
        email: updated.customer.email,
        address: updated.customer.address,
      },
      complaintId: updated.complaintId,
      quotationNo: updated.quotationNo,
      title: updated.title,
      description: updated.description,
      referenceNo: updated.referenceNo,
      projectName: updated.projectName,
      site: updated.site,
      preparedBy: updated.preparedBy,
      preparedByName,
      items: updated.items,
      terms: updated.terms,
      currency: updated.currency,
      subtotal: updated.subtotal,
      taxRate: updated.taxRate,
      tax: updated.tax,
      discount: updated.discount,
      shipping: updated.shipping,
      total: updated.total,
      status: updated.status,
      validUntil: updated.validUntil?.toISOString(),
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt?.toISOString(),
      sentAt: updated.sentAt?.toISOString(),
      acceptedAt: updated.acceptedAt?.toISOString(),
      pdfUrl: updated.pdfUrl,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Quotation status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}