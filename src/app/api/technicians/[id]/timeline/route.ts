import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============ GET: Today's activity timeline for a technician ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // --- Auth ---
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    // Verify technician exists
    const tech = await db.user.findFirst({
      where: { id, tenantId, isActive: true, role: { in: ['technician', 'supervisor'] } },
      select: { id: true, name: true },
    });

    if (!tech) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    // --- Time range: today ---
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // --- Parallel: attendance + complaint timeline ---
    const [attendance, timelineEntries] = await Promise.all([
      // Today's attendance record
      db.attendance.findFirst({
        where: {
          userId: id,
          tenantId,
          date: { gte: todayStart, lt: todayEnd },
        },
        select: {
          id: true, checkIn: true, checkOut: true, status: true, hoursWorked: true,
        },
      }),

      // Today's complaint timeline entries
      db.complaintTimeline.findMany({
        where: {
          complaint: { assignedToId: id, tenantId },
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        select: {
          id: true, complaintId: true, action: true, fromStatus: true,
          toStatus: true, description: true, performedBy: true,
          performedByRole: true, createdAt: true,
          complaint: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // --- Build unified timeline ---
    type TimelineEntry = {
      time: string;
      actionType: string;
      description: string;
      entityId: string | null;
      entityType: string;
      metadata?: Record<string, unknown>;
    };

    const timeline: TimelineEntry[] = [];

    // Attendance: check-in
    if (attendance?.checkIn) {
      timeline.push({
        time: attendance.checkIn.toISOString(),
        actionType: 'check_in',
        description: `Checked in${attendance.status === 'late' ? ' (late)' : ''}`,
        entityId: attendance.id,
        entityType: 'attendance',
        metadata: {
          status: attendance.status,
          hoursWorked: attendance.hoursWorked,
        },
      });
    }

    // Complaint timeline entries
    const actionDescriptions: Record<string, (c: { title: string }, meta?: string) => string> = {
      created: (c) => `New complaint created: ${c.title}`,
      assigned: (c) => `Assigned to complaint: ${c.title}`,
      accepted: (c) => `Accepted complaint: ${c.title}`,
      rejected: (c) => `Rejected complaint: ${c.title}`,
      started: (c) => `Started work on: ${c.title}`,
      checklist_updated: (c) => `Updated checklist for: ${c.title}`,
      completed: (c) => `Completed work on: ${c.title}`,
      client_confirmed: (c) => `Client confirmed completion: ${c.title}`,
      client_rejected: (c) => `Client rejected completion: ${c.title}`,
      rework_required: (c) => `Rework required for: ${c.title}`,
      invoice_generated: (c) => `Invoice generated for: ${c.title}`,
      invoice_approved: (c) => `Invoice approved for: ${c.title}`,
      invoice_sent: (c) => `Invoice sent for: ${c.title}`,
      payment_received: (c) => `Payment received for: ${c.title}`,
      closed: (c) => `Complaint closed: ${c.title}`,
      status_override: (c) => `Status override for: ${c.title}`,
    };

    for (const entry of timelineEntries) {
      const complaintTitle = entry.complaint?.title || 'Unknown Complaint';
      const descFn = actionDescriptions[entry.action];
      const description = descFn
        ? descFn({ title: complaintTitle })
        : entry.description || `${entry.action}: ${complaintTitle}`;

      timeline.push({
        time: entry.createdAt.toISOString(),
        actionType: entry.action,
        description,
        entityId: entry.complaintId,
        entityType: 'complaint',
        metadata: {
          performedBy: entry.performedBy,
          performedByRole: entry.performedByRole,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          complaintTitle,
          complaintStatus: entry.complaint?.status,
        },
      });
    }

    // Attendance: check-out (add last if exists)
    if (attendance?.checkOut) {
      timeline.push({
        time: attendance.checkOut.toISOString(),
        actionType: 'check_out',
        description: `Checked out`,
        entityId: attendance.id,
        entityType: 'attendance',
        metadata: {
          status: attendance.status,
          hoursWorked: attendance.hoursWorked,
        },
      });
    }

    // Sort chronologically
    timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // --- Summary ---
    const checkInTime = attendance?.checkIn?.toISOString() || null;
    const checkOutTime = attendance?.checkOut?.toISOString() || null;
    const totalActivities = timeline.length;

    return NextResponse.json({
      technicianId: id,
      technicianName: tech.name,
      date: todayStart.toISOString().split('T')[0],
      attendance: {
        checkIn: checkInTime,
        checkOut: checkOutTime,
        hoursWorked: attendance?.hoursWorked ?? null,
        status: attendance?.status ?? null,
      },
      timeline,
      summary: {
        totalActivities,
        checkIns: timeline.filter(t => t.actionType === 'check_in').length,
        checkOuts: timeline.filter(t => t.actionType === 'check_out').length,
        complaintActivities: timeline.filter(t => t.entityType === 'complaint').length,
      },
    });
  } catch (error) {
    console.error('Technician timeline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}