import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

// Helper: safe query wrapper
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// Helper: safe date to ISO string
function toISO(date: unknown): string | null {
  if (date == null) return null;
  return new Date(date as string | Date).toISOString();
}

// ============ GET: Today's activity timeline for a technician ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // --- Auth ---
    const auth = verifyRouteAuth(request, { feature: 'technicians' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { id } = await params;

    // Verify technician exists
    const tech: any = await safeQuery(
      () => db.user.findFirst({
        where: { id, tenantId, isActive: true, role: { in: ['technician', 'supervisor'] } },
        select: { id: true, name: true },
      }),
      null,
    );

    if (!tech) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    // --- Time range: today ---
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Get complaint IDs assigned to this tech (instead of using nested relation in WHERE)
    const techComplaintIds: string[] = await safeQuery(
      () => db.complaint.findMany({
        where: { assignedToId: id, tenantId },
        select: { id: true },
      }).then((rows: any[]) => rows.map((r: any) => r.id)),
      [],
    );

    // --- Parallel: attendance + complaint timeline ---
    const [attendance, timelineEntries]: [any, any[]] = await Promise.all([
      // Today's attendance record
      safeQuery(
        () => db.attendance.findFirst({
          where: {
            userId: id,
            tenantId,
            date: { gte: todayStart, lt: todayEnd },
          },
          select: {
            id: true, checkIn: true, checkOut: true, status: true, hoursWorked: true,
          },
        }),
        null,
      ),

      // Today's complaint timeline entries (use complaintIds instead of relation filter)
      safeQuery(
        () => techComplaintIds.length > 0
          ? db.complaintTimeline.findMany({
              where: {
                complaintId: { in: techComplaintIds },
                createdAt: { gte: todayStart, lt: todayEnd },
              },
              select: {
                id: true, complaintId: true, action: true, fromStatus: true,
                toStatus: true, description: true, performedBy: true,
                performedByRole: true, createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            })
          : Promise.resolve([]),
        [],
      ),
    ]);

    // Fetch complaint details for timeline entries separately
    const timelineComplaintIds = [...new Set((timelineEntries || []).map((e: any) => e.complaintId).filter(Boolean))] as string[];
    const timelineComplaints: any[] = await safeQuery(
      () => timelineComplaintIds.length > 0
        ? db.complaint.findMany({
            where: { id: { in: timelineComplaintIds } },
            select: { id: true, title: true, status: true },
          })
        : Promise.resolve([]),
      [],
    );
    const complaintMap = new Map(timelineComplaints.map((c: any) => [c.id, c]));

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
        time: toISO(attendance.checkIn)!,
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

    for (const entry of (timelineEntries || [])) {
      const complaint = complaintMap.get(entry.complaintId);
      const complaintTitle = complaint?.title || 'Unknown Complaint';
      const descFn = actionDescriptions[entry.action];
      const description = descFn
        ? descFn({ title: complaintTitle })
        : entry.description || `${entry.action}: ${complaintTitle}`;

      timeline.push({
        time: toISO(entry.createdAt)!,
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
          complaintStatus: complaint?.status,
        },
      });
    }

    // Attendance: check-out (add last if exists)
    if (attendance?.checkOut) {
      timeline.push({
        time: toISO(attendance.checkOut)!,
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
    const checkInTime = toISO(attendance?.checkIn);
    const checkOutTime = toISO(attendance?.checkOut);
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
