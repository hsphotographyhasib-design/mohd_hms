import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'equipment' });
    if (auth.error) return auth.error;

    const { address } = await request.json();
    if (!address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        results: [],
        message: 'Google Maps API key is not configured',
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`[Maps Geocode] API error: ${data.status} — ${data.error_message}`);
      return NextResponse.json({ error: 'Geocoding failed', details: data.error_message }, { status: 500 });
    }

    const results = (data.results || []).map((r: Record<string, unknown>) => ({
      lat: (r.geometry as { location?: { lat?: number; lng?: number } })?.location?.lat ?? null,
      lng: (r.geometry as { location?: { lat?: number; lng?: number } })?.location?.lng ?? null,
      formatted_address: r.formatted_address ?? '',
      place_id: r.place_id ?? '',
      types: r.types ?? [],
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Maps Geocode] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Geocoding failed', details: msg }, { status: 500 });
  }
}