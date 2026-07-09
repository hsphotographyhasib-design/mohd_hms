import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

interface AddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

function extractStructuredFields(components: AddressComponent[]) {
  const fields: Record<string, string> = {};

  for (const comp of components) {
    if (!comp.types) continue;
    if (comp.types.includes('route')) fields.street = comp.long_name || '';
    if (comp.types.includes('locality')) fields.city = comp.long_name || '';
    if (comp.types.includes('administrative_area_level_2')) {
      if (!fields.city) fields.city = comp.long_name || '';
      fields.district = comp.long_name || '';
    }
    if (comp.types.includes('administrative_area_level_1')) {
      fields.state = comp.long_name || '';
    }
    if (comp.types.includes('postal_code')) fields.postal_code = comp.long_name || '';
    if (comp.types.includes('country')) fields.country = comp.long_name || '';
  }

  return fields;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { lat, lng } = await request.json();
    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Latitude and longitude must be numbers' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        results: [],
        message: 'Google Maps API key is not configured',
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`[Maps Reverse Geocode] API error: ${data.status} — ${data.error_message}`);
      return NextResponse.json({ error: 'Reverse geocoding failed', details: data.error_message }, { status: 500 });
    }

    const results = (data.results || []).map((r: Record<string, unknown>) => ({
      formatted_address: r.formatted_address ?? '',
      place_id: r.place_id ?? '',
      address_components: r.address_components ?? [],
      ...extractStructuredFields((r.address_components ?? []) as AddressComponent[]),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Maps Reverse Geocode] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Reverse geocoding failed', details: msg }, { status: 500 });
  }
}