import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============ GET: Assignment history for a complaint ============

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
    const userRole = payload.role as string;
    const { id } = await params;

    // Any authenticated user can view assignment history
    if (!['super_admin', 'admin', 'supervisor', 'manager', 'technician', 'finance'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 50);
    const offset = (page - 1) * pageSize;

    // Get the complaint
    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        assignedAt: true,
        assignmentStatus: true,
        reassignmentCount: true,
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Get assignment timeline entries (assigned, reassigned, accept, reject)
    const timelineEntries = await db.complaintTimeline.findMany({
      where: {
        complaintId: id,
        tenantId,
        action: { in: ['assigned', 'reassigned', 'accepted', 'rejected'] },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize,
    });

    // Get total count
    const totalCount = await db.complaintTimeline.count({
      where: {
        complaintId: id,
        tenantId,
        action: { in: ['assigned', 'reassigned', 'accepted', 'rejected'] },
      },
    });

    // Enrich timeline with performer names
    const userIds = [...new Set(
      timelineEntries
        .map(e => e.performedBy)
        .filter(Boolean) as string[]
    )];

    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true, avatar: true, employeeNumber: true },
        })
      : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    // Parse metadata and build enriched entries
    const entries = timelineEntries.map(entry => {
      let metadata: any = {};
      try {
        metadata = entry.metadata ? JSON.parse(entry.metadata) : {};
      } catch { /* ignore */ }

      const performer = entry.performedBy ? userMap.get(entry.performedBy) : null;

      return {
        id: entry.id,
        action: entry.action,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
        performedBy: performer ? {
          id: performer.id,
          name: performer.name,
          role: performer.role,
          avatar: performer.avatar,
          employeeNumber: performer.employeeNumber,
        } : null,
        metadata: {
          technicianId: metadata.technicianId,
          technicianName: metadata.technicianName,
          previousTechnicianId: metadata.previousTechnicianId,
          previousTechnicianName: metadata.previousTechnicianName,
          isReassignment: metadata.isReassignment,
          reason: metadata.reason,
          reassignmentCount: metadata.reassignmentCount,
          slaResponseDeadline: metadata.slaResponseDeadline,
        },
      };
    });

    // Get current assignment summary
    const currentAssignee = complaint.assignedToId
      ? await db.user.findFirst({
          where: { id: complaint.assignedToId },
          select: { id: true, name: true, role: true, avatar: true, employeeNumber: true, department: { select: { name: true } } },
        })
      : null;

    return NextResponse.json({
      complaint: {
        id: complaint.id,
        title: complaint.title,
        currentAssignment: currentAssignee ? {
          ...currentAssignee,
          assignedAt: complaint.assignedAt?.toISOString() || null,
          assignmentStatus: complaint.assignmentStatus,
        } : null,
        reassignmentCount: complaint.reassignmentCount,
      },
      entries,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('Assignment history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}