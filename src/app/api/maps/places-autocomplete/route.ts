import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { input } = await request.json();
    if (!input?.trim()) {
      return NextResponse.json({ error: 'Search input is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        predictions: [],
        message: 'Google Maps API key is not configured',
      });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`[Places Autocomplete] API error: ${data.status} — ${data.error_message}`);
      return NextResponse.json({ error: 'Autocomplete failed', details: data.error_message }, { status: 500 });
    }

    const predictions = (data.predictions || []).map((p: Record<string, unknown>) => ({
      description: p.description ?? '',
      place_id: p.place_id ?? '',
      structured_formatting: (p.structured_formatting as Record<string, string>) ?? {},
    }));

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('[Places Autocomplete] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Autocomplete failed', details: msg }, { status: 500 });
  }
}