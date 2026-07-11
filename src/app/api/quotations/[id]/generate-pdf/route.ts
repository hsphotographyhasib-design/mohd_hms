import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { generateQuotationHtml } from '@/modules/quotations/services/quotation-pdf-html';
import { chromium } from 'playwright-core';

export const dynamic = 'force-dynamic';

const CHROMIUM_PATH = '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    // ── 1. Authenticate + RBAC ──────────────────────────────────────
    const auth = verifyRouteAuth(request, { feature: 'quotations', entity: 'quotation', action: 'generate_pdf' });
    if (auth.error) return auth.error;

    const userId = auth.userId;
    const tenantId = auth.tenantId;

    // ── 2. Fetch quotation with relations ────────────────────────────
    const { id } = await params;

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
        user: { select: { name: true } },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // ── 3. Map data for PDF template ────────────────────────────────
    const pdfData = {
      id: quotation.id,
      quotationNo: quotation.quotationNo,
      title: quotation.title,
      description: quotation.description,
      referenceNo: quotation.referenceNo,
      projectName: quotation.projectName,
      site: quotation.site,
      preparedByName: quotation.user?.name || quotation.preparedBy || undefined,
      salesPerson: quotation.preparedBy || undefined,
      items: quotation.items,
      terms: quotation.terms,
      currency: quotation.currency,
      subtotal: quotation.subtotal,
      taxRate: quotation.taxRate,
      tax: quotation.tax,
      discount: quotation.discount,
      shipping: quotation.shipping,
      total: quotation.total,
      status: quotation.status,
      validUntil: quotation.validUntil?.toISOString(),
      notes: quotation.notes,
      warranty: (quotation as Record<string, unknown>).warranty as string | undefined,
      deliveryPeriod: (quotation as Record<string, unknown>).deliveryPeriod as string | undefined,
      createdAt: quotation.createdAt.toISOString(),
      customer: quotation.customer
        ? {
            name: quotation.customer.name,
            phone: quotation.customer.phone,
            email: quotation.customer.email,
            address: quotation.customer.address,
            companyName: quotation.customer.companyName,
            pic: quotation.customer.pic,
            district: quotation.customer.district,
            country: quotation.customer.country,
          }
        : undefined,
    };

    // ── 5. Generate HTML ────────────────────────────────────────────
    const html = await generateQuotationHtml(pdfData);

    // ── 6. Generate PDF via Playwright ───────────────────────────────
    browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    await browser.close();
    browser = null;

    // ── 7. Build filename ───────────────────────────────────────────
    const safeName = (quotation.quotationNo || 'quotation').replace(/\s+/g, '-');
    const filename = `Quotation-${safeName}.pdf`;

    // ── 8. Audit log ────────────────────────────────────────────────
    console.log(
      `[AUDIT] PDF generated: ${quotation.quotationNo} by user ${userId} at ${new Date().toISOString()}`
    );

    // ── 9. Return PDF response ──────────────────────────────────────
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    // Ensure browser is closed on error
    if (browser) {
      try { await browser.close(); } catch { /* swallow close error */ }
    }

    console.error('[PDF Generation Error]', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}