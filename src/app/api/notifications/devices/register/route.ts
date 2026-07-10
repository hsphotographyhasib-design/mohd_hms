import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * POST /api/notifications/devices/register
 *
 * Registers an FCM device token for the authenticated user.
 * - Production: proxies to Render backend
 * - Local dev: stores directly in local Prisma DB
 */
export async function POST(request: NextRequest) {
  // If backend URL is configured, proxy to it
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const body = await request.json();
      const res = await fetch(`${BACKEND_URL}/api/notifications/devices/register`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Device register proxy error:', error);
      return NextResponse.json({ success: true }); // Don't fail the login flow
    }
  }

  // ── Local dev: store directly in Prisma ──
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token: fcmToken, platform, browser, os, deviceName, userAgent } = body;

    if (!fcmToken) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 });
    }

    const userId = auth.userId;
    const tenantId = auth.tenantId;

    // Get client IP (best effort)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    // Upsert: if token already exists (same device), reactivate it
    // Otherwise create new record
    const existing = await db.deviceToken.findUnique({
      where: { token: fcmToken },
    });

    if (existing) {
      // Update existing — reactivate and update metadata
      await db.deviceToken.update({
        where: { id: existing.id },
        data: {
          userId,
          tenantId,
          platform: platform || 'web',
          browser: browser || null,
          os: os || null,
          deviceName: deviceName || null,
          userAgent: userAgent || null,
          ipAddress: ip,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    } else {
      // Deactivate all previous tokens for this user (they're stale)
      await db.deviceToken.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Create new token record
      await db.deviceToken.create({
        data: {
          tenantId,
          userId,
          token: fcmToken,
          platform: platform || 'web',
          browser: browser || null,
          os: os || null,
          deviceName: deviceName || null,
          userAgent: userAgent || null,
          ipAddress: ip,
          isActive: true,
        },
      });
    }

    console.log(`[DeviceRegister] Token registered for user ${userId} (${platform || 'web'})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DeviceRegister] Error:', error);
    return NextResponse.json({ success: true }); // Don't fail the login flow
  }
}