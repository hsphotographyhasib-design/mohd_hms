import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
export const dynamic = 'force-dynamic';

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
    const { id } = await params;
    const body = await request.json();
    const { rating, feedback } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Find the work order
    const workOrder = await db.workOrder.findFirst({
      where: { id, tenantId },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Update the linked complaint's customer feedback if a complaint exists
    if (workOrder.complaintId) {
      await db.complaint.update({
        where: { id: workOrder.complaintId },
        data: {
          customerRating: rating,
          customerFeedback: feedback || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      workOrderId: id,
      rating,
    });
  } catch (error) {
    console.error('Work order feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}