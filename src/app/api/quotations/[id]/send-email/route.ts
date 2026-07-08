import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildQuotationPrintData } from '@/lib/pdf/quotation-data';
import { renderPrintableDocumentHtml } from '@/lib/pdf/template';
import { renderHtmlToPdf } from '@/lib/pdf/render';
import { sendEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function POST(
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
    const body = await request.json().catch(() => ({} as { to?: string }));

    const quotation = await db.quotation.findFirst({
      where: { id, tenantId },
      include: { customer: { select: { name: true, email: true } } },
    });
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    const to = body.to || quotation.customer.email;
    if (!to) {
      return NextResponse.json({ error: 'No recipient email address available' }, { status: 400 });
    }

    const data = await buildQuotationPrintData(tenantId, id);
    if (!data) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    const html = await renderPrintableDocumentHtml(data);
    const pdf = await renderHtmlToPdf(html);
    const filename = `Quotation-${data.docNumber.replace(/\//g, '-')}.pdf`;

    const emailHtml = `
      <p>Dear ${quotation.customer.name},</p>
      <p>Please find attached quotation <strong>${data.docNumber}</strong> for ${quotation.title}.</p>
      <p>Total Amount: ${quotation.currency} ${quotation.total.toFixed(2)}<br/>
      Valid Until: ${quotation.validUntil ? quotation.validUntil.toLocaleDateString('en-GB') : '—'}</p>
      <p>Thank you for considering our services.</p>
    `;

    const result = await sendEmail(
      {
        to,
        subject: `Quotation ${data.docNumber}`,
        html: emailHtml,
        module: 'quotations',
        attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
      },
      { tenantId }
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 502 });
    }

    await db.quotation.update({ where: { id }, data: { sentAt: new Date() } });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Quotation send-email error:', error);
    return NextResponse.json({ error: 'Failed to send quotation email' }, { status: 500 });
  }
}
