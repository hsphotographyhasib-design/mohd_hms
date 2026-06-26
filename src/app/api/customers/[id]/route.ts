import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

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

    const customer = await db.customer.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { equipment: true, complaints: true, invoices: true } },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      companyName: customer.companyName,
      customerNumber: customer.customerNumber,
      photo: customer.photo,
      gpsLocation: customer.gpsLocation,
      isActive: customer.isActive,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      _count: customer._count,
    });
  } catch (error) {
    console.error('Customer get error:', error);
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

    const existing = await db.customer.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const updated = await db.customer.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.phone && { phone: body.phone }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.companyName !== undefined && { companyName: body.companyName || null }),
        ...(body.photo !== undefined && { photo: body.photo || null }),
        ...(body.gpsLocation !== undefined && { gpsLocation: body.gpsLocation || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        _count: { select: { equipment: true, complaints: true, invoices: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      companyName: updated.companyName,
      customerNumber: updated.customerNumber,
      photo: updated.photo,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      _count: updated._count,
    });
  } catch (error) {
    console.error('Customer update error:', error);
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

    const existing = await db.customer.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Customer delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
