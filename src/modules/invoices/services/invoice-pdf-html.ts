// ============ SERVER-SIDE INVOICE PDF HTML GENERATOR ============
// Generates a complete HTML document for use with Playwright PDF generation.
// NO React, NO 'use client' — pure string template.
// NOTE: Full implementation to be created separately.

import { COMPANY } from '@/core/constants/company';

// ============ TYPES ============

export interface InvoicePdfData {
  id: string;
  invoiceNumber?: string;
  title: string;
  description?: string;
  referenceNo?: string;
  poReference?: string;
  paymentTerms?: string;
  dueDate?: string;
  preparedByName?: string;
  items: any;
  terms?: any;
  currency: string;
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  notes?: string;
  shipToName?: string;
  shipToAddress?: string;
  shipToPhone?: string;
  shipToContact?: string;
  createdAt: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    companyName?: string;
    pic?: string;
    district?: string;
    country?: string;
  };
}

// ============ HTML GENERATOR ============

/**
 * Generate a complete HTML document for an invoice PDF.
 * Full implementation to be created separately.
 */
export async function generateInvoiceHtml(data: InvoicePdfData): Promise<string> {
  let parsedItems: any[] = [];
  try {
    const raw = data.items;
    parsedItems = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    parsedItems = [];
  }

  let parsedTerms: string[] = [];
  try {
    const raw = data.terms;
    parsedTerms = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    parsedTerms = [];
  }

  const itemRows = parsedItems.map((item: any, idx: number) => {
    const title = item.title || item.name || '';
    const desc = item.description || '';
    const unit = item.unit || 'Nos';
    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate || item.unitPrice || 0);
    const amount = Number(item.amount || qty * rate);
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 10px; font-size: 11px; text-align: center; color: #6b7280;">${idx + 1}</td>
        <td style="padding: 8px 10px; font-size: 11px;">
          <div style="font-weight: 600; color: #111827;">${title}</div>
          ${desc ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${desc}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; font-size: 11px; text-align: center;">${unit}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-align: right;">${qty.toLocaleString()}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-align: right;">${rate.toFixed(2)}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600;">${amount.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const termsHtml = parsedTerms.length > 0
    ? `<div style="margin-top: 24px;">
        <h3 style="font-size: 12px; font-weight: 700; color: #374151; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Terms & Conditions</h3>
        <ol style="margin: 0; padding-left: 18px; font-size: 11px; color: #4b5563; line-height: 1.7;">
          ${parsedTerms.map((t: string) => `<li>${t}</li>`).join('')}
        </ol>
      </div>`
    : '';

  const currency = data.currency || 'BND';
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const customerName = data.customer?.companyName || data.customer?.name || '';
  const customerAddress = data.customer?.address || '';
  const customerPhone = data.customer?.phone || '';
  const customerEmail = data.customer?.email || '';
  const customerCountry = data.customer?.country || '';

  const dueDateStr = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';
  const issueDateStr = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #111827; }
    @page { size: A4; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body style="width: 210mm; margin: 0 auto; padding: 15mm 20mm;">

  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #006b2d; padding-bottom: 12px; margin-bottom: 20px;">
    <div>
      <h1 style="font-size: 20px; font-weight: 800; color: #006b2d; letter-spacing: 0.5px;">${COMPANY.name}</h1>
      <p style="font-size: 10px; color: #6b7280; margin-top: 4px;">${COMPANY.address}</p>
      <p style="font-size: 10px; color: #6b7280;">${COMPANY.phone} &middot; ${COMPANY.email}</p>
    </div>
    <div style="text-align: right;">
      <h2 style="font-size: 22px; font-weight: 800; color: #111827;">INVOICE</h2>
      <p style="font-size: 13px; font-weight: 600; color: #006b2d; margin-top: 4px;">${data.invoiceNumber || ''}</p>
    </div>
  </div>

  <!-- Info Row -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
    <div style="flex: 1;">
      <h3 style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Bill To</h3>
      <p style="font-size: 12px; font-weight: 600; color: #111827;">${customerName}</p>
      ${customerAddress ? `<p style="font-size: 11px; color: #4b5563; margin-top: 2px;">${customerAddress}</p>` : ''}
      ${customerCountry ? `<p style="font-size: 11px; color: #4b5563;">${customerCountry}</p>` : ''}
      ${customerPhone ? `<p style="font-size: 11px; color: #4b5563;">Tel: ${customerPhone}</p>` : ''}
      ${customerEmail ? `<p style="font-size: 11px; color: #4b5563;">${customerEmail}</p>` : ''}
    </div>
    <div style="flex: 1; text-align: right;">
      <table style="width: 100%; font-size: 11px;">
        <tr><td style="color: #6b7280; padding: 3px 0;">Issue Date:</td><td style="font-weight: 600; text-align: right;">${issueDateStr}</td></tr>
        <tr><td style="color: #6b7280; padding: 3px 0;">Due Date:</td><td style="font-weight: 600; text-align: right;">${dueDateStr}</td></tr>
        ${data.referenceNo ? `<tr><td style="color: #6b7280; padding: 3px 0;">Ref No:</td><td style="font-weight: 600; text-align: right;">${data.referenceNo}</td></tr>` : ''}
        ${data.poReference ? `<tr><td style="color: #6b7280; padding: 3px 0;">PO Ref:</td><td style="font-weight: 600; text-align: right;">${data.poReference}</td></tr>` : ''}
        ${data.paymentTerms ? `<tr><td style="color: #6b7280; padding: 3px 0;">Payment Terms:</td><td style="font-weight: 600; text-align: right;">${data.paymentTerms}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- Title -->
  ${data.title ? `<h2 style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px;">${data.title}</h2>` : ''}
  ${data.description ? `<p style="font-size: 11px; color: #4b5563; margin-bottom: 16px;">${data.description}</p>` : ''}

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #374151; text-align: center; width: 30px;">#</th>
        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #374151; text-align: left;">Description</th>
        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #374151; text-align: center; width: 50px;">Unit</th>
        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #374151; text-align: right; width: 60px;">Qty</th>
        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #374151; text-align: right; width: 80px;">Unit Price</th>
        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #374151; text-align: right; width: 90px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="display: flex; justify-content: flex-end;">
    <table style="width: 280px; font-size: 11px; border-collapse: collapse;">
      <tr><td style="padding: 4px 12px; color: #6b7280;">Subtotal</td><td style="padding: 4px 12px; text-align: right; font-weight: 600;">${currency} ${fmt(data.subtotal)}</td></tr>
      ${data.taxRate > 0 ? `<tr><td style="padding: 4px 12px; color: #6b7280;">Tax (${data.taxRate}%)</td><td style="padding: 4px 12px; text-align: right; font-weight: 600;">${currency} ${fmt(data.tax)}</td></tr>` : ''}
      ${data.discount > 0 ? `<tr><td style="padding: 4px 12px; color: #6b7280;">Discount</td><td style="padding: 4px 12px; text-align: right; font-weight: 600; color: #dc2626;">-${currency} ${fmt(data.discount)}</td></tr>` : ''}
      ${data.shipping > 0 ? `<tr><td style="padding: 4px 12px; color: #6b7280;">Shipping</td><td style="padding: 4px 12px; text-align: right; font-weight: 600;">${currency} ${fmt(data.shipping)}</td></tr>` : ''}
      <tr style="border-top: 2px solid #111827;">
        <td style="padding: 8px 12px; font-weight: 800; font-size: 13px; color: #111827;">TOTAL</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-size: 13px; color: #006b2d;">${currency} ${fmt(data.total)}</td>
      </tr>
    </table>
  </div>

  <!-- Notes -->
  ${data.notes ? `
  <div style="margin-top: 24px;">
    <h3 style="font-size: 10px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Notes</h3>
    <p style="font-size: 11px; color: #4b5563; line-height: 1.6; white-space: pre-line;">${data.notes}</p>
  </div>` : ''}

  <!-- Terms -->
  ${termsHtml}

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af;">
    <p>${COMPANY.name} &middot; ${COMPANY.address} &middot; ${COMPANY.phone} &middot; ${COMPANY.email}</p>
  </div>

</body>
</html>`;
}