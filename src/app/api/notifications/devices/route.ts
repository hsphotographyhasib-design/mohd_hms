import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * GET /api/notifications/devices
 * Proxy to Render backend. List user's registered devices.
 */
export async function GET(request: NextRequest) {
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

  return NextResponse.json({ devices: [] });
}