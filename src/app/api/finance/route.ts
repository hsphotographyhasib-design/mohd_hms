import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    const [
      paidRevenue,
      pendingRevenue,
      overdueRevenue,
      expenseResult,
      outstandingInvoices,
      allInvoices,
      expenseInvoices,
    ] = await Promise.all([
      // Total revenue from PAID invoices
      db.invoice.aggregate({
        where: { tenantId, status: 'PAID' },
        _sum: { total: true },
      }),
      // Pending revenue (PENDING + APPROVED)
      db.invoice.aggregate({
        where: { tenantId, status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { total: true },
      }),
      // Overdue revenue
      db.invoice.aggregate({
        where: { tenantId, status: 'OVERDUE' },
        _sum: { total: true },
      }),
      // Expenses from work order costs
      db.workOrder.aggregate({
        where: { tenantId, status: 'COMPLETED' },
        _sum: { totalCost: true },
      }),
      // Outstanding invoices count and amount
      db.invoice.aggregate({
        where: { tenantId, status: { in: ['PENDING', 'APPROVED', 'OVERDUE'] } },
        _count: true,
        _sum: { total: true },
      }),
      // All invoices for monthly P&L revenue
      db.invoice.findMany({
        where: { tenantId, status: 'PAID', paidAt: { not: null } },
        select: { total: true, paidAt: true },
      }),
      // All completed work orders for monthly P&L expenses
      db.workOrder.findMany({
        where: { tenantId, status: 'COMPLETED', completedAt: { not: null } },
        select: { totalCost: true, completedAt: true },
      }),
    ]);

    // Monthly P&L for last 6 months
    const now = new Date();
    const monthlyPL: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const monthRevenue = allInvoices
        .filter((inv) => {
          const paid = new Date(inv.paidAt!);
          return paid >= d && paid <= end;
        })
        .reduce((sum, inv) => sum + inv.total, 0);

      const monthExpenses = expenseInvoices
        .filter((wo) => {
          const completed = new Date(wo.completedAt!);
          return completed >= d && completed <= end;
        })
        .reduce((sum, wo) => sum + (wo.totalCost || 0), 0);

      monthlyPL.push({
        month: monthName,
        revenue: Math.round(monthRevenue * 100) / 100,
        expenses: Math.round(monthExpenses * 100) / 100,
        profit: Math.round((monthRevenue - monthExpenses) * 100) / 100,
      });
    }

    return NextResponse.json({
      totalRevenue: paidRevenue._sum.total || 0,
      pendingRevenue: pendingRevenue._sum.total || 0,
      overdueRevenue: overdueRevenue._sum.total || 0,
      totalExpenses: expenseResult._sum.totalCost || 0,
      outstandingInvoices: outstandingInvoices._count || 0,
      outstandingAmount: outstandingInvoices._sum.total || 0,
      monthlyPL,
    });
  } catch (error) {
    console.error('Finance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
