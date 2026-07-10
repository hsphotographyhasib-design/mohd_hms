import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const items = await db.hrExpenseClaim.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { user: { select: { name: true } } } } } });
    const data = items.map((e) => ({
      id: e.id, employeeName: e.employee?.user?.name || '—', category: e.category,
      amount: e.amount, description: e.description, receiptUrl: e.receiptUrl,
      expenseDate: e.expenseDate.toISOString(), status: e.status,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR expenses list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    if (!body.amount || !body.expenseDate) return NextResponse.json({ error: 'Amount and date required' }, { status: 400 });
    let employeeId = '';
    if (body.employeeName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.employeeName } } });
      if (emp) employeeId = emp.id;
    }
    const item = await db.hrExpenseClaim.create({
      data: { tenantId, employeeId: employeeId || '', category: body.category || 'other', amount: parseFloat(body.amount), description: body.description || '', receiptUrl: body.receiptUrl || null, expenseDate: new Date(body.expenseDate) },
    });
    return NextResponse.json({ id: item.id, message: 'Expense submitted' }, { status: 201 });
  } catch (error) { console.error('HR expenses create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}