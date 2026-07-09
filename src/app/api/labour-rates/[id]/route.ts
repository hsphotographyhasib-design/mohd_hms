import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const rate = await db.labourRate.findFirst({ where: { id, tenantId: payload.tenantId as string } });
    if (!rate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rate);
  } catch (error) {
    console.error('Labour rate get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const rate = await db.labourRate.update({
      where: { id },
      data: {
        labourCode: body.labourCode !== undefined ? body.labourCode : undefined,
        technicianGrade: body.technicianGrade || undefined,
        skillLevel: body.skillLevel || undefined,
        hourlyCost: body.hourlyCost !== undefined ? body.hourlyCost : undefined,
        hourlyCharge: body.hourlyCharge !== undefined ? body.hourlyCharge : undefined,
        overtimeRate: body.overtimeRate !== undefined ? body.overtimeRate : undefined,
        weekendRate: body.weekendRate !== undefined ? body.weekendRate : undefined,
        holidayRate: body.holidayRate !== undefined ? body.holidayRate : undefined,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
        status: body.status || undefined,
      },
    });
    return NextResponse.json(rate);
  } catch (error) {
    console.error('Labour rate update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await db.labourRate.update({ where: { id }, data: { status: 'inactive' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Labour rate delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}