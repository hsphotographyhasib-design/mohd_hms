import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'finance' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    // Helper: safe aggregate that returns 0 on error (e.g. table doesn't exist)
    async function safeAggregate(
      model: 'invoice' | 'workOrder',
      args: { where?: Record<string, unknown>; _sum?: Record<string, unknown>; _count?: Record<string, unknown> }
    ) {
      try {
        return await db[model].aggregate(args as any);
      } catch {
        // Table might not exist in Supabase yet
        return { _sum: {}, _count: args._count ? { _all: 0 } : undefined };
      }
    }

    async function safeFindMany(
      model: 'invoice' | 'workOrder',
      args: { where?: Record<string, unknown>; select?: Record<string, unknown> }
    ) {
      try {
        return await db[model].findMany(args as any);
      } catch {
        return [];
      }
    }

    const [
      paidRevenue,
      pendingRevenue,
      overdueRevenue,
      expenseResult,
      outstandingInvoices,
      allPaidInvoices,
      expenseWorkOrders,
      allInvoices,
    ] = await Promise.all([
      // Total revenue from PAID invoices
      safeAggregate('invoice', {
        where: { tenantId, status: 'PAID' },
        _sum: { total: true },
      }),
      // Pending revenue (PENDING + APPROVED)
      safeAggregate('invoice', {
        where: { tenantId, status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { total: true },
      }),
      // Overdue revenue
      safeAggregate('invoice', {
        where: { tenantId, status: 'OVERDUE' },
        _sum: { total: true },
      }),
      // Expenses from work order costs
      safeAggregate('workOrder', {
        where: { tenantId, status: 'COMPLETED' },
        _sum: { totalCost: true },
      }),
      // Outstanding invoices count and amount
      safeAggregate('invoice', {
        where: { tenantId, status: { in: ['PENDING', 'APPROVED', 'OVERDUE'] } },
        _count: true as any,
        _sum: { total: true },
      }),
      // All paid invoices for monthly revenue
      safeFindMany('invoice', {
        where: { tenantId, status: 'PAID', paidAt: { not: null } },
        select: { total: true, paidAt: true },
      }),
      // All completed work orders for monthly expenses
      safeFindMany('workOrder', {
        where: { tenantId, status: 'COMPLETED', completedAt: { not: null } },
        select: { totalCost: true, completedAt: true },
      }),
      // All invoices for status counts
      safeFindMany('invoice', {
        where: { tenantId },
        select: { status: true },
      }),
    ]);

    const totalRevenue = (paidRevenue._sum?.total as number) || 0;
    const pendingAmount = (pendingRevenue._sum?.total as number) || 0;
    const overdueAmount = (overdueRevenue._sum?.total as number) || 0;
    const totalExpenses = (expenseResult._sum?.totalCost as number) || 0;
    const outstandingAmount = (outstandingInvoices._sum?.total as number) || 0;

    // Collection rate: totalRevenue / (totalRevenue + outstandingAmount)
    const totalBilled = totalRevenue + outstandingAmount;
    const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

    // Monthly revenue for last 6 months
    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const monthRevenue = (allPaidInvoices as any[])
        .filter((inv: any) => {
          try {
            const paid = new Date(inv.paidAt);
            return paid >= d && paid <= end;
          } catch {
            return false;
          }
        })
        .reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);

      monthlyRevenue.push({
        month: monthName,
        revenue: Math.round(monthRevenue * 100) / 100,
      });
    }

    // Invoice status counts
    const statusCountMap = new Map<string, number>();
    for (const inv of allInvoices as any[]) {
      const s = inv.status || 'DRAFT';
      statusCountMap.set(s, (statusCountMap.get(s) || 0) + 1);
    }
    const invoiceStatusCounts = [
      { status: 'DRAFT', count: statusCountMap.get('DRAFT') || 0 },
      { status: 'PENDING', count: statusCountMap.get('PENDING') || 0 },
      { status: 'APPROVED', count: statusCountMap.get('APPROVED') || 0 },
      { status: 'PAID', count: statusCountMap.get('PAID') || 0 },
      { status: 'OVERDUE', count: statusCountMap.get('OVERDUE') || 0 },
      { status: 'CANCELLED', count: statusCountMap.get('CANCELLED') || 0 },
    ];

    return NextResponse.json({
      totalRevenue,
      pendingRevenue: pendingAmount,
      outstandingAmount,
      collectionRate: Math.round(collectionRate * 10) / 10,
      totalExpenses,
      monthlyRevenue,
      invoiceStatusCounts,
    });
  } catch (error) {
    console.error('Finance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}