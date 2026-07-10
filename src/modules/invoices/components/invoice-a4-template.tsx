'use client';

import { useRef, useEffect, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import JsBarcode from 'jsbarcode';
import dynamic from 'next/dynamic';
import { COMPANY, DEFAULT_INVOICE_TERMS, DEFAULT_PAYMENT } from '@/core/constants/company';
import { numberToCurrencyWords } from '@/core/utils/number-to-words';
import type { InvoiceLineItem, InvoicePaymentItem } from '@/core/types';

// ============ DYNAMIC IMPORTS (SSR disabled) ============

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false },
);

// ============ EXPORTED HELPERS ============

/** Format number as BND currency string, e.g. "1,234.56" */
export function fmtBND(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format ISO date string to dd/MM/yyyy, or return dash */
export function fmtDate(d?: string): string {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}

/** Safely parse JSON string of InvoiceLineItem[] */
export function parseLineItems(itemsStr?: string): InvoiceLineItem[] {
  if (!itemsStr) return [];
  try {
    const parsed = JSON.parse(itemsStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* empty */
  }
  return [];
}

/** Safely parse JSON string of string[] (terms), fallback to defaults */
export function parseTerms(termsStr?: string): string[] {
  if (!termsStr) return DEFAULT_INVOICE_TERMS;
  try {
    const parsed = JSON.parse(termsStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* empty */
  }
  return DEFAULT_INVOICE_TERMS;
}

// ============ TYPES ============

export interface InvoiceA4TemplateProps {
  invoice: {
    id: string;
    invoiceNumber?: string;
    title: string;
    description?: string;
    referenceNo?: string;
    projectName?: string;
    site?: string;
    preparedByName?: string;
    salesPerson?: string;
    items?: string;
    terms?: string;
    currency?: string;
    subtotal: number;
    taxRate: number;
    tax: number;
    discount: number;
    shipping: number;
    total: number;
    status: string;
    dueDate?: string;
    notes?: string;
    warranty?: string;
    createdAt: string;
    poReference?: string;
    paymentTerms?: string;
    amountPaid?: number;
    balanceDue?: number;
    payments?: InvoicePaymentItem[];
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
  };
}

// ============ STATUS CONFIG ============

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  REVIEW: 'In Review',
  APPROVED: 'Approved',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
};

/** Map internal status to CSS data-status attribute */
function statusAttr(s: string): string {
  if (s === 'SENT' || s === 'VIEWED') return 'sent';
  if (s === 'PAID' || s === 'PARTIALLY_PAID') return 'paid';
  if (s === 'OVERDUE') return 'expired';
  if (s === 'CANCELLED') return 'expired';
  return 'draft';
}

// ============ INLINE SVG ICONS ============

function IconPhone({ className = 'ic' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMail({ className = 'ic' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconGlobe({ className = 'ic' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconBuilding({ className = 'ic' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

// ============ COMPANY STAMP ============

function CompanyStamp() {
  return (
    <svg viewBox="0 0 120 120" width="104" height="104" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="60" cy="60" r="55" fill="none" stroke="#149252" strokeWidth="2.5" />
      {/* Inner circle */}
      <circle cx="60" cy="60" r="48" fill="none" stroke="#149252" strokeWidth="1.5" />
      {/* Top arc text: MOHD.HMS ENTERPRISE */}
      <path id="topArcInv" d="M 15,60 A 45,45 0 0,1 105,60" fill="none" />
      <text fill="#149252" fontSize="10.5" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="2">
        <textPath href="#topArcInv" startOffset="50%" textAnchor="middle">MOHD.HMS ENTERPRISE</textPath>
      </text>
      {/* Bottom arc text: BRUNEI */}
      <path id="bottomArcInv" d="M 18,65 A 43,43 0 0,0 102,65" fill="none" />
      <text fill="#149252" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="3">
        <textPath href="#bottomArcInv" startOffset="50%" textAnchor="middle">BRUNEI</textPath>
      </text>
      {/* HMS Badge */}
      <rect x="40" y="40" width="40" height="32" rx="4" fill="none" stroke="#149252" strokeWidth="2" />
      <text x="60" y="62" textAnchor="middle" fill="#149252" fontSize="18" fontWeight="900" fontFamily="Arial, sans-serif">HMS</text>
      {/* Registration number */}
      <text x="60" y="85" textAnchor="middle" fill="#149252" fontSize="9" fontWeight="600" fontFamily="Arial, sans-serif">BE1318</text>
    </svg>
  );
}

// ============ TEMPLATE STYLES ============

function TemplateStyles() {
  return (
    <style>{`
/* ========== DESIGN TOKENS ========== */
.inv-tpl,
.inv-tpl .page {
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
.inv-tpl .page[data-status="draft"] {
  --status-fg: #6b7280;
  --status-bg: #f3f4f6;
  --status-line: #d1d5db;
}
.inv-tpl .page[data-status="sent"] {
  --status-fg: #2563eb;
  --status-bg: #eff6ff;
  --status-line: #93c5fd;
}
.inv-tpl .page[data-status="paid"] {
  --status-fg: #059669;
  --status-bg: #ecfdf5;
  --status-line: #6ee7b7;
}
.inv-tpl .page[data-status="expired"] {
  --status-fg: #dc2626;
  --status-bg: #fef2f2;
  --status-line: #fca5a5;
}

/* ========== PAGE ========== */
.inv-tpl .page {
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 12mm 9mm;
  background: var(--surface-0);
  box-sizing: border-box;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  color: var(--ink-900);
  font-size: var(--fs-base);
  line-height: var(--lh-normal);
  position: relative;
}

/* ========== HEADER ========== */
.inv-tpl .header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--sp-5);
}
.inv-tpl .brand-top {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.inv-tpl .logo {
  width: 48px;
  height: 48px;
  background: var(--brand-600);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.inv-tpl .logo svg {
  width: 30px;
  height: 30px;
}
.inv-tpl .company-name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--ink-900);
  line-height: var(--lh-tight);
  letter-spacing: -0.5px;
}
.inv-tpl .company-sub {
  font-size: 10.5px;
  letter-spacing: 5px;
  color: var(--brand-600);
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 1px;
}
.inv-tpl .brand-meta {
  font-size: 9.8px;
  color: var(--ink-500);
  margin-top: var(--sp-2);
}
.inv-tpl .brand-meta .row {
  display: flex;
  align-items: center;
  gap: 7px;
  line-height: 1.7;
}
.inv-tpl .ic {
  width: 12px;
  height: 12px;
  color: var(--brand-600);
  flex-shrink: 0;
}

/* ========== DOC BLOCK ========== */
.inv-tpl .doc-block {
  text-align: right;
  flex-shrink: 0;
}
.inv-tpl .doc-title {
  font-size: var(--fs-display);
  font-weight: 800;
  color: var(--brand-600);
  line-height: 1;
  letter-spacing: -1px;
}
.inv-tpl .doc-no {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--ink-700);
  margin-top: var(--sp-1);
}

/* ========== STATUS BADGE ========== */
.inv-tpl .status-badge {
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
.inv-tpl .due-chip {
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

/* ========== BARCODE ========== */
.inv-tpl .barcode-wrap {
  height: 38px;
  width: 200px;
  margin-left: auto;
  margin-top: var(--sp-2);
}
.inv-tpl .barcode-wrap svg {
  height: 100%;
  width: 100%;
}

/* ========== META BAR ========== */
.inv-tpl .meta-bar {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  background: var(--brand-50);
  border-radius: var(--radius-md);
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-5);
  gap: var(--sp-1);
}
.inv-tpl .meta-bar .cell {
  text-align: center;
}
.inv-tpl .meta-bar .cell-label {
  font-size: var(--fs-2xs);
  color: var(--ink-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}
.inv-tpl .meta-bar .cell-value {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--ink-900);
  margin-top: 1px;
}

/* ========== INFO GRID ========== */
.inv-tpl .info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}
.inv-tpl .card {
  border: var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--sp-4);
  background: var(--surface-0);
}
.inv-tpl .card-title {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--brand-600);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--sp-2);
  padding-bottom: var(--sp-2);
  border-bottom: 2px solid var(--brand-100);
}
.inv-tpl .name-strong {
  font-weight: 700;
  color: var(--ink-900);
  font-size: var(--fs-md);
}
.inv-tpl .kv {
  display: grid;
  grid-template-columns: auto 10px 1fr;
  gap: 2px 0;
  font-size: var(--fs-sm);
  line-height: 1.7;
}
.inv-tpl .kv .k {
  color: var(--ink-400);
  white-space: nowrap;
}
.inv-tpl .kv .s { /* separator dot */ }
.inv-tpl .kv .v {
  color: var(--ink-700);
  font-weight: 500;
}

/* ========== ITEMS TABLE ========== */
.inv-tpl .table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
  margin-bottom: var(--sp-5);
}
.inv-tpl .table thead th {
  background: var(--brand-700);
  color: #fff;
  font-weight: 600;
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: var(--sp-2) var(--sp-3);
  text-align: left;
}
.inv-tpl .table thead th:last-child,
.inv-tpl .table thead th:nth-child(n+4) {
  text-align: right;
}
.inv-tpl .table tbody td {
  padding: var(--sp-2) var(--sp-3);
  border-bottom: var(--border-1);
  color: var(--ink-700);
  vertical-align: top;
}
.inv-tpl .table tbody td:last-child,
.inv-tpl .table tbody td:nth-child(n+4) {
  text-align: right;
}
.inv-tpl .table tbody tr:last-child td {
  border-bottom: none;
}
.inv-tpl .table .desc {
  font-size: var(--fs-2xs);
  color: var(--ink-400);
  margin-top: 1px;
}
.inv-tpl .table .item-title {
  font-weight: 600;
  color: var(--ink-900);
}

/* ========== LOWER SECTION ========== */
.inv-tpl .lower {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}
.inv-tpl .terms {
  border: var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--sp-4);
}
.inv-tpl .terms h3 {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--brand-600);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--sp-2);
  padding-bottom: var(--sp-2);
  border-bottom: 2px solid var(--brand-100);
}
.inv-tpl .terms ol {
  padding-left: 18px;
  margin: 0;
}
.inv-tpl .terms ol li {
  font-size: var(--fs-sm);
  color: var(--ink-500);
  line-height: var(--lh-loose);
  padding-left: 2px;
}

/* ========== TOTALS ========== */
.inv-tpl .totals {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.inv-tpl .total-rows {
  margin-left: auto;
  width: 260px;
}
.inv-tpl .total-row {
  display: flex;
  justify-content: space-between;
  padding: var(--sp-1) 0;
  font-size: var(--fs-sm);
  color: var(--ink-500);
  border-bottom: var(--border-1);
}
.inv-tpl .total-row .label {
  font-weight: 500;
}
.inv-tpl .total-row .value {
  font-weight: 600;
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
}
.inv-tpl .grand {
  background: var(--brand-700);
  color: #fff;
  border-radius: var(--radius-sm);
  padding: var(--sp-3) var(--sp-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--sp-2);
}
.inv-tpl .grand .label {
  font-size: var(--fs-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.inv-tpl .grand .value {
  font-size: var(--fs-xl);
  font-weight: 800;
}

/* ========== AMOUNT IN WORDS ========== */
.inv-tpl .words {
  background: var(--brand-50);
  border-radius: var(--radius-sm);
  padding: var(--sp-2) var(--sp-3);
  margin-top: var(--sp-3);
  font-size: var(--fs-2xs);
  color: var(--ink-500);
  line-height: var(--lh-normal);
}
.inv-tpl .words strong {
  color: var(--brand-700);
  font-weight: 600;
}

/* ========== PAYMENT DETAILS ========== */
.inv-tpl .payment-details {
  border: var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--sp-4);
  margin-bottom: var(--sp-5);
}
.inv-tpl .payment-details h3 {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--brand-600);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--sp-2);
  padding-bottom: var(--sp-2);
  border-bottom: 2px solid var(--brand-100);
}
.inv-tpl .payment-details .kv {
  font-size: var(--fs-sm);
}

/* ========== FOOT SECTION ========== */
.inv-tpl .foot {
  display: grid;
  grid-template-columns: 1fr 1.35fr 0.9fr 0.95fr;
  gap: var(--sp-5);
  align-items: flex-end;
  margin-top: auto;
  padding-top: var(--sp-6);
}
.inv-tpl .fblock {
  text-align: center;
}
.inv-tpl .sign-img {
  font-family: 'Segoe Script', 'Brush Script MT', cursive;
  font-size: var(--fs-xl);
  color: var(--ink-900);
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 400;
}
.inv-tpl .sign-line {
  border-top: var(--border-2);
  margin-top: var(--sp-2);
  padding-top: var(--sp-1);
}
.inv-tpl .sign-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--ink-900);
}
.inv-tpl .sign-role {
  font-size: var(--fs-2xs);
  color: var(--ink-400);
  margin-top: 1px;
}

/* ========== ACCEPTANCE BOX ========== */
.inv-tpl .accept-box {
  border: 2px dashed var(--brand-600);
  border-radius: var(--radius-md);
  background: var(--brand-50);
  padding: var(--sp-4);
  text-align: center;
}
.inv-tpl .accept-box h4 {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--brand-700);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--sp-3);
}
.inv-tpl .accept-box .accept-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-2xs);
  color: var(--ink-500);
  gap: var(--sp-3);
}
.inv-tpl .accept-box .accept-row .field {
  flex: 1;
  text-align: center;
}
.inv-tpl .accept-box .accept-row .field-label {
  font-weight: 600;
  color: var(--ink-700);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--sp-3);
}
.inv-tpl .accept-box .accept-line {
  border-bottom: 1px solid var(--brand-600);
  height: 20px;
}

/* ========== STAMP & QR ========== */
.inv-tpl .stamp {
  width: 104px;
  height: 104px;
  margin: 0 auto;
  opacity: 0.85;
}
.inv-tpl .qr {
  width: 92px;
  height: 92px;
  margin: 0 auto;
}

/* ========== PAGE FOOT ========== */
.inv-tpl .page-foot {
  margin-top: var(--sp-8);
  padding-top: var(--sp-3);
  border-top: 2px solid var(--brand-500);
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--ink-400);
}
.inv-tpl .page-foot strong {
  color: var(--brand-600);
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
}

/* ========== PRINT ========== */
@media print {
  .inv-tpl .page {
    box-shadow: none !important;
    border-radius: 0 !important;
  }
}
@media print {
  body {
    background: #fff !important;
    margin: 0;
    padding: 0;
  }
  @page {
    size: A4;
    margin: 0;
  }
}
    `}</style>
  );
}

// ============ MAIN COMPONENT ============

export function InvoiceA4Template({ invoice: inv }: InvoiceA4TemplateProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Computed values
  const lineItems = useMemo(() => parseLineItems(inv.items), [inv.items]);
  const terms = useMemo(() => parseTerms(inv.terms), [inv.terms]);
  const currency = inv.currency || 'BND';

  const barcodeValue = inv.invoiceNumber || inv.id;
  const statusLabel = STATUS_LABELS[inv.status] || inv.status;

  const customerName = inv.customer?.companyName || inv.customer?.name || '—';
  const customerAddr = [inv.customer?.address, inv.customer?.district, inv.customer?.country].filter(Boolean).join(', ') || '—';
  const customerPhone = inv.customer?.phone || '—';
  const customerPic = inv.customer?.pic || '—';

  const preparedName = inv.preparedByName || '—';
  const preparedLast = preparedName.split(' ').pop() || preparedName;

  const projectTitle = inv.projectName || inv.title || '—';

  const amountWords = useMemo(() => numberToCurrencyWords(inv.total), [inv.total]);

  const amountPaid = inv.amountPaid ?? (inv.payments?.reduce((s, p) => s + p.amount, 0) ?? 0);
  const balanceDue = inv.balanceDue ?? (inv.total - amountPaid);

  // Barcode effect
  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: false,
          margin: 0,
        });
      } catch {
        /* barcode generation error */
      }
    }
  }, [barcodeValue]);

  return (
    <div className="inv-tpl">
      <TemplateStyles />
      <div className="page" data-status={statusAttr(inv.status)}>
        {/* ===== HEADER ===== */}
        <div className="header">
          <div>
            <div className="brand-top">
              <div className="logo">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900" fontFamily="Arial">HMS</text>
                </svg>
              </div>
              <div>
                <div className="company-name">{COMPANY.name}</div>
                <div className="company-sub">Brunei</div>
              </div>
            </div>
            <div className="brand-meta">
              <div className="row"><IconPhone /> <span>{COMPANY.phone}</span></div>
              <div className="row"><IconMail /> <span>{COMPANY.email}</span></div>
              <div className="row"><IconGlobe /> <span>{COMPANY.website}</span></div>
              <div className="row"><IconBuilding /> <span>{COMPANY.fullAddress}</span></div>
            </div>
          </div>
          <div className="doc-block">
            <div className="doc-title">INVOICE</div>
            <div className="doc-no">{inv.invoiceNumber || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap' }}>
              <span className="status-badge">{statusLabel}</span>
              {inv.dueDate && (
                <span className="due-chip">Due: {fmtDate(inv.dueDate)}</span>
              )}
            </div>
            <div className="barcode-wrap">
              <svg ref={barcodeRef} />
            </div>
          </div>
        </div>

        {/* ===== META BAR ===== */}
        <div className="meta-bar">
          <div className="cell">
            <div className="cell-label">Date</div>
            <div className="cell-value">{fmtDate(inv.createdAt)}</div>
          </div>
          <div className="cell">
            <div className="cell-label">Due Date</div>
            <div className="cell-value">{fmtDate(inv.dueDate)}</div>
          </div>
          <div className="cell">
            <div className="cell-label">Reference</div>
            <div className="cell-value">{inv.referenceNo || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-label">Currency</div>
            <div className="cell-value">{currency}</div>
          </div>
          <div className="cell">
            <div className="cell-label">PO Ref</div>
            <div className="cell-value">{inv.poReference || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-label">Payment</div>
            <div className="cell-value">{inv.paymentTerms || '—'}</div>
          </div>
        </div>

        {/* ===== INFO GRID ===== */}
        <div className="info-grid">
          {/* Card 1: Bill To */}
          <div className="card">
            <div className="card-title">Bill To</div>
            <div className="name-strong">{customerName}</div>
            <div className="kv" style={{ marginTop: 'var(--sp-2)' }}>
              <span className="k">PIC</span><span className="s">:</span><span className="v">{customerPic}</span>
              <span className="k">Phone</span><span className="s">:</span><span className="v">{customerPhone}</span>
              <span className="k">Email</span><span className="s">:</span><span className="v">{inv.customer?.email || '—'}</span>
            </div>
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-400)', marginTop: 'var(--sp-1)', lineHeight: 1.4 }}>{customerAddr}</div>
          </div>

          {/* Card 2: Project / Site */}
          <div className="card">
            <div className="card-title">Project / Site</div>
            <div className="name-strong">{projectTitle}</div>
            {inv.site && (
              <div className="kv" style={{ marginTop: 'var(--sp-2)' }}>
                <span className="k">Site</span><span className="s">:</span><span className="v" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.site}</span>
              </div>
            )}
            {inv.description && (
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-400)', marginTop: 'var(--sp-2)', lineHeight: 1.5 }}>
                {inv.description.length > 140 ? inv.description.slice(0, 140) + '...' : inv.description}
              </div>
            )}
          </div>

          {/* Card 3: Invoice Summary */}
          <div className="card">
            <div className="card-title">Invoice Summary</div>
            <div className="kv">
              <span className="k">Items</span><span className="s">:</span><span className="v">{lineItems.length} line(s)</span>
              {inv.notes && (
                <>
                  <span className="k">Notes</span><span className="s">:</span><span className="v" style={{ maxWidth: 140 }}>{inv.notes.length > 60 ? inv.notes.slice(0, 60) + '...' : inv.notes}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ===== ITEMS TABLE ===== */}
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>#</th>
              <th style={{ width: '36%' }}>Description</th>
              <th style={{ width: '10%' }}>Qty</th>
              <th style={{ width: '10%' }}>Unit</th>
              <th style={{ width: '16%' }}>Rate</th>
              <th style={{ width: '22%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={item.id || idx}>
                <td>{idx + 1}</td>
                <td>
                  <div className="item-title">{item.title}</div>
                  {item.description && <div className="desc">{item.description}</div>}
                </td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>{fmtBND(item.rate)}</td>
                <td>{fmtBND(item.amount)}</td>
              </tr>
            ))}
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-400)', padding: 'var(--sp-6)' }}>
                  No line items
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ===== PAYMENT DETAILS ===== */}
        <div className="payment-details">
          <h3>Payment Details</h3>
          <div className="kv">
            <span className="k">Bank</span><span className="s">:</span><span className="v">{DEFAULT_PAYMENT.bankName}</span>
            <span className="k">Account Name</span><span className="s">:</span><span className="v">{DEFAULT_PAYMENT.accountName}</span>
            <span className="k">Account No.</span><span className="s">:</span><span className="v">{DEFAULT_PAYMENT.accountNo}</span>
          </div>
        </div>

        {/* ===== LOWER: Terms + Totals ===== */}
        <div className="lower">
          {/* Terms & Conditions */}
          <div className="terms">
            <h3>Terms &amp; Conditions</h3>
            <ol>
              {terms.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>

          {/* Totals */}
          <div className="totals">
            <div className="total-rows">
              <div className="total-row">
                <span className="label">Subtotal</span>
                <span className="value">{fmtBND(inv.subtotal)}</span>
              </div>
              {inv.taxRate > 0 && inv.tax > 0 && (
                <div className="total-row">
                  <span className="label">Tax ({inv.taxRate}%)</span>
                  <span className="value">{fmtBND(inv.tax)}</span>
                </div>
              )}
              {inv.discount > 0 && (
                <div className="total-row">
                  <span className="label">Discount</span>
                  <span className="value">-{fmtBND(inv.discount)}</span>
                </div>
              )}
              {inv.shipping > 0 && (
                <div className="total-row">
                  <span className="label">Shipping</span>
                  <span className="value">{fmtBND(inv.shipping)}</span>
                </div>
              )}
              <div className="grand">
                <span className="label">Grand Total</span>
                <span className="value">{currency} {fmtBND(inv.total)}</span>
              </div>
              <div className="words">
                <strong>Amount in Words:</strong> {amountWords}
              </div>

              {/* Amount Paid / Balance Due */}
              <div style={{ marginTop: 'var(--sp-3)' }}>
                <div className="total-row">
                  <span className="label">Amount Paid</span>
                  <span className="value" style={{ color: '#059669' }}>{fmtBND(amountPaid)}</span>
                </div>
                <div className="total-row" style={{ borderBottom: 'none', fontWeight: 700, fontSize: 'var(--fs-md)' }}>
                  <span className="label">Balance Due</span>
                  <span className="value" style={{ color: amountPaid > 0 ? '#059669' : 'var(--ink-900)' }}>{fmtBND(balanceDue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FOOT SECTION ===== */}
        <div className="foot">
          {/* Prepared By */}
          <div className="fblock">
            <div className="sign-img">{preparedLast}</div>
            <div className="sign-line">
              <div className="sign-name">{preparedName}</div>
              <div className="sign-role">Prepared By</div>
            </div>
          </div>

          {/* Client Acknowledgement */}
          <div className="accept-box">
            <h4>Client Acknowledgement</h4>
            <div className="accept-row">
              <div className="field">
                <div className="field-label">Signature</div>
                <div className="accept-line" />
              </div>
              <div className="field">
                <div className="field-label">Date</div>
                <div className="accept-line" />
              </div>
            </div>
          </div>

          {/* Company Stamp */}
          <div className="fblock">
            <div className="stamp">
              <CompanyStamp />
            </div>
            <div className="sign-role" style={{ marginTop: 'var(--sp-1)' }}>Company Stamp</div>
          </div>

          {/* QR Code */}
          <div className="fblock">
            <div className="qr">
              <QRCodeSVG
                value={`${COMPANY.website}/invoices/${inv.id}`}
                size={92}
                level="M"
                bgColor="transparent"
                fgColor="var(--ink-700)"
              />
            </div>
            <div className="sign-role" style={{ marginTop: 'var(--sp-1)' }}>Scan to Verify</div>
          </div>
        </div>

        {/* ===== PAGE FOOT ===== */}
        <div className="page-foot">
          <strong>THANK YOU!</strong>
          <div style={{ marginTop: '2px' }}>{COMPANY.name} &middot; {COMPANY.address} &middot; {COMPANY.phone}</div>
        </div>
      </div>
    </div>
  );
}