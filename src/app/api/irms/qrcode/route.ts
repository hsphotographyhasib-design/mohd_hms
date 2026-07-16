import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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