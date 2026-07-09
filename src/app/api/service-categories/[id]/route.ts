import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

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
    const { id } = await params;

    const category = await db.serviceCategory.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { services: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: 'Service category not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: category.id,
      tenantId: category.tenantId,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      subcategories: category.subcategories ? JSON.parse(category.subcategories) : [],
      isActive: category.isActive,
      serviceCount: category._count.services,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Service category get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    const existing = await db.serviceCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Service category not found' }, { status: 404 });

    const updated = await db.serviceCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.icon !== undefined && { icon: body.icon || null }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.subcategories !== undefined && {
          subcategories: Array.isArray(body.subcategories) ? JSON.stringify(body.subcategories) : null,
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      description: updated.description,
      icon: updated.icon,
      sortOrder: updated.sortOrder,
      subcategories: updated.subcategories ? JSON.parse(updated.subcategories) : [],
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Service category update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const existing = await db.serviceCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Service category not found' }, { status: 404 });

    await db.serviceCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Service category deleted successfully' });
  } catch (error) {
    console.error('Service category delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}