// ============ SERVER-SIDE QUOTATION PDF HTML GENERATOR ============
// Generates a complete HTML document matching the React QuotationA4Template
// for use with Playwright PDF generation.
// NO React, NO 'use client' — pure string template.

import { COMPANY, DEFAULT_QUOTATION_TERMS } from '@/core/constants/company';
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
  items: string;
  terms?: string;
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

// ============ LOCAL HELPERS ============

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

function fmtBND(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

function parseLineItems(itemsStr?: string): QuotationLineItem[] {
  if (!itemsStr) return [];
  try {
    const parsed = JSON.parse(itemsStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* empty */
  }
  return [];
}

function parseTerms(termsStr?: string): string[] {
  if (!termsStr) return DEFAULT_QUOTATION_TERMS;
  try {
    const parsed = JSON.parse(termsStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* empty */
  }
  return DEFAULT_QUOTATION_TERMS;
}

function statusAttr(s: string): string {
  if (s === 'SENT') return 'sent';
  if (s === 'ACCEPTED') return 'accepted';
  if (s === 'EXPIRED') return 'expired';
  return 'draft';
}

function validityDays(created: string, valid?: string): number | null {
  if (!valid) return null;
  try {
    const msPerDay = 86400000;
    return Math.round((new Date(valid).getTime() - new Date(created).getTime()) / msPerDay);
  } catch {
    return null;
  }
}

/** HTML-escape a string */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============ INLINE SVG STRINGS ============

const SVG_PHONE = `<svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

const SVG_MAIL = `<svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

const SVG_GLOBE = `<svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;

const SVG_BUILDING = `<svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`;

const STAMP_SVG = `<svg viewBox="0 0 120 120" width="104" height="104" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="55" fill="none" stroke="#149252" stroke-width="2.5"/>
  <circle cx="60" cy="60" r="48" fill="none" stroke="#149252" stroke-width="1.5"/>
  <path id="topArc" d="M 15,60 A 45,45 0 0,1 105,60" fill="none"/>
  <text fill="#149252" font-size="10.5" font-weight="700" font-family="Arial, sans-serif" letter-spacing="2">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">MOHD.HMS ENTERPRISE</textPath>
  </text>
  <path id="bottomArc" d="M 18,65 A 43,43 0 0,0 102,65" fill="none"/>
  <text fill="#149252" font-size="11" font-weight="700" font-family="Arial, sans-serif" letter-spacing="3">
    <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">BRUNEI</textPath>
  </text>
  <rect x="40" y="40" width="40" height="32" rx="4" fill="none" stroke="#149252" stroke-width="2"/>
  <text x="60" y="62" text-anchor="middle" fill="#149252" font-size="18" font-weight="900" font-family="Arial, sans-serif">HMS</text>
  <text x="60" y="85" text-anchor="middle" fill="#149252" font-size="9" font-weight="600" font-family="Arial, sans-serif">BE1318</text>
</svg>`;

// ============ CSS CONSTANT ============

const CSS = `
/* ========== DESIGN TOKENS ========== */
:root {
  --brand-700: #0f7d43;
  --brand-600: #149252;
  --brand-500: #1aa056;
  --brand-100: #cdeeda;
  --brand-50: #eefaf3;
  --ink-900: #17211b;
  --ink-700: #333f38;
  --ink-500: #5b6862;
  --ink-400: #87918b;
  --line-300: #d3d9d5;
  --line-200: #e5e9e6;
  --surface-100: #f4f6f4;
  --surface-0: #ffffff;
  --fs-2xs: 9px;
  --fs-xs: 10px;
  --fs-sm: 11px;
  --fs-base: 12.5px;
  --fs-md: 13.5px;
  --fs-lg: 15px;
  --fs-xl: 18px;
  --fs-2xl: 22px;
  --fs-display: 32px;
  --lh-tight: 1.15;
  --lh-normal: 1.55;
  --lh-loose: 1.85;
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-7: 28px;
  --sp-8: 32px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-pill: 999px;
  --border-1: 1px solid var(--line-200);
  --border-2: 1px solid var(--line-300);
}

/* ========== STATUS COLORS ========== */
body[data-status="draft"] {
  --status-fg: #6b7280;
  --status-bg: #f3f4f6;
  --status-line: #d1d5db;
}
body[data-status="sent"] {
  --status-fg: #2563eb;
  --status-bg: #eff6ff;
  --status-line: #93c5fd;
}
body[data-status="accepted"] {
  --status-fg: #059669;
  --status-bg: #ecfdf5;
  --status-line: #6ee7b7;
}
body[data-status="expired"] {
  --status-fg: #dc2626;
  --status-bg: #fef2f2;
  --status-line: #fca5a5;
}

/* ========== RESET ========== */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #f0f0f0;
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

/* ========== PAGE ========== */
.page {
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 12mm 9mm;
  background: var(--surface-0);
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  color: var(--ink-900);
  font-size: var(--fs-base);
  line-height: var(--lh-normal);
  position: relative;
}

/* ========== HEADER ========== */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--sp-5);
}
.brand-top {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.logo {
  width: 48px;
  height: 48px;
  background: var(--brand-600);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo svg { width: 30px; height: 30px; }
.company-name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--ink-900);
  line-height: var(--lh-tight);
  letter-spacing: -0.5px;
}
.company-sub {
  font-size: 10.5px;
  letter-spacing: 5px;
  color: var(--brand-600);
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 1px;
}
.brand-meta {
  font-size: 9.8px;
  color: var(--ink-500);
  margin-top: var(--sp-2);
}
.brand-meta .row {
  display: flex;
  align-items: center;
  gap: 7px;
  line-height: 1.7;
}
.ic {
  width: 12px;
  height: 12px;
  color: var(--brand-600);
  flex-shrink: 0;
}

/* ========== DOC BLOCK ========== */
.doc-block {
  text-align: right;
  flex-shrink: 0;
}
.doc-title {
  font-size: var(--fs-display);
  font-weight: 800;
  color: var(--brand-600);
  line-height: 1;
  letter-spacing: -1px;
}
.doc-no {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--ink-700);
  margin-top: var(--sp-1);
}

/* ========== STATUS BADGE ========== */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--status-fg);
  background: var(--status-bg);
  border: var(--border-1);
  margin-top: var(--sp-2);
}
.validity-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-2xs);
  font-weight: 600;
  color: var(--brand-700);
  background: var(--brand-50);
  margin-left: var(--sp-2);
}
.badge-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: wrap;
}

/* ========== BARCODE ========== */
.barcode-wrap {
  height: 38px;
  width: 200px;
  margin-left: auto;
  margin-top: var(--sp-2);
}
.barcode-wrap svg {
  height: 100%;
  width: 100%;
}

/* ========== META BAR ========== */
.meta-bar {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  background: var(--brand-50);
  border-radius: var(--radius-md);
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-5);
  gap: var(--sp-1);
}
.meta-bar .cell { text-align: center; }
.meta-bar .cell-label {
  font-size: var(--fs-2xs);
  color: var(--ink-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}
.meta-bar .cell-value {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--ink-900);
  margin-top: 1px;
}

/* ========== INFO GRID ========== */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}
.card {
  border: var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--sp-4);
  background: var(--surface-0);
}
.card-title {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--brand-600);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--sp-2);
  padding-bottom: var(--sp-2);
  border-bottom: 2px solid var(--brand-100);
}
.name-strong {
  font-weight: 700;
  color: var(--ink-900);
  font-size: var(--fs-md);
}
.kv {
  display: grid;
  grid-template-columns: auto 10px 1fr;
  gap: 2px 0;
  font-size: var(--fs-sm);
  line-height: 1.7;
}
.kv .k { color: var(--ink-400); white-space: nowrap; }
.kv .v { color: var(--ink-700); font-weight: 500; }

/* ========== ITEMS TABLE ========== */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
  margin-bottom: var(--sp-5);
}
.table thead th {
  background: var(--brand-700);
  color: #fff;
  font-weight: 600;
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: var(--sp-2) var(--sp-3);
  text-align: left;
}
.table thead th:nth-child(n+4) { text-align: right; }
.table thead th:last-child { text-align: right; }
.table tbody td {
  padding: var(--sp-2) var(--sp-3);
  border-bottom: var(--border-1);
  color: var(--ink-700);
  vertical-align: top;
}
.table tbody td:nth-child(n+4) { text-align: right; }
.table tbody td:last-child { text-align: right; }
.table tbody tr:last-child td { border-bottom: none; }
.table .desc {
  font-size: var(--fs-2xs);
  color: var(--ink-400);
  margin-top: 1px;
}
.table .item-title {
  font-weight: 600;
  color: var(--ink-900);
}

/* ========== LOWER SECTION ========== */
.lower {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}
.terms {
  border: var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--sp-4);
}
.terms h3 {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--brand-600);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--sp-2);
  padding-bottom: var(--sp-2);
  border-bottom: 2px solid var(--brand-100);
}
.terms ol {
  padding-left: 18px;
  margin: 0;
}
.terms ol li {
  font-size: var(--fs-sm);
  color: var(--ink-500);
  line-height: var(--lh-loose);
  padding-left: 2px;
}

/* ========== TOTALS ========== */
.totals {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.total-rows {
  margin-left: auto;
  width: 260px;
}
.total-row {
  display: flex;
  justify-content: space-between;
  padding: var(--sp-1) 0;
  font-size: var(--fs-sm);
  color: var(--ink-500);
  border-bottom: var(--border-1);
}
.total-row .label { font-weight: 500; }
.total-row .value {
  font-weight: 600;
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
}
.grand {
  background: var(--brand-700);
  color: #fff;
  border-radius: var(--radius-sm);
  padding: var(--sp-3) var(--sp-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--sp-2);
}
.grand .label {
  font-size: var(--fs-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.grand .value {
  font-size: var(--fs-xl);
  font-weight: 800;
}

/* ========== AMOUNT IN WORDS ========== */
.words {
  background: var(--brand-50);
  border-radius: var(--radius-sm);
  padding: var(--sp-2) var(--sp-3);
  margin-top: var(--sp-3);
  font-size: var(--fs-2xs);
  color: var(--ink-500);
  line-height: var(--lh-normal);
}
.words strong {
  color: var(--brand-700);
  font-weight: 600;
}

/* ========== FOOT SECTION ========== */
.foot {
  display: grid;
  grid-template-columns: 1fr 1.35fr 0.9fr 0.95fr;
  gap: var(--sp-5);
  align-items: flex-end;
  margin-top: auto;
  padding-top: var(--sp-6);
}
.fblock { text-align: center; }
.sign-img {
  font-family: 'Segoe Script', 'Brush Script MT', cursive;
  font-size: var(--fs-xl);
  color: var(--ink-900);
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 400;
}
.sign-line {
  border-top: var(--border-2);
  margin-top: var(--sp-2);
  padding-top: var(--sp-1);
}
.sign-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--ink-900);
}
.sign-role {
  font-size: var(--fs-2xs);
  color: var(--ink-400);
  margin-top: 1px;
}

/* ========== ACCEPTANCE BOX ========== */
.accept-box {
  border: 2px dashed var(--brand-600);
  border-radius: var(--radius-md);
  background: var(--brand-50);
  padding: var(--sp-4);
  text-align: center;
}
.accept-box h4 {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--brand-700);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--sp-3);
}
.accept-box .accept-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-2xs);
  color: var(--ink-500);
  gap: var(--sp-3);
}
.accept-box .accept-row .field {
  flex: 1;
  text-align: center;
}
.accept-box .accept-row .field-label {
  font-weight: 600;
  color: var(--ink-700);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--sp-3);
}
.accept-line {
  border-bottom: 1px solid var(--brand-600);
  height: 20px;
}

/* ========== STAMP & QR ========== */
.stamp {
  width: 104px;
  height: 104px;
  margin: 0 auto;
  opacity: 0.85;
}
.qr {
  width: 92px;
  height: 92px;
  margin: 0 auto;
}
.qr img {
  width: 92px;
  height: 92px;
}

/* ========== PAGE FOOT ========== */
.page-foot {
  margin-top: var(--sp-8);
  padding-top: var(--sp-3);
  border-top: 2px solid var(--brand-500);
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--ink-400);
}
.page-foot strong {
  color: var(--brand-600);
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
}

/* ========== PRINT ========== */
@media print {
  body { background: #fff !important; margin: 0; padding: 0; }
  .page { box-shadow: none !important; border-radius: 0 !important; }
  @page { size: A4; margin: 0; }
}
`;

// ============ HTML GENERATOR ============

export async function generateQuotationHtml(data: QuotationPdfData): Promise<string> {
  // Computed values
  const lineItems = parseLineItems(data.items);
  const terms = parseTerms(data.terms);
  const currency = data.currency || 'BND';

  const barcodeValue = data.quotationNo || data.id;
  const statusLabel = STATUS_LABELS[data.status] || data.status;
  const vDays = validityDays(data.createdAt, data.validUntil);
  const sAttr = statusAttr(data.status);

  const customerName = data.customer?.companyName || data.customer?.name || '—';
  const customerAddr = [data.customer?.address, data.customer?.district, data.customer?.country].filter(Boolean).join(', ') || '—';
  const customerPhone = data.customer?.phone || '—';
  const customerPic = data.customer?.pic || '—';

  const preparedName = data.preparedByName || '—';
  const preparedLast = preparedName.split(' ').pop() || preparedName;

  const projectTitle = data.projectName || data.title || '—';
  const siteAddr = data.site || '—';
  const scopeDesc = data.description || '';

  const amountWords = numberToCurrencyWords(data.total);

  // Generate QR code data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(`${COMPANY.website}/quotations/${data.id}`, {
      width: 92,
      margin: 0,
      color: { dark: '#333f38', light: '#00000000' },
    });
  } catch {
    /* qr generation error */
  }

  // Build barcode SVG
  const barcodeId = 'bc_' + data.id.replace(/[^a-zA-Z0-9]/g, '');
  const barcodeSvg = `<svg id="${barcodeId}"></svg>
<script>
  try { JsBarcode(document.getElementById('${barcodeId}'), '${esc(barcodeValue)}', { format:'CODE128', width:1.5, height:38, displayValue:false, margin:0 }); } catch(e) {}
</script>`;

  // Build status badges
  const statusBadge = `<span class="status-badge">${esc(statusLabel)}</span>`;
  const validityChip = vDays !== null && vDays > 0
    ? `<span class="validity-chip">${vDays} days valid</span>`
    : '';

  // Build table rows
  const tableRows = lineItems.length > 0
    ? lineItems.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div class="item-title">${esc(item.title)}</div>
          ${item.description ? `<div class="desc">${esc(item.description)}</div>` : ''}
        </td>
        <td>${item.quantity}</td>
        <td>${esc(item.unit)}</td>
        <td>${fmtBND(item.rate)}</td>
        <td>${fmtBND(item.amount)}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:var(--ink-400);padding:var(--sp-6)">No line items</td></tr>`;

  // Build total rows
  const subtotalRow = `<div class="total-row"><span class="label">Subtotal</span><span class="value">${fmtBND(data.subtotal)}</span></div>`;
  const taxRow = data.taxRate > 0 && data.tax > 0
    ? `<div class="total-row"><span class="label">Tax (${data.taxRate}%)</span><span class="value">${fmtBND(data.tax)}</span></div>`
    : '';
  const discountRow = data.discount > 0
    ? `<div class="total-row"><span class="label">Discount</span><span class="value">-${fmtBND(data.discount)}</span></div>`
    : '';
  const shippingRow = data.shipping > 0
    ? `<div class="total-row"><span class="label">Shipping</span><span class="value">${fmtBND(data.shipping)}</span></div>`
    : '';

  // Build terms list
  const termsList = terms.map(t => `<li>${esc(t)}</li>`).join('');

  // Notes truncated
  const notesHtml = data.notes
    ? `<span class="k">Notes</span><span>:</span><span class="v" style="max-width:140px">${esc(data.notes.length > 60 ? data.notes.slice(0, 60) + '...' : data.notes)}</span>`
    : '';

  // Scope description truncated
  const scopeHtml = scopeDesc
    ? `<div style="font-size:var(--fs-2xs);color:var(--ink-400);margin-top:var(--sp-2);line-height:1.5">${esc(scopeDesc.length > 140 ? scopeDesc.slice(0, 140) + '...' : scopeDesc)}</div>`
    : '';

  // Assemble full HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(statusLabel)} Quotation ${esc(data.quotationNo || '')}</title>
<style>${CSS}</style>
</head>
<body data-status="${sAttr}">
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="brand-top">
        <div class="logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="16" font-weight="900" font-family="Arial">HMS</text>
          </svg>
        </div>
        <div>
          <div class="company-name">${esc(COMPANY.name)}</div>
          <div class="company-sub">Brunei</div>
        </div>
      </div>
      <div class="brand-meta">
        <div class="row">${SVG_PHONE} <span>${esc(COMPANY.phone)}</span></div>
        <div class="row">${SVG_MAIL} <span>${esc(COMPANY.email)}</span></div>
        <div class="row">${SVG_GLOBE} <span>${esc(COMPANY.website)}</span></div>
        <div class="row">${SVG_BUILDING} <span>${esc(COMPANY.fullAddress)}</span></div>
      </div>
    </div>
    <div class="doc-block">
      <div class="doc-title">QUOTATION</div>
      <div class="doc-no">${esc(data.quotationNo || '—')}</div>
      <div class="badge-row">
        ${statusBadge}
        ${validityChip}
      </div>
      <div class="barcode-wrap">
        ${barcodeSvg}
      </div>
    </div>
  </div>

  <!-- META BAR -->
  <div class="meta-bar">
    <div class="cell">
      <div class="cell-label">Date</div>
      <div class="cell-value">${esc(fmtDate(data.createdAt))}</div>
    </div>
    <div class="cell">
      <div class="cell-label">Valid Until</div>
      <div class="cell-value">${esc(fmtDate(data.validUntil))}</div>
    </div>
    <div class="cell">
      <div class="cell-label">Reference</div>
      <div class="cell-value">${esc(data.referenceNo || '—')}</div>
    </div>
    <div class="cell">
      <div class="cell-label">Currency</div>
      <div class="cell-value">${esc(currency)}</div>
    </div>
    <div class="cell">
      <div class="cell-label">Sales Person</div>
      <div class="cell-value">${esc(data.salesPerson || '—')}</div>
    </div>
    <div class="cell">
      <div class="cell-label">Delivery</div>
      <div class="cell-value">${esc(data.deliveryPeriod || '3 working days')}</div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <!-- Card 1: Prepared For -->
    <div class="card">
      <div class="card-title">Prepared For</div>
      <div class="name-strong">${esc(customerName)}</div>
      <div class="kv" style="margin-top:var(--sp-2)">
        <span class="k">PIC</span><span>:</span><span class="v">${esc(customerPic)}</span>
        <span class="k">Phone</span><span>:</span><span class="v">${esc(customerPhone)}</span>
        <span class="k">Email</span><span>:</span><span class="v">${esc(data.customer?.email || '—')}</span>
      </div>
      <div style="font-size:var(--fs-2xs);color:var(--ink-400);margin-top:var(--sp-1);line-height:1.4">${esc(customerAddr)}</div>
    </div>

    <!-- Card 2: Project / Site -->
    <div class="card">
      <div class="card-title">Project / Site</div>
      <div class="name-strong">${esc(projectTitle)}</div>
      <div class="kv" style="margin-top:var(--sp-2)">
        <span class="k">Site</span><span>:</span><span class="v" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(siteAddr)}</span>
      </div>
      ${scopeHtml}
    </div>

    <!-- Card 3: Quotation Summary -->
    <div class="card">
      <div class="card-title">Quotation Summary</div>
      <div class="kv">
        <span class="k">Items</span><span>:</span><span class="v">${lineItems.length} line(s)</span>
        <span class="k">Warranty</span><span>:</span><span class="v">${esc(data.warranty || 'As per terms')}</span>
        ${notesHtml}
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table class="table">
    <thead>
      <tr>
        <th style="width:6%">#</th>
        <th style="width:36%">Description</th>
        <th style="width:10%">Qty</th>
        <th style="width:10%">Unit</th>
        <th style="width:16%">Rate</th>
        <th style="width:22%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- LOWER: Terms + Totals -->
  <div class="lower">
    <!-- Terms & Conditions -->
    <div class="terms">
      <h3>Terms &amp; Conditions</h3>
      <ol>
        ${termsList}
      </ol>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="total-rows">
        ${subtotalRow}
        ${taxRow}
        ${discountRow}
        ${shippingRow}
        <div class="grand">
          <span class="label">Grand Total</span>
          <span class="value">${esc(currency)} ${fmtBND(data.total)}</span>
        </div>
        <div class="words">
          <strong>Amount in Words:</strong> ${esc(amountWords)}
        </div>
      </div>
    </div>
  </div>

  <!-- FOOT SECTION -->
  <div class="foot">
    <!-- Prepared By -->
    <div class="fblock">
      <div class="sign-img">${esc(preparedLast)}</div>
      <div class="sign-line">
        <div class="sign-name">${esc(preparedName)}</div>
        <div class="sign-role">Prepared By</div>
      </div>
    </div>

    <!-- Client Acceptance -->
    <div class="accept-box">
      <h4>Client Acceptance</h4>
      <div class="accept-row">
        <div class="field">
          <div class="field-label">Signature</div>
          <div class="accept-line"></div>
        </div>
        <div class="field">
          <div class="field-label">Date</div>
          <div class="accept-line"></div>
        </div>
      </div>
    </div>

    <!-- Company Stamp -->
    <div class="fblock">
      <div class="stamp">
        ${STAMP_SVG}
      </div>
      <div class="sign-role" style="margin-top:var(--sp-1)">Company Stamp</div>
    </div>

    <!-- QR Code -->
    <div class="fblock">
      <div class="qr">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" width="92" height="92" />` : ''}
      </div>
      <div class="sign-role" style="margin-top:var(--sp-1)">Scan to Verify</div>
    </div>
  </div>

  <!-- PAGE FOOT -->
  <div class="page-foot">
    <strong>THANK YOU!</strong>
    <div style="margin-top:2px">${esc(COMPANY.name)} &middot; ${esc(COMPANY.address)} &middot; ${esc(COMPANY.phone)}</div>
  </div>

</div>
</body>
</html>`;
}