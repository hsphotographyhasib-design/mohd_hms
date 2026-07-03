import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ensureTableSync } from '@/lib/db-sync';
export const dynamic = 'force-dynamic';

/**
 * GET /api/complaints/my-profile
 *
 * For logged-in customer users: finds or auto-creates their Customer record,
 * then returns their profile + distinct buildings + equipment grouped by building.
 *
 * For non-customer roles (admin, technician, etc.): returns null customer with
 * just the list of customers for the manual picker.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTableSync('Complaint');
    await ensureTableSync('Customer');
    await ensureTableSync('Equipment');

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const userRole = payload.role as string;
    const userEmail = payload.email as string;

    // ─── Customer Role: auto-fill their profile ───
    if (userRole === 'customer') {
      // Step 1: Find User to get phone
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, tenantId: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Step 2: Find Customer record matching this user (by email or phone within tenant)
      let customer = await db.customer.findFirst({
        where: {
          tenantId,
          OR: [
            ...(userEmail ? [{ email: userEmail }] : []),
            ...(user.phone ? [{ phone: user.phone }] : []),
          ],
        },
      });

      // Step 3: Auto-create Customer if none exists
      let wasAutoCreated = false;
      if (!customer) {
        const count = await db.customer.count({ where: { tenantId } });
        const customerNumber = `CUST-${String(count + 1).padStart(6, '0')}`;

        customer = await db.customer.create({
          data: {
            tenantId,
            name: user.name,
            email: user.email || userEmail || null,
            phone: user.phone || '',
            customerNumber,
            country: 'Brunei',
            isActive: true,
          },
        });
        wasAutoCreated = true;
      }

      // Step 4: Fetch equipment for this customer (single query)
      const equipment = await db.equipment.findMany({
        where: {
          tenantId,
          customerId: customer.id,
          status: { in: ['active', 'under_maintenance'] },
        },
        select: {
          id: true,
          name: true,
          category: true,
          assetNumber: true,
          brand: true,
          model: true,
          building: true,
          room: true,
          location: true,
          status: true,
          condition: true,
        },
        orderBy: [{ building: 'asc' }, { name: 'asc' }],
      });

      // Step 5: Derive buildings from equipment
      const buildingMap = new Map<string, { label: string; equipmentCount: number }>();
      for (const eq of equipment) {
        const bldg = eq.building || 'Unassigned';
        if (!buildingMap.has(bldg)) {
          buildingMap.set(bldg, { label: bldg, equipmentCount: 0 });
        }
        buildingMap.get(bldg)!.equipmentCount++;
      }
      const buildings = Array.from(buildingMap.values());

      return NextResponse.json({
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          companyName: customer.companyName,
          customerNumber: customer.customerNumber,
          pic: customer.pic,
          country: customer.country,
          district: customer.district,
          gpsLocation: customer.gpsLocation,
          wasAutoCreated,
        },
        buildings,
        equipment,
      });
    }

    // ─── Non-Customer Role: return empty profile (they use manual picker) ───
    return NextResponse.json({
      customer: null,
      buildings: [],
      equipment: [],
    });
  } catch (error) {
    console.error('My profile error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to load profile', details: msg }, { status: 500 });
  }
}