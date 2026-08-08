import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = verifyRouteAuth(req, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const data = req.nextUrl.searchParams.get('data');
    if (!data) {
      return NextResponse.json({ error: 'Query param "data" is required' }, { status: 400 });
    }

    const dataUrl = await QRCode.toDataURL(data);

    return NextResponse.json({ dataUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'QR code generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}