import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { generateQuotationHtml, QuotationPdfData } from '@/modules/quotations/services/quotation-pdf-html';
import { COMPANY } from '@/core/constants/company';
import { chromium } from 'playwright-core';
import nodemailer from 'nodemailer';

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
 * Generate a PDF buffer from quotation data using Playwright.
 */
async function generatePdfBuffer(data: QuotationPdfData): Promise<Buffer> {
  const html = await generateQuotationHtml(data);

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
 * Build professional HTML email body.
 */
function buildEmailHtml(params: {
  customerName: string;
  bodyText: string;
  quotationNo: string;
  quotationTitle: string;
  total: number;
  currency: string;
  validUntil: string | null;
}): string {
  const { customerName, bodyText, quotationNo, quotationTitle, total, currency, validUntil } = params;

  const formattedTotal = total.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedValidUntil = validUntil
    ? new Date(validUntil).toLocaleDateString('en-US', {
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
  <title>Quotation ${quotationNo}</title>
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

              <!-- Quotation Summary Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                      Quotation Summary
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; width: 140px;">Quotation No.</td>
                        <td style="padding: 6px 0; color: #1f2937; font-weight: 600;">${quotationNo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280;">Description</td>
                        <td style="padding: 6px 0; color: #1f2937;">${quotationTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280;">Total Amount</td>
                        <td style="padding: 6px 0; color: #006b2d; font-weight: 700; font-size: 16px;">
                          ${currency} ${formattedTotal}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280;">Valid Until</td>
                        <td style="padding: 6px 0; color: #1f2937;">${formattedValidUntil}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                Please find the detailed quotation attached as a PDF document for your review.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #374151;">
                Should you have any questions or require further clarification, please do not hesitate to contact us.
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Verify JWT
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const { id } = await params;

    // 2. Fetch quotation with relations
    const quotation = await db.quotation.findFirst({
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
        user: {
          select: { name: true },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
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
    const recipientEmail = body.to || quotation.customer?.email || '';
    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'No recipient email available. Please provide a "to" address.' },
        { status: 400 },
      );
    }

    // 5. Generate PDF
    const pdfData: QuotationPdfData = {
      id: quotation.id,
      quotationNo: quotation.quotationNo || undefined,
      title: quotation.title,
      description: quotation.description || undefined,
      referenceNo: quotation.referenceNo || undefined,
      projectName: quotation.projectName || undefined,
      site: quotation.site || undefined,
      preparedByName: quotation.user?.name || undefined,
      salesPerson: quotation.user?.name || undefined,
      items: quotation.items,
      terms: quotation.terms || undefined,
      currency: quotation.currency || 'BND',
      subtotal: Number(quotation.subtotal) || 0,
      taxRate: Number(quotation.taxRate) || 0,
      tax: Number(quotation.tax) || 0,
      discount: Number(quotation.discount) || 0,
      shipping: Number(quotation.shipping) || 0,
      total: Number(quotation.total) || 0,
      status: quotation.status,
      validUntil: quotation.validUntil?.toISOString() || undefined,
      notes: quotation.notes || undefined,
      createdAt: quotation.createdAt.toISOString(),
      customer: quotation.customer
        ? {
            name: quotation.customer.companyName || quotation.customer.name,
            phone: quotation.customer.phone || undefined,
            email: quotation.customer.email || undefined,
            address: quotation.customer.address || undefined,
            companyName: quotation.customer.companyName || undefined,
            pic: quotation.customer.pic || undefined,
            district: quotation.customer.district || undefined,
            country: quotation.customer.country || undefined,
          }
        : undefined,
    };

    const pdfBuffer = await generatePdfBuffer(pdfData);

    // 6. Build email content
    const customerName = quotation.customer?.companyName || quotation.customer?.name || 'Valued Customer';
    const defaultBodyText = `We are pleased to provide you with our quotation for the services/items as detailed below. We have carefully prepared this proposal to meet your requirements and look forward to the opportunity to work with you.`;

    const emailSubject = body.subject || `Quotation ${quotation.quotationNo || quotation.id} - ${quotation.title}`;
    const emailHtml = buildEmailHtml({
      customerName,
      bodyText: body.body || defaultBodyText,
      quotationNo: quotation.quotationNo || quotation.id,
      quotationTitle: quotation.title,
      total: Number(quotation.total) || 0,
      currency: quotation.currency || 'BND',
      validUntil: quotation.validUntil?.toISOString() || null,
    });

    // 7. Send email via nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      to: recipientEmail,
      from: `"${COMPANY.name}" <${process.env.SMTP_USER || COMPANY.email}>`,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: `Quotation-${quotation.quotationNo || quotation.id}.pdf`,
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

    // 8. Log the email send action and update quotation status
    await db.quotation.update({
      where: { id },
      data: {
        sentAt: new Date(),
        ...(quotation.status === 'DRAFT' || quotation.status === 'APPROVED'
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
    console.error('[Send Quotation Email] Error:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to send quotation email';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}