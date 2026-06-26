import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const headersList = await headers();
  const auth = headersList.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

function isAdmin(user: JwtPayload | null): user is JwtPayload {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'admin';
}

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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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