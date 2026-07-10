import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { generateInvoiceHtml } from '@/modules/invoices/services/invoice-pdf-html';

export const dynamic = 'force-dynamic';

const CHROMIUM_PATH = '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser: Awaited<ReturnType<typeof import('playwright-core').chromium.launch>> | null = null;

  try {
    // ── 1. Authenticate ──────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = payload.userId as string;
    const tenantId = payload.tenantId as string;
    const userRole = payload.role as string;

    // ── 2. Fetch invoice with relations ──────────────────────────────
    const { id } = await params;

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
        User_Invoice_preparedByToUser: { select: { name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // ── 3. Access check (tenantId already enforced in query) ────────
    const restrictedRoles = ['customer', 'vendor', 'guest'];
    if (restrictedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // ── 4. Check Playwright availability ─────────────────────────────
    const { chromium } = await import('playwright-core');
    let executablePath = CHROMIUM_PATH;

    // Check if Playwright browser is available
    try {
      const { existsSync } = await import('fs');
      if (!existsSync(executablePath)) {
        // Try to find any Chromium binary
        const { execSync } = await import('child_process');
        try {
          executablePath = execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf-8' }).trim();
        } catch {
          return NextResponse.json(
            { error: 'Playwright/Chromium not available. PDF generation requires a browser engine.' },
            { status: 501 }
          );
        }
      }
    } catch {
      return NextResponse.json(
        { error: 'Playwright/Chromium not available. PDF generation requires a browser engine.' },
        { status: 501 }
      );
    }

    // ── 5. Map data for PDF template ────────────────────────────────
    const pdfData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      description: invoice.description,
      referenceNo: invoice.referenceNo,
      poReference: invoice.poReference,
      paymentTerms: invoice.paymentTerms,
      dueDate: invoice.dueDate?.toISOString(),
      preparedByName: invoice.User_Invoice_preparedByToUser?.name || invoice.preparedBy || undefined,
      items: invoice.items,
      terms: invoice.terms,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      tax: invoice.tax,
      discount: invoice.discount,
      shipping: invoice.shipping,
      total: invoice.total,
      status: invoice.status,
      notes: invoice.notes,
      shipToName: invoice.shipToName,
      shipToAddress: invoice.shipToAddress,
      shipToPhone: invoice.shipToPhone,
      shipToContact: invoice.shipToContact,
      createdAt: invoice.createdAt.toISOString(),
      customer: invoice.customer
        ? {
            name: invoice.customer.name,
            phone: invoice.customer.phone,
            email: invoice.customer.email,
            address: invoice.customer.address,
            companyName: invoice.customer.companyName,
            pic: invoice.customer.pic,
            district: invoice.customer.district,
            country: invoice.customer.country,
          }
        : undefined,
    };

    // ── 6. Generate HTML ────────────────────────────────────────────
    const html = await generateInvoiceHtml(pdfData);

    // ── 7. Generate PDF via Playwright ───────────────────────────────
    browser = await chromium.launch({
      executablePath,
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

    // ── 8. Build filename ───────────────────────────────────────────
    const safeName = (invoice.invoiceNumber || 'invoice').replace(/\s+/g, '-');
    const filename = `Invoice-${safeName}.pdf`;

    // ── 9. Audit log ────────────────────────────────────────────────
    console.log(
      `[AUDIT] Invoice PDF generated: ${invoice.invoiceNumber} by user ${userId} at ${new Date().toISOString()}`
    );

    // ── 10. Return PDF response ──────────────────────────────────────
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

    console.error('[Invoice PDF Generation Error]', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}