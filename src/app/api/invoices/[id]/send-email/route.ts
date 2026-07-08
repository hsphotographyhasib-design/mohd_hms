import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildInvoicePrintData } from '@/lib/pdf/invoice-data';
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

    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
      include: { customer: { select: { name: true, email: true } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const to = body.to || invoice.customer.email;
    if (!to) {
      return NextResponse.json({ error: 'No recipient email address available' }, { status: 400 });
    }

    const data = await buildInvoicePrintData(tenantId, id);
    if (!data) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const html = await renderPrintableDocumentHtml(data);
    const pdf = await renderHtmlToPdf(html);
    const filename = `Invoice-${data.docNumber.replace(/\//g, '-')}.pdf`;

    const emailHtml = `
      <p>Dear ${invoice.customer.name},</p>
      <p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for ${invoice.title}.</p>
      <p>Total Amount: ${invoice.currency} ${invoice.total.toFixed(2)}<br/>
      Due Date: ${invoice.dueDate ? invoice.dueDate.toLocaleDateString('en-GB') : '—'}</p>
      <p>Thank you for your business.</p>
    `;

    const result = await sendEmail(
      {
        to,
        subject: `Invoice ${invoice.invoiceNumber}`,
        html: emailHtml,
        module: 'invoices',
        attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
      },
      { tenantId }
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 502 });
    }

    await db.invoice.update({ where: { id }, data: { sentVia: 'email' } });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Invoice send-email error:', error);
    return NextResponse.json({ error: 'Failed to send invoice email' }, { status: 500 });
  }
}
