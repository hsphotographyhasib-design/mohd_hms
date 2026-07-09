import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * GET /api/notifications/devices
 *
 * Lists the authenticated user's registered devices.
 * - Production: proxies to Render backend
 * - Local dev: queries local Prisma DB
 */
export async function GET(request: NextRequest) {
  // If backend URL is configured, proxy to it
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const res = await fetch(`${BACKEND_URL}/api/notifications/devices`, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Devices list proxy error:', error);
      return NextResponse.json({ devices: [] });
    }
  }

  // ── Local dev: query Prisma ──
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ devices: [] });
    }

    const devices = await db.deviceToken.findMany({
      where: {
        userId: payload.userId as string,
        tenantId: payload.tenantId as string,
      },
      select: {
        id: true,
        platform: true,
        browser: true,
        os: true,
        deviceName: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return NextResponse.json({
      devices: devices.map((d) => ({
        ...d,
        lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ devices: [] });
  }
}