import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { generateInvoiceHtml, InvoicePdfData } from '@/modules/invoices/services/invoice-pdf-html';
import { COMPANY } from '@/core/constants/company';

// ============ Types ============

interface SendEmailBody {
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
}

// ============ Constants ============

const CHROMIUM_PATH = '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

// ============ Helpers ============

/**
 * Generate a PDF buffer from invoice data using Playwright.
 */
async function generatePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  const { chromium } = await import('playwright-core');
  const html = await generateInvoiceHtml(data);

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Build professional HTML email body for invoice.
 */
function buildEmailHtml(params: {
  customerName: string;
  bodyText: string;
  invoiceNumber: string;
  invoiceTitle: string;
  total: number;
  currency: string;
  dueDate: string | null;
}): string {
  const { customerName, bodyText, invoiceNumber, invoiceTitle, total, currency, dueDate } = params;

  const formattedTotal = total.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Email Container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Green Header -->
          <tr>
            <td style="background-color: #006b2d; padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                ${COMPANY.name}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">
                ${COMPANY.address} &middot; ${COMPANY.phone}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937;">
                Dear ${customerName},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.7; color: #374151;">
                ${bodyText}
              </p>

              <!-- Invoice Summary Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                      Invoice Summary
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; width: 140px;">Invoice No.</td>
                        <td style="padding: 6px 0; color: #1f2937; font-weight: 600;">${invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280;">Description</td>
                        <td style="padding: 6px 0; color: #1f2937;">${invoiceTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280;">Total Amount</td>
                        <td style="padding: 6px 0; color: #006b2d; font-weight: 700; font-size: 16px;">
                          ${currency} ${formattedTotal}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280;">Due Date</td>
                        <td style="padding: 6px 0; color: #1f2937;">${formattedDueDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                Please find the detailed invoice attached as a PDF document for your records.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #374151;">
                Should you have any questions regarding this invoice, please do not hesitate to contact us.
              </p>

              <p style="margin: 0; font-size: 14px; color: #374151;">
                Best regards,<br>
                <strong style="color: #006b2d;">${COMPANY.name}</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #6b7280; line-height: 1.6;">
                <tr>
                  <td>
                    <strong>${COMPANY.name}</strong><br>
                    ${COMPANY.address}<br>
                    ${COMPANY.phone} &middot; ${COMPANY.email}<br>
                    ${COMPANY.website}
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #9ca3af;">
                This email was sent from ${COMPANY.name}. If you believe this was sent in error, please contact us immediately.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Card -->

      </td>
    </tr>
  </table>
  <!-- End Email Container -->

</body>
</html>`;
}

// ============ Route Handler ============

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Verify JWT + RBAC
    const auth = verifyRouteAuth(request, { feature: 'invoices', entity: 'invoice', action: 'send_email' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;
    const userId = auth.userId;
    const { id } = await params;

    // 2. Fetch invoice with relations
    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            email: true,
            address: true,
            companyName: true,
            pic: true,
            district: true,
            country: true,
          },
        },
        User_Invoice_preparedByToUser: {
          select: { name: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 },
      );
    }

    // 3. Parse request body (optional overrides)
    let body: SendEmailBody = {};
    try {
      const raw = await request.json();
      body = raw as SendEmailBody;
    } catch {
      // Body is optional, use defaults
    }

    // 4. Determine recipient email
    const recipientEmail = body.to || invoice.customer?.email || '';
    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'No recipient email available. Please provide a "to" address.' },
        { status: 400 },
      );
    }

    // 5. Generate PDF
    const pdfData: InvoicePdfData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || undefined,
      title: invoice.title,
      description: invoice.description || undefined,
      referenceNo: invoice.referenceNo || undefined,
      poReference: invoice.poReference || undefined,
      paymentTerms: invoice.paymentTerms || undefined,
      dueDate: invoice.dueDate?.toISOString() || undefined,
      preparedByName: invoice.User_Invoice_preparedByToUser?.name || undefined,
      items: invoice.items,
      terms: invoice.terms || undefined,
      currency: invoice.currency || 'BND',
      subtotal: Number(invoice.subtotal) || 0,
      taxRate: Number(invoice.taxRate) || 0,
      tax: Number(invoice.tax) || 0,
      discount: Number(invoice.discount) || 0,
      shipping: Number(invoice.shipping) || 0,
      total: Number(invoice.total) || 0,
      status: invoice.status,
      notes: invoice.notes || undefined,
      shipToName: invoice.shipToName || undefined,
      shipToAddress: invoice.shipToAddress || undefined,
      shipToPhone: invoice.shipToPhone || undefined,
      shipToContact: invoice.shipToContact || undefined,
      createdAt: invoice.createdAt.toISOString(),
      customer: invoice.customer
        ? {
            name: invoice.customer.companyName || invoice.customer.name,
            phone: invoice.customer.phone || undefined,
            email: invoice.customer.email || undefined,
            address: invoice.customer.address || undefined,
            companyName: invoice.customer.companyName || undefined,
            pic: invoice.customer.pic || undefined,
            district: invoice.customer.district || undefined,
            country: invoice.customer.country || undefined,
          }
        : undefined,
    };

    const pdfBuffer = await generatePdfBuffer(pdfData);

    // 6. Build email content
    const customerName = invoice.customer?.companyName || invoice.customer?.name || 'Valued Customer';
    const defaultBodyText = `Please find attached the invoice for the services/items provided. We kindly request that payment be made by the due date indicated. Thank you for your continued business.`;

    const emailSubject = body.subject || `Invoice ${invoice.invoiceNumber || invoice.id} - ${invoice.title}`;
    const emailHtml = buildEmailHtml({
      customerName,
      bodyText: body.body || defaultBodyText,
      invoiceNumber: invoice.invoiceNumber || invoice.id,
      invoiceTitle: invoice.title,
      total: Number(invoice.total) || 0,
      currency: invoice.currency || 'BND',
      dueDate: invoice.dueDate?.toISOString() || null,
    });

    // 7. Send email via nodemailer
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    const mailOptions: any = {
      to: recipientEmail,
      from: `"${COMPANY.name}" <${process.env.SMTP_USER || COMPANY.email}>`,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber || invoice.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    if (body.cc) {
      mailOptions.cc = body.cc
        .split(',')
        .map((addr) => addr.trim())
        .filter(Boolean);
    }

    await transporter.sendMail(mailOptions);

    // 8. Log the email send action and update invoice status
    await db.invoice.update({
      where: { id },
      data: {
        sentAt: new Date(),
        updatedAt: new Date(),
        ...(invoice.status === 'DRAFT' || invoice.status === 'APPROVED'
          ? { status: 'SENT' }
          : {}),
      },
    });

    // 9. Return success
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      to: recipientEmail,
    });
  } catch (error) {
    console.error('[Send Invoice Email] Error:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to send invoice email';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}