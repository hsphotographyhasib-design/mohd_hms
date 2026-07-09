import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/dashboard
 *
 * Combined dashboard endpoint for customer portal.
 * Returns complaints, work-orders, and invoices in a SINGLE database
 * connection/session, eliminating the connection storm caused by
 * firing 3 separate API routes simultaneously on page load.
 *
 * Each separate API route spins up its own Vercel serverless function,
 * each creating its own DB connection. With Prisma Postgres's limited
 * connection pool, this causes P2037 "too many connections".
 *
 * This endpoint does everything in one function instance.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth (JWT-only, no DB)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = payload.userId as string;
    const tenantId = payload.tenantId as string;
    const role = (payload.role as string)?.toLowerCase();

    if (role !== 'customer' || !userId || !tenantId) {
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 });
    }

    // 2. Resolve customer ID + profile in a single transaction-like sequence
    //    All queries use the same Prisma client (same pool connection).
    const user = await withRetry(
      () =>
        db.user.findUnique({
          where: { id: userId },
          select: { email: true, phone: true, name: true, isActive: true },
        }),
      { label: 'customer-dashboard-user' }
    );

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Find linked Customer record
    const customer = await withRetry(
      () =>
        db.customer.findFirst({
          where: {
            tenantId,
            OR: [
              ...(user.email ? [{ email: user.email }] : []),
              ...(user.phone ? [{ phone: user.phone }] : []),
            ],
          },
          select: { id: true, name: true },
        }),
      { label: 'customer-dashboard-customer' }
    );

    const customerId = customer?.id ?? null;

    // 3. Fetch all dashboard data using the same connection
    //    Sequential queries within one function instance = 1 connection
    const [complaints, complaintsTotal, workOrders, workOrdersTotal, invoices, invoicesTotal] =
      await withRetry(
        () =>
          Promise.all([
            // Complaints (last 5)
            db.complaint.findMany({
              where: {
                tenantId,
                ...(customerId ? { customerId } : {}),
              },
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                category: true,
                createdAt: true,
                complaintNumber: true,
              },
            }),
            db.complaint.count({
              where: {
                tenantId,
                ...(customerId ? { customerId } : {}),
              },
            }),
            // Work Orders (last 5)
            db.workOrder.findMany({
              where: {
                tenantId,
                ...(customerId ? { customerId } : {}),
              },
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                createdAt: true,
                workOrderNumber: true,
              },
            }),
            db.workOrder.count({
              where: {
                tenantId,
                ...(customerId ? { customerId } : {}),
              },
            }),
            // Invoices (last 5)
            db.invoice.findMany({
              where: {
                tenantId,
                ...(customerId ? { customerId } : {}),
              },
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                total: true,
                createdAt: true,
                dueDate: true,
              },
            }),
            db.invoice.count({
              where: {
                tenantId,
                ...(customerId ? { customerId } : {}),
              },
            }),
          ]),
        { label: 'customer-dashboard-data' }
      );

    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        customerId,
        customerName: customer?.name,
      },
      complaints: {
        data: complaints,
        total: complaintsTotal,
      },
      workOrders: {
        data: workOrders,
        total: workOrdersTotal,
      },
      invoices: {
        data: invoices,
        total: invoicesTotal,
      },
    });
  } catch (error) {
    console.error('[Customer Dashboard] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}