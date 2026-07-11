import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { generateCustomerNumber } from '@/core/auth/auth-lib';
export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/self
 *
 * Returns the Customer record linked to the authenticated user.
 * For customer-role users only.
 *
 * - If a Customer record matching the user's email or phone exists → return it
 * - If no matching Customer record exists → AUTO-CREATE one from the user's
 *   profile data and return the new record
 *
 * This endpoint powers the customer auto-linking in new-complaint.tsx
 * and ensures customer-role users can always create complaints.
 */
export async function GET(request: NextRequest) {
  try {
    // Use roles gate — any authenticated customer can access their own profile
    const auth = verifyRouteAuth(request, { roles: ['customer'] });
    if (auth.error) return auth.error;

    const { userId, tenantId, role } = auth;

    // Look up the user to get full profile info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to find existing Customer record by email or phone
    const orConditions: Record<string, string>[] = [];
    if (user.email) orConditions.push({ email: user.email });
    if (user.phone) orConditions.push({ phone: user.phone });

    let customer = orConditions.length > 0
      ? await db.customer.findFirst({
          where: { tenantId, OR: orConditions },
        })
      : null;

    // Auto-create if no matching Customer record exists
    if (!customer) {
      customer = await db.customer.create({
        data: {
          tenantId,
          name: user.name || 'Customer',
          email: user.email || null,
          phone: user.phone || null,
          customerNumber: generateCustomerNumber(),
          isActive: true,
        },
      });
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
      isActive: customer.isActive,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Customer self-link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}