import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const template = request.nextUrl.searchParams.get('template') || 'government';
    const sort = request.nextUrl.searchParams.get('sort') || 'oldest';
    const download = request.nextUrl.searchParams.get('download') || '0';

    // STUB: Full PDF generation will be implemented with @react-pdf/renderer
    return NextResponse.json({
      message: 'PDF generation endpoint - use @react-pdf/renderer',
      reportId: id,
      template,
      sort,
      download,
      note: 'This is a stub. Implement the full PDF engine separately using @react-pdf/renderer.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PDF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}