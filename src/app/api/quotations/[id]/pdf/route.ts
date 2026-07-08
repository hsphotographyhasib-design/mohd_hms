import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { buildQuotationPrintData } from '@/lib/pdf/quotation-data';
import { renderPrintableDocumentHtml } from '@/lib/pdf/template';
import { renderHtmlToPdf } from '@/lib/pdf/render';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const data = await buildQuotationPrintData(tenantId, id);
    if (!data) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    const html = await renderPrintableDocumentHtml(data);
    const pdf = await renderHtmlToPdf(html);

    const download = request.nextUrl.searchParams.get('download') === '1';
    const filename = `Quotation-${data.docNumber.replace(/\//g, '-')}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (error) {
    console.error('Quotation PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
