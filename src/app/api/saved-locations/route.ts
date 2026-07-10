import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Helper: resolve the customer ID for a customer-role user.
 * Looks up the Customer record linked to the user by email or phone.
 */
async function resolveCustomerId(tenantId: string, userId: string): Promise<string | null> {
  return withRetry(
    async () => {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true },
      });
      if (!user) return null;

      const linked = await db.customer.findFirst({
        where: {
          tenantId,
          OR: [
            ...(user.email ? [{ email: user.email }] : []),
            ...(user.phone ? [{ phone: user.phone }] : []),
          ],
        },
        select: { id: true },
      });
      return linked?.id ?? null;
    },
    { label: 'saved-locations-resolveCustomerId' }
  );
}

// ─── GET: List saved locations for the current customer ───
export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'equipment' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    if (role !== 'customer') {
      return NextResponse.json({ error: 'Only customers can manage saved locations' }, { status: 403 });
    }

    const customerId = await resolveCustomerId(tenantId, userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const locations = await withRetry(
      () =>
        db.savedLocation.findMany({
          where: { tenantId, customerId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        }),
      { label: 'saved-locations-GET' }
    );

    return NextResponse.json({ data: locations });
  } catch (error) {
    console.error('[SavedLocations GET] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}

// ─── POST: Create a saved location ───
export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'equipment' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    if (role !== 'customer') {
      return NextResponse.json({ error: 'Only customers can manage saved locations' }, { status: 403 });
    }

    const customerId = await resolveCustomerId(tenantId, userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { label, building, floor, unit, address, district, postalCode, latitude, longitude, accuracy, googlePlaceId, fullAddress, isDefault } = body;

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    // If setting as default, unset any existing default for this customer
    if (isDefault) {
      await withRetry(
        () =>
          db.savedLocation.updateMany({
            where: { tenantId, customerId, isDefault: true },
            data: { isDefault: false },
          }),
        { label: 'saved-locations-clearDefault' }
      );
    }

    const location = await withRetry(
      () =>
        db.savedLocation.create({
          data: {
            tenantId,
            customerId,
            label: label.trim(),
            building: building || null,
            floor: floor || null,
            unit: unit || null,
            address: address || null,
            district: district || null,
            postalCode: postalCode || null,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            accuracy: accuracy ?? null,
            googlePlaceId: googlePlaceId || null,
            fullAddress: fullAddress || null,
            isDefault: isDefault ?? false,
          },
        }),
      { label: 'saved-locations-POST' }
    );

    return NextResponse.json({ data: location }, { status: 201 });
  } catch (error) {
    console.error('[SavedLocations POST] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}

// ─── PUT: Update a saved location ───
export async function PUT(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'equipment' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    if (role !== 'customer') {
      return NextResponse.json({ error: 'Only customers can manage saved locations' }, { status: 403 });
    }

    const customerId = await resolveCustomerId(tenantId, userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, label, building, floor, unit, address, district, postalCode, latitude, longitude, accuracy, googlePlaceId, fullAddress, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await withRetry(
      () => db.savedLocation.findUnique({ where: { id } }),
      { label: 'saved-locations-findExisting' }
    );
    if (!existing || existing.tenantId !== tenantId || existing.customerId !== customerId) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // If setting as default, unset any existing default
    if (isDefault && !existing.isDefault) {
      await withRetry(
        () =>
          db.savedLocation.updateMany({
            where: { tenantId, customerId, isDefault: true },
            data: { isDefault: false },
          }),
        { label: 'saved-locations-clearDefault-PUT' }
      );
    }

    const location = await withRetry(
      () =>
        db.savedLocation.update({
          where: { id },
          data: {
            ...(label !== undefined ? { label: label.trim() } : {}),
            ...(building !== undefined ? { building: building || null } : {}),
            ...(floor !== undefined ? { floor: floor || null } : {}),
            ...(unit !== undefined ? { unit: unit || null } : {}),
            ...(address !== undefined ? { address: address || null } : {}),
            ...(district !== undefined ? { district: district || null } : {}),
            ...(postalCode !== undefined ? { postalCode: postalCode || null } : {}),
            ...(latitude !== undefined ? { latitude: latitude ?? null } : {}),
            ...(longitude !== undefined ? { longitude: longitude ?? null } : {}),
            ...(accuracy !== undefined ? { accuracy: accuracy ?? null } : {}),
            ...(googlePlaceId !== undefined ? { googlePlaceId: googlePlaceId || null } : {}),
            ...(fullAddress !== undefined ? { fullAddress: fullAddress || null } : {}),
            ...(isDefault !== undefined ? { isDefault } : {}),
          },
        }),
      { label: 'saved-locations-PUT' }
    );

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('[SavedLocations PUT] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}

// ─── DELETE: Remove a saved location ───
export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'equipment' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    if (role !== 'customer') {
      return NextResponse.json({ error: 'Only customers can manage saved locations' }, { status: 403 });
    }

    const customerId = await resolveCustomerId(tenantId, userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await withRetry(
      () => db.savedLocation.findUnique({ where: { id } }),
      { label: 'saved-locations-findExisting-DELETE' }
    );
    if (!existing || existing.tenantId !== tenantId || existing.customerId !== customerId) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    await withRetry(
      () => db.savedLocation.delete({ where: { id } }),
      { label: 'saved-locations-DELETE' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SavedLocations DELETE] Error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}