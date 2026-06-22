import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const broadcast = await db.broadcastLog.findFirst({
      where: { id, tenantId },
      include: {
        template: { select: { id: true, name: true, category: true, content: true } },
      },
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: broadcast.id,
      tenantId: broadcast.tenantId,
      title: broadcast.title,
      content: broadcast.content,
      templateId: broadcast.templateId,
      template: broadcast.template ? {
        id: broadcast.template.id,
        name: broadcast.template.name,
        category: broadcast.template.category,
        content: broadcast.template.content,
      } : null,
      recipientCount: broadcast.recipientCount,
      sentCount: broadcast.sentCount,
      deliveredCount: broadcast.deliveredCount,
      failedCount: broadcast.failedCount,
      readCount: broadcast.readCount,
      status: broadcast.status,
      scheduledAt: broadcast.scheduledAt?.toISOString() || null,
      sentAt: broadcast.sentAt?.toISOString() || null,
      completedAt: broadcast.completedAt?.toISOString() || null,
      createdBy: broadcast.createdBy,
      createdAt: broadcast.createdAt.toISOString(),
      updatedAt: broadcast.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp campaign detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;
    const body = await req.json();

    const broadcast = await db.broadcastLog.findFirst({ where: { id, tenantId } });
    if (!broadcast) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined) data.content = body.content;
    if (body.templateId !== undefined) data.templateId = body.templateId;
    if (body.recipientCount !== undefined) data.recipientCount = body.recipientCount;

    // Status transitions
    if (body.status !== undefined) {
      const validTransitions: Record<string, string[]> = {
        draft: ['scheduled', 'sending'],
        scheduled: ['draft', 'sending', 'failed'],
        sending: ['completed', 'failed'],
        completed: [],
        failed: ['draft', 'scheduled'],
      };
      const allowed = validTransitions[broadcast.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${broadcast.status} to ${body.status}` },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    const updated = await db.broadcastLog.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      title: updated.title,
      content: updated.content,
      templateId: updated.templateId,
      recipientCount: updated.recipientCount,
      sentCount: updated.sentCount,
      deliveredCount: updated.deliveredCount,
      failedCount: updated.failedCount,
      readCount: updated.readCount,
      status: updated.status,
      scheduledAt: updated.scheduledAt?.toISOString() || null,
      sentAt: updated.sentAt?.toISOString() || null,
      completedAt: updated.completedAt?.toISOString() || null,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp campaign update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const broadcast = await db.broadcastLog.findFirst({ where: { id, tenantId } });
    if (!broadcast) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (broadcast.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft campaigns can be deleted' }, { status: 400 });
    }

    await db.broadcastLog.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('WhatsApp campaign delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}