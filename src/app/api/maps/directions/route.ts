import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination } = await request.json();
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json({ error: 'Origin and destination with lat/lng are required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        message: 'Google Maps API key is not configured',
      });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`[Directions] API error: ${data.status} — ${data.error_message}`);
      return NextResponse.json({ error: 'Directions failed', details: data.error_message }, { status: 500 });
    }

    if (data.status === 'ZERO_RESULTS' || !data.routes?.length) {
      return NextResponse.json({
        distance: { text: '', value: 0 },
        duration: { text: '', value: 0 },
      });
    }

    const route = data.routes[0];
    const leg = route.legs?.[0];

    return NextResponse.json({
      distance: leg?.distance ?? { text: '', value: 0 },
      duration: leg?.duration ?? { text: '', value: 0 },
      polyline: route.overview_polyline?.points ?? '',
    });
  } catch (error) {
    console.error('[Directions] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Directions failed', details: msg }, { status: 500 });
  }
}