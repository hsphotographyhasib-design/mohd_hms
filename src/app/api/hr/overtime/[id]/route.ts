import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tenantId = auth.user.tenantId as string;
    const userId = auth.user.id as string;
    const body = await request.json();
    const { action, reason } = body;

    const record = await db.hrOvertimeRequest.findFirst({
      where: { id, tenantId },
    });
    if (!record) {
      return NextResponse.json({ error: 'OT request not found' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    if (action === 'supervisor_approve') {
      if (record.status !== 'PENDING') {
        return NextResponse.json({ error: 'Only PENDING requests can be approved by supervisor' }, { status: 400 });
      }
      updateData = {
        status: 'SUPERVISOR_APPROVED',
        supervisorId: userId,
        supervisorApprovedAt: new Date(),
      };
    } else if (action === 'hr_approve') {
      if (record.status !== 'SUPERVISOR_APPROVED') {
        return NextResponse.json({ error: 'Only supervisor-approved requests can be approved by HR' }, { status: 400 });
      }
      updateData = {
        status: 'HR_APPROVED',
        hrOfficerId: userId,
        hrApprovedAt: new Date(),
      };
    } else if (action === 'reject') {
      if (!['PENDING', 'SUPERVISOR_APPROVED'].includes(record.status)) {
        return NextResponse.json({ error: 'This request cannot be rejected' }, { status: 400 });
      }
      updateData = {
        status: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date(),
        reason: reason || record.reason,
      };
    } else {
      // General update
      const { hours, date: dateVal, reason: reasonVal } = body;
      if (hours !== undefined) updateData.hours = hours;
      if (dateVal) updateData.date = new Date(dateVal);
      if (reasonVal !== undefined) updateData.reason = reasonVal;

      // Recalculate totalPay if hours changed
      if (hours !== undefined && record.rate) {
        updateData.totalPay = Math.round(hours * record.rate * 1.5 * 100) / 100;
      }
    }

    const updated = await db.hrOvertimeRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated, message: 'OT request updated' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}