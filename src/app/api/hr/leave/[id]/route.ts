import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/core/auth/auth-lib';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tenantId = auth.user.tenantId as string;
    const currentUserId = auth.user.userId as string;
    const body = await request.json();
    const { action, reason } = body;

    const leaveRequest = await db.hrLeaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: { select: { name: true } },
      },
    });

    if (!leaveRequest || leaveRequest.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Supervisor approval (first step)
      if (leaveRequest.status === 'PENDING') {
        const updated = await db.hrLeaveRequest.update({
          where: { id },
          data: {
            status: 'SUPERVISOR_APPROVED',
            supervisorId: currentUserId,
            supervisorApprovedAt: new Date(),
          },
        });
        return NextResponse.json({
          id: updated.id,
          status: updated.status,
          supervisorApprovedAt: updated.supervisorApprovedAt?.toISOString(),
        });
      }

      // HR approval (second step)
      if (leaveRequest.status === 'SUPERVISOR_APPROVED') {
        const updated = await db.hrLeaveRequest.update({
          where: { id },
          data: {
            status: 'HR_APPROVED',
            hrOfficerId: currentUserId,
            hrApprovedAt: new Date(),
          },
        });

        // Deduct from leave balance
        const year = leaveRequest.startDate.getFullYear();
        const existing = await db.hrLeaveBalance.findUnique({
          where: {
            tenantId_employeeId_leaveTypeId_year: {
              tenantId: leaveRequest.tenantId,
              employeeId: leaveRequest.employeeId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year,
            },
          },
        });

        if (existing) {
          await db.hrLeaveBalance.update({
            where: { id: existing.id },
            data: { usedDays: { increment: leaveRequest.days } },
          });
        } else {
          // Create balance record if it doesn't exist
          await db.hrLeaveBalance.create({
            data: {
              tenantId: leaveRequest.tenantId,
              employeeId: leaveRequest.employeeId,
              leaveTypeId: leaveRequest.leaveTypeId,
              totalDays: 0,
              usedDays: leaveRequest.days,
              carriedDays: 0,
              year,
            },
          });
        }

        // Create attendance records as leave
        const current = new Date(leaveRequest.startDate);
        const endDate = new Date(leaveRequest.endDate);
        while (current <= endDate) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) {
            const dateOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate());
            await db.attendance.upsert({
              where: {
                tenantId_userId_date: {
                  tenantId: leaveRequest.tenantId,
                  userId: leaveRequest.employeeId,
                  date: dateOnly,
                },
              },
              create: {
                tenantId: leaveRequest.tenantId,
                userId: leaveRequest.employeeId,
                date: dateOnly,
                status: 'leave',
                notes: `Leave: ${leaveRequest.leaveType?.name} (${leaveRequest.reason || 'No reason'})`,
              },
              update: {
                status: 'leave',
                notes: `Leave: ${leaveRequest.leaveType?.name} (${leaveRequest.reason || 'No reason'})`,
              },
            });
          }
          current.setDate(current.getDate() + 1);
        }

        return NextResponse.json({
          id: updated.id,
          status: updated.status,
          hrApprovedAt: updated.hrApprovedAt?.toISOString(),
        });
      }

      return NextResponse.json({ error: `Cannot approve leave in ${leaveRequest.status} status` }, { status: 400 });
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      if (leaveRequest.status === 'HR_APPROVED') {
        return NextResponse.json({ error: 'Cannot reject an HR-approved leave' }, { status: 400 });
      }

      const updated = await db.hrLeaveRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedBy: currentUserId,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        rejectedAt: updated.rejectedAt?.toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 });
  } catch (error) {
    console.error('Leave approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}