import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { COMPANY } from '@/core/constants/company';

// ============ Types ============

interface SendWhatsAppBody {
  generatePdf?: boolean;
}

// ============ Helpers ============

/**
 * Strip all non-digit characters from a phone number.
 */
function stripToDigits(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Format a number as currency string.
 */
function formatCurrency(amount: number, currency: string): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

/**
 * Format a date for display.
 */
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Build a professional WhatsApp message for an invoice.
 */
function buildWhatsAppMessage(params: {
  invoiceNumber: string;
  title: string;
  customerName: string;
  total: number;
  currency: string;
  dueDate: string | null | undefined;
}): string {
  const { invoiceNumber, title, customerName, total, currency, dueDate } = params;

  const lines = [
    `Dear ${customerName},`,
    '',
    `Thank you for your business. Please find below the summary of your invoice:`,
    '',
    `📋 *Invoice Details*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📄 Invoice No: *${invoiceNumber}*`,
    `📝 Description: ${title}`,
    `💰 Total Amount: *${formatCurrency(total, currency)}*`,
    `📅 Due Date: ${formatDate(dueDate)}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    '',
    `The detailed invoice PDF will be shared separately for your records.`,
    '',
    `If you have any questions regarding this invoice, please feel free to reach out to us.`,
    '',
    `Best regards,`,
    `*${COMPANY.name}*`,
    `📞 ${COMPANY.phone}`,
    `📧 ${COMPANY.email}`,
    `🌐 ${COMPANY.website}`,
  ];

  return lines.join('\n');
}

// ============ Route Handler ============

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Verify JWT + RBAC
    const auth = verifyRouteAuth(request, { feature: 'invoices', entity: 'invoice', action: 'send_whatsapp' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;
    const { id } = await params;

    // 2. Fetch invoice with customer
    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 },
      );
    }

    // 3. Parse optional body
    let body: SendWhatsAppBody = {};
    try {
      const raw = await request.json();
      body = raw as SendWhatsAppBody;
    } catch {
      // Body is optional
    }

    // 4. Extract and clean phone number
    const rawPhone = invoice.customer?.phone || '';
    const digitsOnly = stripToDigits(rawPhone);

    if (!digitsOnly) {
      return NextResponse.json(
        { success: false, error: 'Customer phone number is not available. Cannot generate WhatsApp link.' },
        { status: 400 },
      );
    }

    let whatsappPhone = digitsOnly;
    if (whatsappPhone.startsWith('673') && whatsappPhone.length > 8) {
      // Keep as-is with country code (already international format)
    }

    // 5. Build WhatsApp message
    const customerName = invoice.customer?.companyName || invoice.customer?.name || 'Valued Customer';
    const message = buildWhatsAppMessage({
      invoiceNumber: invoice.invoiceNumber || invoice.id,
      title: invoice.title,
      customerName,
      total: Number(invoice.total) || 0,
      currency: invoice.currency || 'BND',
      dueDate: invoice.dueDate?.toISOString() || null,
    });

    // 6. Generate wa.me link
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;

    // 7. Optionally generate PDF URL
    let pdfUrl: string | undefined;
    if (body.generatePdf) {
      pdfUrl = `/api/invoices/${invoice.id}/generate-pdf`;
    }

    // 8. Return response
    return NextResponse.json({
      success: true,
      whatsappLink,
      message,
      phone: whatsappPhone,
      ...(pdfUrl && { pdfUrl }),
    });
  } catch (error) {
    console.error('[Send Invoice WhatsApp] Error:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to generate WhatsApp link';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}