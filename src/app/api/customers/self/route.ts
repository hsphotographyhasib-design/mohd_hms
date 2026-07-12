import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { generateCustomerNumber } from '@/core/auth/auth-lib';
import { invalidateCustomerCache } from '@/core/permissions/rbac/complaint-access';
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

    const { userId, tenantId } = auth;

    // Look up the user to get full profile info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to find existing Customer record by email, phone, or userId link
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
      // Customer.phone is a required field in the schema.
      // User.phone is optional, so we must provide a fallback.
      const customerPhone = user.phone || 'N/A';

      // Generate a unique customer number with retry on collision
      let customerNumber = generateCustomerNumber();
      let retries = 0;
      const MAX_RETRIES = 5;

      while (retries < MAX_RETRIES) {
        try {
          customer = await db.customer.create({
            data: {
              tenantId,
              name: user.name || 'Customer',
              email: user.email || null,
              phone: customerPhone,
              customerNumber,
              isActive: true,
            },
          });
          break;
        } catch (createError: any) {
          // Retry on unique constraint violation for customerNumber
          if (createError?.code === 'P2002' && retries < MAX_RETRIES - 1) {
            customerNumber = generateCustomerNumber();
            retries++;
            continue;
          }
          throw createError;
        }
      }

      if (!customer) {
        return NextResponse.json(
          { error: 'Failed to create customer profile after retries' },
          { status: 500 }
        );
      }

      // Invalidate customer cache so subsequent RBAC queries find the new record
      invalidateCustomerCache(tenantId, user.email || undefined, user.phone || undefined);
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
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}