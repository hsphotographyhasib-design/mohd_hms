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
 * E.g. "+673 245 6789" → "6732456789"
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
 * Build a professional WhatsApp message for a quotation.
 */
function buildWhatsAppMessage(params: {
  quotationNo: string;
  title: string;
  customerName: string;
  total: number;
  currency: string;
  validUntil: string | null | undefined;
}): string {
  const { quotationNo, title, customerName, total, currency, validUntil } = params;

  const lines = [
    `Dear ${customerName},`,
    '',
    `Thank you for your interest in our services. Please find below the summary of your quotation:`,
    '',
    `📋 *Quotation Details*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📄 Quotation No: *${quotationNo}*`,
    `📝 Description: ${title}`,
    `💰 Total Amount: *${formatCurrency(total, currency)}*`,
    `📅 Valid Until: ${formatDate(validUntil)}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    '',
    `The detailed quotation PDF will be shared separately for your review.`,
    '',
    `If you have any questions or require further clarification, please feel free to reach out to us.`,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Verify JWT + RBAC
    const auth = verifyRouteAuth(request, { feature: 'quotations', entity: 'quotation', action: 'send_whatsapp' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;
    const { id } = await params;

    // 2. Fetch quotation with customer
    const quotation = await db.quotation.findFirst({
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

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
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
    const rawPhone = quotation.customer?.phone || '';
    const digitsOnly = stripToDigits(rawPhone);

    if (!digitsOnly) {
      return NextResponse.json(
        { success: false, error: 'Customer phone number is not available. Cannot generate WhatsApp link.' },
        { status: 400 },
      );
    }

    // Remove leading country code if it matches Brunei (+673) to avoid duplication
    // WhatsApp wa.me links work with the international format without +
    let whatsappPhone = digitsOnly;
    if (whatsappPhone.startsWith('673') && whatsappPhone.length > 8) {
      // Keep as-is with country code (already international format)
    }

    // 5. Build WhatsApp message
    const customerName = quotation.customer?.companyName || quotation.customer?.name || 'Valued Customer';
    const message = buildWhatsAppMessage({
      quotationNo: quotation.quotationNo || quotation.id,
      title: quotation.title,
      customerName,
      total: Number(quotation.total) || 0,
      currency: quotation.currency || 'BND',
      validUntil: quotation.validUntil?.toISOString() || null,
    });

    // 6. Generate wa.me link
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;

    // 7. Optionally generate PDF URL
    let pdfUrl: string | undefined;
    if (body.generatePdf) {
      // Return the API endpoint URL for PDF generation that the client can call
      pdfUrl = `/api/quotations/${quotation.id}/generate-pdf`;
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
    console.error('[Send Quotation WhatsApp] Error:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to generate WhatsApp link';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}