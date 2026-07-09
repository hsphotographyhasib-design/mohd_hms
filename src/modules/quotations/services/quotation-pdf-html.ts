// ============ SERVER-SIDE QUOTATION PDF HTML GENERATOR ============
// Generates a complete HTML document matching the React QuotationDetail
// A4 layout for use with Playwright/Puppeteer PDF generation.
// NO React, NO 'use client' — pure string template.

import { COMPANY, COMPANY_COLORS } from '@/core/constants/company';
import { numberToCurrencyWords } from '@/core/utils/number-to-words';
import type { QuotationLineItem } from '@/core/types';
import * as QRCode from 'qrcode';

// ============ TYPES ============

export interface QuotationPdfData {
  id: string;
  quotationNo?: string;
  title: string;
  description?: string;
  referenceNo?: string;
  projectName?: string;
  site?: string;
  preparedByName?: string;
  salesPerson?: string;
  items: string;             // JSON string of QuotationLineItem[]
  terms?: string;            // JSON string of string[]
  currency?: string;
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  validUntil?: string;
  notes?: string;
  warranty?: string;
  deliveryPeriod?: string;
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

// ============ STATUS CONFIG ============

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  REVIEW: 'In Review',
  APPROVED: 'Approved',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CONVERTED_WO: 'Converted to WO',
  CONVERTED_INVOICE: 'Converted to Invoice',
  PAID: 'Paid',
  CLOSED: 'Closed',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: 'background:#f3f4f6;color:#374151;border:1px solid #d1d5db;',
  REVIEW: 'background:#fffbeb;color:#92400e;border:1px solid #fcd34d;',
  APPROVED: 'background:#f0fdfa;color:#115e59;border:1px solid #5eead4;',
  SENT: 'background:#f0f9ff;color:#075985;border:1px solid #7dd3fc;',
  ACCEPTED: 'background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;',
  REJECTED: 'background:#fff1f2;color:#b91c1c;border:1px solid #fda4af;',
  EXPIRED: 'background:#f3f4f6;color:#4b5563;border:1px solid #d1d5db;',
  CONVERTED_WO: 'background:#faf5ff;color:#6b21a8;border:1px solid #d8b4fe;',
  CONVERTED_INVOICE: 'background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;',
  PAID: 'background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;',
  CLOSED: 'background:#f3f4f6;color:#4b5563;border:1px solid #d1d5db;',
};

// ============ EXPORTED HELPERS ============

export function fmtBND(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d?: string): string {
  if (!d) return '\u2014';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '\u2014';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '\u2014';
  }
}

export function parseLineItems(itemsStr?: string): QuotationLineItem[] {
  if (!itemsStr) return [];
  try {
    const parsed = JSON.parse(itemsStr);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* empty */ }
  return [];
}

export function parseTerms(termsStr?: string): string[] {
  const defaults = [
    'This quotation is valid for the period stated above only.',
    '50% advance payment and balance upon completion.',
    'Delivery period: 3 working days after confirmation.',
    'Price quoted are in BND and inclusive of installation.',
    'Warranty applies only to workmanship.',
    'Material warranty follows manufacturer terms.',
    'Additional works are subject to variation order.',
    'Payment by bank transfer or cheque.',
  ];
  if (!termsStr) return defaults;
  try {
    const parsed = JSON.parse(termsStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* empty */ }
  return defaults;
}

// ============ ESCAPE HTML ============

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============ MAIN GENERATOR ============

export async function generateQuotationHtml(data: QuotationPdfData): Promise<string> {
  const currency = data.currency || 'BND';
  const barcodeValue = data.quotationNo || data.title || '';
  const lineItems = parseLineItems(data.items);
  const terms = parseTerms(data.terms);
  const customer = data.customer;
  const statusLabel = STATUS_LABELS[data.status] || data.status;
  const statusStyle = STATUS_BADGE_STYLES[data.status] || STATUS_BADGE_STYLES.DRAFT;

  // Cost breakdowns by category
  let materialCost = 0;
  let labourCost = 0;
  let serviceCost = 0;
  for (const item of lineItems) {
    const cat = (item.category || '').toLowerCase();
    if (cat === 'material') {
      materialCost += item.amount || 0;
    } else if (cat === 'labour' || cat === 'labor') {
      labourCost += item.amount || 0;
    } else {
      serviceCost += item.amount || 0;
    }
  }

  // Generate QR code as data URI
  let qrDataUri = '';
  try {
    qrDataUri = await QRCode.toDataURL(
      `https://smartms.com/quotation/${data.quotationNo || data.id}`,
      { width: 120, margin: 0, errorCorrectionLevel: 'M' },
    );
  } catch {
    // QR generation is best-effort
  }

  // ---------- HTML Template ----------

  const green = COMPANY_COLORS.green;
  const greenSoft = COMPANY_COLORS.greenSoft;
  const ink = COMPANY_COLORS.ink;
  const ink2 = COMPANY_COLORS.ink2;
  const muted = COMPANY_COLORS.muted;
  const line = COMPANY_COLORS.line;

  // Prepared by name
  const preparedBy = data.preparedByName || data.salesPerson || '';

  // Customer display
  const customerDisplayName = (customer?.companyName || customer?.name || '').toUpperCase();
  const customerAddress = customer?.address || '';

  // Notes
  const notesText = data.notes || 'Thank you for considering Smart Maintenance Services. We look forward to working with you.';

  // Description row (shown between info section and table)
  const descriptionHtml = data.description
    ? `<div style="margin-bottom:24px;background:${greenSoft};border:1px solid #c6f6d5;border-radius:8px;padding:12px 16px;">
        <p style="font-size:11px;color:${ink2};line-height:1.6;"><strong style="color:${ink};">Description:</strong> ${esc(data.description)}</p>
       </div>`
    : '';

  // Line items rows
  const itemRowsHtml = lineItems.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:40px 8px;color:${muted};font-size:13px;">No line items</td></tr>`
    : lineItems.map((item, i) => {
        const rowBg = i % 2 === 1 ? `background:#f9fafb;` : '';
        return `<tr style="border-bottom:1px solid ${line};${rowBg}break-inside:avoid;">
          <td style="text-align:center;padding:10px 8px;color:${muted};font-weight:500;font-size:12px;">${i + 1}</td>
          <td style="padding:10px 8px;">
            <p style="font-weight:600;color:${ink};font-size:12px;margin:0;">${esc(item.title)}</p>
            ${item.itemCode ? `<p style="font-size:9px;color:${muted};margin:2px 0 0 0;">${esc(item.itemCode)}</p>` : ''}
          </td>
          <td style="padding:10px 8px;">
            <p style="color:${muted};font-size:11px;line-height:1.5;margin:0;">${esc(item.description || '\u2014')}</p>
          </td>
          <td style="text-align:center;padding:10px 8px;color:${ink2};font-size:12px;">${esc(item.unit || 'Nos')}</td>
          <td style="text-align:center;padding:10px 8px;color:${ink2};font-size:12px;">${item.quantity}</td>
          <td style="text-align:right;padding:10px 8px;color:${ink2};font-size:12px;">${fmtBND(item.rate)}</td>
          <td style="text-align:right;padding:10px 8px;font-weight:600;color:${ink};font-size:12px;">${fmtBND(item.amount)}</td>
        </tr>`;
      }).join('\n');

  // Summary rows
  const summaryRows: string[] = [];

  if (materialCost > 0) {
    summaryRows.push(`<div style="display:flex;justify-content:space-between;font-size:12px;">
      <span style="color:${muted};">Material Cost</span>
      <span style="color:${ink2};font-weight:500;">${currency} ${fmtBND(materialCost)}</span>
    </div>`);
  }
  if (labourCost > 0) {
    summaryRows.push(`<div style="display:flex;justify-content:space-between;font-size:12px;">
      <span style="color:${muted};">Labour Cost</span>
      <span style="color:${ink2};font-weight:500;">${currency} ${fmtBND(labourCost)}</span>
    </div>`);
  }
  if (serviceCost > 0) {
    summaryRows.push(`<div style="display:flex;justify-content:space-between;font-size:12px;">
      <span style="color:${muted};">Service Cost</span>
      <span style="color:${ink2};font-weight:500;">${currency} ${fmtBND(serviceCost)}</span>
    </div>`);
  }

  summaryRows.push(`<div style="display:flex;justify-content:space-between;font-size:12px;">
    <span style="color:${muted};">Subtotal</span>
    <span style="color:${ink2};font-weight:500;">${currency} ${fmtBND(data.subtotal)}</span>
  </div>`);

  if (data.discount !== 0) {
    summaryRows.push(`<div style="display:flex;justify-content:space-between;font-size:12px;">
      <span style="color:${muted};">Discount</span>
      <span style="color:${ink2};font-weight:500;">${currency} ${fmtBND(data.discount)}</span>
    </div>`);
  }

  if (data.taxRate > 0 || data.tax > 0) {
    summaryRows.push(`<div style="display:flex;justify-content:space-between;font-size:12px;">
      <span style="color:${muted};">Tax (${data.taxRate || 0}%)</span>
      <span style="color:${ink2};font-weight:500;">${currency} ${fmtBND(data.tax)}</span>
    </div>`);
  }

  if (data.shipping !== 0) {
    summaryRows.push(`<div style="display:flex;justify-content:space-between;font-size:12px;">
      <span style="color:${muted};">Shipping</span>
      <span style="color:${ink2};font-weight:500;">${currency} ${fmtBND(data.shipping)}</span>
    </div>`);
  }

  summaryRows.push(`<div style="border-top:2px solid ${line};padding-top:10px;margin-top:4px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:14px;font-weight:700;color:${ink};">GRAND TOTAL</span>
      <span style="font-size:18px;font-weight:700;color:${green};">${currency} ${fmtBND(data.total)}</span>
    </div>
  </div>`);

  summaryRows.push(`<div style="border-radius:6px;padding:10px 12px;margin-top:8px;background:#ecfdf5;border:1px solid #a7f3d0;">
    <p style="font-size:9px;color:${green};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2px 0;">Amount In Words</p>
    <p style="font-size:11px;color:${ink};font-weight:500;line-height:1.5;margin:0;">${esc(numberToCurrencyWords(data.total))}</p>
  </div>`);

  // Terms list
  const termsHtml = terms.map((term) => `<li style="margin-bottom:6px;line-height:1.6;">${esc(term)}</li>`).join('\n');

  // Other information rows
  const otherInfoRows: string[] = [];
  if (data.projectName) {
    otherInfoRows.push(infoRow('Project Name', data.projectName));
    // Only show in col 3, not duplicated
  }
  if (data.site) {
    otherInfoRows.push(infoRow('Site', data.site));
  }
  otherInfoRows.push(infoRow('Quotation Date', fmtDate(data.createdAt)));
  otherInfoRows.push(infoRow('Valid Until', fmtDate(data.validUntil)));
  if (data.referenceNo) {
    otherInfoRows.push(infoRow('Reference', data.referenceNo));
  }
  otherInfoRows.push(infoRow('Sales Person', data.salesPerson || data.preparedByName || '\u2014'));
  otherInfoRows.push(infoRow('Tax Rate', `${data.taxRate || 0}%${data.taxRate === 0 ? ' (Tax Exempt)' : ''}`));
  if (data.deliveryPeriod) {
    otherInfoRows.push(infoRow('Delivery Period', data.deliveryPeriod));
  }
  if (data.warranty) {
    otherInfoRows.push(infoRow('Warranty', data.warranty));
  }
  otherInfoRows.push(`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;align-items:center;">
    <span style="color:${muted};">Quotation Status</span>
    <span style="${statusStyle}font-size:10px;padding:1px 6px;border-radius:4px;font-weight:500;">${esc(statusLabel)}</span>
  </div>`);

  // Site column content
  const siteContentHtml = data.site
    ? `<p style="font-size:11px;color:${ink2};line-height:1.6;">${esc(data.site)}</p>
       ${customer?.phone ? `<p style="font-size:11px;color:${ink2};margin-top:8px;display:flex;align-items:center;gap:6px;">
         <span style="color:${green};font-size:11px;">&#9742;</span> ${esc(customer.phone)}
       </p>` : ''}
       ${customer?.pic ? `<p style="font-size:11px;color:${ink2};margin-top:4px;display:flex;align-items:center;gap:6px;">
         <span style="color:${green};font-size:11px;">&#9679;</span> Site Contact: ${esc(customer.pic)}
       </p>` : ''}`
    : `<p style="font-weight:700;font-size:13px;color:${ink};margin-bottom:4px;">${esc(customerDisplayName)}</p>
       ${customerAddress ? `<p style="font-size:11px;color:${ink2};line-height:1.6;">${esc(customerAddress)}</p>` : ''}`;

  const projectBlockHtml = data.projectName
    ? `<div style="margin-top:12px;padding-top:8px;border-top:1px solid ${line};">
        <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:500;margin:0 0 2px 0;">Project</p>
        <p style="font-size:11px;color:${ink2};font-weight:500;margin:0;">${esc(data.projectName)}</p>
       </div>`
    : '';

  // ---------- BUILD HTML ----------

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation - ${esc(barcodeValue)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      color: #1f2937;
      background: #ffffff;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .document-wrapper {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px 24px;
      padding-bottom: 36px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .document-wrapper {
        padding: 0;
        max-width: none;
      }
      .page-break {
        page-break-before: always;
      }
      tr {
        break-inside: avoid;
      }
      .no-break {
        break-inside: avoid;
      }
    }
    /* Fixed footer */
    .fixed-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      padding: 8px 0 4px 0;
      border-top: 1px solid ${line};
      background: #ffffff;
    }
    .fixed-footer p {
      font-size: 9px;
      color: ${muted};
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    thead tr {
      background: #f3f4f6;
      border-bottom: 2px solid #d1d5db;
    }
    thead th {
      padding: 10px 8px;
      font-size: 11px;
      font-weight: 600;
      color: ${ink};
      text-align: left;
    }
  </style>
</head>
<body>

  <!-- Fixed Footer -->
  <div class="fixed-footer">
    <p>${esc(COMPANY.name)} &bull; ${esc(COMPANY.address)} &bull; ${esc(COMPANY.phone)} &bull; ${esc(COMPANY.email)}</p>
    <p>Reg No: ${esc(COMPANY.regNo)} &bull; ${esc(COMPANY.website)}</p>
  </div>

  <div class="document-wrapper">

    <!-- ====== ROW 1: Company Header (Left) + QUOTATION Title & Barcode (Right) ====== -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px;" class="no-break">
      <!-- Left: Company Logo & Info -->
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:44px;height:44px;background:${green};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;font-size:20px;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            ${esc(COMPANY.shortName)}
          </div>
          <div>
            <h2 style="font-weight:700;font-size:15px;line-height:1.3;color:${ink};margin:0;">${esc(COMPANY.name)}</h2>
          </div>
        </div>
        <div style="font-size:11px;color:#4b5563;margin-left:56px;">
          <p style="margin-bottom:4px;display:flex;align-items:flex-start;gap:6px;">
            <span style="color:${green};flex-shrink:0;margin-top:1px;">&#9673;</span> ${esc(COMPANY.address)}
          </p>
          <p style="margin-bottom:4px;display:flex;align-items:center;gap:6px;">
            <span style="color:${green};flex-shrink:0;">&#9742;</span> ${esc(COMPANY.phone)}
          </p>
          <p style="margin-bottom:4px;display:flex;align-items:center;gap:6px;">
            <span style="color:${green};flex-shrink:0;">&#9993;</span> ${esc(COMPANY.email)}
          </p>
          <p style="display:flex;align-items:center;gap:6px;">
            <span style="color:${green};flex-shrink:0;">&#9670;</span> ${esc(COMPANY.website)}
          </p>
        </div>
      </div>

      <!-- Right: QUOTATION Label + Green Bar with Number + Barcode text -->
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
        <p style="color:${green};font-weight:700;font-size:20px;letter-spacing:1px;margin:0;">QUOTATION</p>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="background:${green};border-radius:6px;padding:6px 16px;">
            <span style="color:#ffffff;font-weight:700;font-size:13px;letter-spacing:0.5px;">${esc(barcodeValue)}</span>
          </div>
          <div style="background:#ffffff;padding:4px;border:1px solid ${line};border-radius:4px;font-family:'Courier New',Courier,monospace;font-size:10px;color:${ink2};letter-spacing:1.5px;line-height:1.2;padding:8px 10px;">
            ${esc(barcodeValue.split('').join(' '))}
          </div>
        </div>
        <p style="font-size:11px;font-weight:500;color:${ink2};font-family:'Courier New',Courier,monospace;">${esc(barcodeValue)}</p>
      </div>
    </div>

    <!-- ====== ROW 2: Three-Column — QUOTATION TO | SITE / DELIVERY TO | OTHER INFORMATION ====== -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;" class="no-break">
      <!-- Column 1: QUOTATION TO -->
      <div style="border-radius:8px;padding:16px;border:1px solid ${line};">
        <h3 style="font-size:11px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <span>&#9679;</span> QUOTATION TO
        </h3>
        <p style="font-weight:700;font-size:13px;color:${ink};margin-bottom:4px;">${esc(customerDisplayName)}</p>
        ${customerAddress ? `<p style="font-size:11px;color:#4b5563;margin-bottom:8px;line-height:1.6;">${esc(customerAddress)}</p>` : ''}
        <div>
          ${customer?.phone ? `<p style="font-size:11px;color:#4b5563;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
            <span style="color:${green};font-size:11px;">&#9742;</span> ${esc(customer.phone)}
          </p>` : ''}
          ${customer?.email ? `<p style="font-size:11px;color:#4b5563;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
            <span style="color:${green};font-size:11px;">&#9993;</span> ${esc(customer.email)}
          </p>` : ''}
          ${customer?.pic ? `<p style="font-size:11px;color:#4b5563;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
            <span style="color:${green};font-size:11px;">&#9679;</span> ${esc(customer.pic)} (PIC)
          </p>` : ''}
        </div>
      </div>

      <!-- Column 2: SITE / DELIVERY TO -->
      <div style="border-radius:8px;padding:16px;border:1px solid ${line};">
        <h3 style="font-size:11px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <span>&#9654;</span> SITE / DELIVERY TO
        </h3>
        <div>
          ${siteContentHtml}
        </div>
        ${projectBlockHtml}
      </div>

      <!-- Column 3: OTHER INFORMATION -->
      <div style="border-radius:8px;padding:16px;border:1px solid ${line};">
        <h3 style="font-size:11px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <span>&#9632;</span> OTHER INFORMATION
        </h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${otherInfoRows.join('\n')}
        </div>
      </div>
    </div>

    <!-- ====== Description (if any) ====== -->
    ${descriptionHtml}

    <!-- ====== ROW 3: Line Items Table + Summary (side by side) ====== -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;gap:16px;align-items:flex-start;">
        <!-- Table -->
        <div style="flex:1;min-width:0;overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th style="text-align:center;width:40px;">SL</th>
                <th style="text-align:left;">Item Title</th>
                <th style="text-align:left;">Description</th>
                <th style="text-align:center;width:56px;">Unit</th>
                <th style="text-align:center;width:56px;">Quantity</th>
                <th style="text-align:right;width:96px;">Rate (${esc(currency)})</th>
                <th style="text-align:right;width:96px;">Amount (${esc(currency)})</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Summary Panel -->
        <div style="width:248px;flex-shrink:0;">
          <div style="border-radius:8px;border:1px solid ${line};padding:16px;background:${greenSoft};display:flex;flex-direction:column;gap:10px;" class="no-break">
            ${summaryRows.join('\n')}
          </div>
        </div>
      </div>
    </div>

    <!-- ====== ROW 4: Terms & Conditions ====== -->
    <div style="margin-bottom:24px;" class="no-break">
      <h3 style="font-size:11px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
        <span>&#9632;</span> TERMS &amp; CONDITIONS
      </h3>
      <ol style="font-size:11px;color:#4b5563;padding-left:20px;margin:0;">
        ${termsHtml}
      </ol>
    </div>

    <!-- ====== ROW 5: Footer — 4-Column Grid ====== -->
    <div style="border-top:1px solid ${line};padding-top:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:20px;">
        <!-- Column 1: NOTES -->
        <div>
          <h4 style="font-size:10px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Notes</h4>
          <p style="font-size:10px;color:#4b5563;line-height:1.6;">${esc(notesText)}</p>
        </div>

        <!-- Column 2: PREPARED BY -->
        <div>
          <h4 style="font-size:10px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Prepared By</h4>
          <div style="height:32px;margin-bottom:4px;display:flex;align-items:flex-end;">
            <p style="font-size:13px;font-style:italic;color:#9ca3af;">${esc(preparedBy)}</p>
          </div>
          <p style="font-size:11px;color:${ink};font-weight:500;">${esc(preparedBy || '\u2014')}</p>
          <p style="font-size:10px;color:${muted};">Sales Executive</p>
        </div>

        <!-- Column 3: COMPANY STAMP -->
        <div>
          <h4 style="font-size:10px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Company Stamp</h4>
          <div style="width:60px;height:60px;border:2px solid ${green};border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0.8;">
            <div style="text-align:center;">
              <span style="color:${green};font-weight:700;font-size:14px;line-height:1;display:block;">${esc(COMPANY.shortName)}</span>
              <span style="color:${green};font-size:6px;line-height:1;display:block;margin-top:2px;">${esc(COMPANY.regNo)}</span>
            </div>
          </div>
        </div>

        <!-- Column 4: SCAN TO VIEW -->
        <div>
          <h4 style="font-size:10px;font-weight:700;color:${green};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Scan To View</h4>
          ${qrDataUri
            ? `<div style="width:60px;height:60px;">
                 <img src="${qrDataUri}" alt="QR Code" style="width:60px;height:60px;display:block;" />
               </div>
               <p style="font-size:7px;color:${muted};margin-top:6px;max-width:80px;line-height:1.4;">Scan this QR code to view this quotation online.</p>`
            : `<div style="width:60px;height:60px;border:1px dashed ${line};border-radius:4px;display:flex;align-items:center;justify-content:center;">
                 <span style="font-size:8px;color:${muted};">QR</span>
               </div>`
          }
        </div>
      </div>

      <!-- Disclaimer -->
      <p style="font-size:10px;color:${muted};text-align:center;margin-top:24px;">
        This is a computer generated quotation. No signature is required.
      </p>

      <!-- THANK YOU -->
      <p style="color:${green};font-weight:700;font-size:16px;text-align:center;margin-top:12px;letter-spacing:1px;">
        THANK YOU!
      </p>
    </div>

  </div>

</body>
</html>`;

  return html;
}

// ============ INTERNAL HELPERS ============

function infoRow(label: string, value: string): string {
  const ink = COMPANY_COLORS.ink;
  const ink2 = COMPANY_COLORS.ink2;
  const muted = COMPANY_COLORS.muted;
  return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;">
    <span style="color:${muted};">${esc(label)}</span>
    <span style="font-weight:500;color:${ink2};text-align:right;max-width:55%;">${esc(value)}</span>
  </div>`;
}