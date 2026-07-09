import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const items = await db.hrAnnouncement.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    const data = items.map((a) => ({
      id: a.id, title: a.title, content: a.content, type: a.type, priority: a.priority,
      status: a.status, publishedBy: a.publishedBy, publishedAt: a.publishedAt?.toISOString(),
      createdAt: a.createdAt.toISOString(),
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR announcements list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const body = await request.json();
    if (!body.title || !body.content) return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    const isPublished = body.status === 'published';
    const item = await db.hrAnnouncement.create({
      data: { tenantId, title: body.title, content: body.content, type: body.type || 'info', priority: body.priority || 'normal', status: body.status || 'draft', publishedBy: isPublished ? (payload.userId || payload.sub) : null, publishedAt: isPublished ? new Date() : null },
    });
    return NextResponse.json({ id: item.id, message: 'Announcement created' }, { status: 201 });
  } catch (error) { console.error('HR announcements create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}