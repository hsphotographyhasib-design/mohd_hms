import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Only authenticated users can retrieve the Maps API key
  const auth = verifyRouteAuth(request, { feature: 'dashboard' });
  if (auth.error) return auth.error;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  return NextResponse.json({ apiKey });
}
