import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

function formatMessage(m: {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  source: string;
  status: string;
  assignedToId: string | null;
  reply: string | null;
  replyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    tenantId: m.tenantId,
    name: m.name,
    email: m.email,
    phone: m.phone,
    subject: m.subject,
    message: m.message,
    source: m.source,
    status: m.status,
    assignedToId: m.assignedToId,
    reply: m.reply,
    replyAt: m.replyAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;

    const contactMessage = await db.cmsContactMessage.findFirst({ where: { id, tenantId } });
    if (!contactMessage) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    return NextResponse.json({ data: formatMessage(contactMessage) });
  } catch (error) {
    console.error('CMS contact message GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.cmsContactMessage.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const updated = await db.cmsContactMessage.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
        ...(body.reply !== undefined && {
          reply: body.reply || null,
          replyAt: body.reply ? new Date() : null,
        }),
      },
    });

    return NextResponse.json(formatMessage(updated));
  } catch (error) {
    console.error('CMS contact message PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}