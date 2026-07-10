import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { id } = await params;

    // Verify the service item belongs to this tenant
    const serviceItem = await db.serviceItem.findFirst({
      where: { id, tenantId },
    });
    if (!serviceItem) {
      return NextResponse.json({ error: 'Service item not found' }, { status: 404 });
    }

    const checklistItems = await db.serviceChecklistItem.findMany({
      where: { serviceItemId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ data: checklistItems });
  } catch (error) {
    console.error('Service checklist list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { id } = await params;
    const body = await request.json();
    const { task, description, sortOrder } = body;

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    // Verify the service item belongs to this tenant
    const serviceItem = await db.serviceItem.findFirst({
      where: { id, tenantId },
    });
    if (!serviceItem) {
      return NextResponse.json({ error: 'Service item not found' }, { status: 404 });
    }

    const checkItem = await db.serviceChecklistItem.create({
      data: {
        serviceItemId: id,
        task,
        description: description || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(checkItem, { status: 201 });
  } catch (error) {
    console.error('Service checklist create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}