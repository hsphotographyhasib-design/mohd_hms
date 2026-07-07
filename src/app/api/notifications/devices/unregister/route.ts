import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * POST /api/notifications/devices/unregister
 * Proxy to Render backend.
 */
export async function POST(request: NextRequest) {
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const body = await request.json();
      const res = await fetch(`${BACKEND_URL}/api/notifications/devices/unregister`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      // Silently succeed
    }
  }

  return NextResponse.json({ success: true });
}