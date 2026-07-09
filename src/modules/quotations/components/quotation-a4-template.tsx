'use client';

import { useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import JsBarcode from 'jsbarcode';
import dynamic from 'next/dynamic';
import { COMPANY, COMPANY_COLORS, DEFAULT_QUOTATION_TERMS } from '@/core/constants/company';
import { numberToCurrencyWords } from '@/core/utils/number-to-words';
import type { QuotationLineItem } from '@/core/types';

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

/** Safely parse JSON string of QuotationLineItem[] */
export function parseLineItems(itemsStr?: string): QuotationLineItem[] {
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
  if (!termsStr) return DEFAULT_QUOTATION_TERMS;
  try {
    const parsed = JSON.parse(termsStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* empty */
  }
  return DEFAULT_QUOTATION_TERMS;
}

// ============ PROPS ============

export interface QuotationA4TemplateProps {
  quotation: {
    id: string;
    quotationNo?: string;
    title: string;
    description?: string;
    referenceNo?: string;
    projectName?: string;
    site?: string;
    preparedByName?: string;
    salesPerson?: string;
    items?: string; // JSON string of QuotationLineItem[]
    terms?: string; // JSON string of string[]
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
  };
  showPageNumbers?: boolean; // default true
  hideInternalNotes?: boolean; // default false (show all)
  className?: string;
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

// ============ COMPONENT ============

export function QuotationA4Template({
  quotation: qt,
  showPageNumbers = true,
  hideInternalNotes = false,
  className,
}: QuotationA4TemplateProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // ---- Derived data ----
  const lineItems = useMemo(() => parseLineItems(qt.items), [qt.items]);
  const terms = useMemo(() => parseTerms(qt.terms), [qt.terms]);
  const currency = qt.currency || 'BND';
  const barcodeValue = qt.quotationNo || qt.title || '';
  const statusLabel = STATUS_LABELS[qt.status] || qt.status;
  const customerName = qt.customer?.companyName || qt.customer?.name || '—';

  // ---- Cost summary computed fields ----
  const materialCost = useMemo(
    () =>
      lineItems
        .filter((i) => i.itemType === 'inventory')
        .reduce((s, i) => s + (i.materialCost || 0), 0),
    [lineItems],
  );
  const labourCost = useMemo(
    () =>
      lineItems
        .filter((i) => i.itemType === 'labour')
        .reduce((s, i) => s + (i.labourCost || 0), 0),
    [lineItems],
  );
  const serviceCost = useMemo(
    () =>
      lineItems
        .filter((i) => i.itemType === 'service')
        .reduce((s, i) => s + (i.amount || 0), 0),
    [lineItems],
  );

  // ---- Barcode effect ----
  useEffect(() => {
    if (barcodeValue && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 1.8,
          height: 45,
          displayValue: false,
          margin: 0,
        });
      } catch {
        /* barcode generation can fail in SSR */
      }
    }
  }, [barcodeValue]);

  // ---- QR Code value ----
  const qrValue = useMemo(
    () => JSON.stringify({ qn: qt.quotationNo || '', customer: customerName, id: qt.id }),
    [qt.quotationNo, customerName, qt.id],
  );

  // ---- Prepared by name ----
  const preparedByName = qt.preparedByName || qt.salesPerson || '—';

  // ---- Conditional display helpers ----
  const showCostBreakdown = materialCost > 0 || labourCost > 0 || serviceCost > 0;

  return (
    <div
      className={`quotation-a4-template ${className || ''}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily:
          "'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
        color: '#1f2937',
        background: '#ffffff',
        fontSize: '11px',
        lineHeight: 1.5,
        position: 'relative',
        padding: '12mm',
        boxSizing: 'border-box',
      }}
    >
      {/* =====================================================
          1. COMPANY HEADER
          ===================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '6mm',
          marginBottom: '6mm',
          borderBottom: `2px solid ${COMPANY_COLORS.primary}`,
          paddingBottom: '5mm',
        }}
      >
        {/* Left: Logo / Initials + Company Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginBottom: '2mm' }}>
            {/* Initials circle */}
            <div
              style={{
                width: '11mm',
                height: '11mm',
                borderRadius: '50%',
                backgroundColor: COMPANY_COLORS.primary,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}
            >
              {COMPANY.shortName}
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '14px',
                  color: '#111827',
                  lineHeight: 1.2,
                  letterSpacing: '0.02em',
                }}
              >
                {COMPANY.name}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '9.5px',
              color: '#4b5563',
              lineHeight: 1.7,
              paddingLeft: '14mm',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2mm' }}>
              <span style={{ color: COMPANY_COLORS.green, flexShrink: 0, marginTop: '1px' }}>&#x25CF;</span>
              <span>{COMPANY.fullAddress}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
              <span style={{ color: COMPANY_COLORS.green, flexShrink: 0 }}>&#x25CF;</span>
              <span>{COMPANY.phone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
              <span style={{ color: COMPANY_COLORS.green, flexShrink: 0 }}>&#x25CF;</span>
              <span>{COMPANY.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
              <span style={{ color: COMPANY_COLORS.green, flexShrink: 0 }}>&#x25CF;</span>
              <span>{COMPANY.website}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
              <span style={{ color: COMPANY_COLORS.green, flexShrink: 0 }}>&#x25CF;</span>
              <span>Reg No: {COMPANY.regNo}</span>
            </div>
          </div>
        </div>

        {/* Right: QUOTATION title + barcode */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2mm',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: COMPANY_COLORS.primary,
              letterSpacing: '0.15em',
            }}
          >
            QUOTATION
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
            {/* Green badge with quotation number */}
            <div
              style={{
                backgroundColor: COMPANY_COLORS.primary,
                color: '#ffffff',
                padding: '1.5mm 4mm',
                borderRadius: '2px',
                fontWeight: 700,
                fontSize: '12px',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}
            >
              {barcodeValue}
            </div>
            {/* Barcode */}
            <div style={{ background: '#ffffff', padding: '0.5mm' }}>
              <svg ref={barcodeRef} style={{ height: '12mm', display: 'block' }} />
            </div>
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'monospace', marginTop: '0.5mm' }}>
            {barcodeValue}
          </div>
        </div>
      </div>

      {/* =====================================================
          2. TITLE (from quotation title/description)
          ===================================================== */}
      {qt.title && (
        <div style={{ marginBottom: '5mm' }}>
          <h2
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#111827',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {qt.title}
          </h2>
          {qt.description && (
            <p style={{ fontSize: '10px', color: '#6b7280', margin: '1mm 0 0 0', lineHeight: 1.5 }}>
              {qt.description}
            </p>
          )}
        </div>
      )}

      {/* =====================================================
          3. THREE-COLUMN INFO SECTION
          ===================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4mm',
          marginBottom: '6mm',
        }}
      >
        {/* Column 1: QUOTATION TO */}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '3px',
            padding: '3mm',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: COMPANY_COLORS.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '2.5mm',
            }}
          >
            QUOTATION TO
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: '12px',
              color: '#111827',
              textTransform: 'uppercase',
              marginBottom: '1.5mm',
              lineHeight: 1.3,
            }}
          >
            {customerName}
          </div>
          {qt.customer?.address && (
            <p style={{ fontSize: '9.5px', color: '#4b5563', margin: '0 0 2mm 0', lineHeight: 1.5 }}>
              {qt.customer.address}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm' }}>
            {qt.customer?.phone && (
              <div style={{ fontSize: '9.5px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                <span style={{ color: COMPANY_COLORS.green, fontSize: '7px' }}>&#x25CF;</span>
                {qt.customer.phone}
              </div>
            )}
            {qt.customer?.email && (
              <div style={{ fontSize: '9.5px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                <span style={{ color: COMPANY_COLORS.green, fontSize: '7px' }}>&#x25CF;</span>
                {qt.customer.email}
              </div>
            )}
            {qt.customer?.pic && (
              <div style={{ fontSize: '9.5px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                <span style={{ color: COMPANY_COLORS.green, fontSize: '7px' }}>&#x25CF;</span>
                {qt.customer.pic} (PIC)
              </div>
            )}
          </div>
        </div>

        {/* Column 2: SITE / DELIVERY TO */}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '3px',
            padding: '3mm',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: COMPANY_COLORS.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '2.5mm',
            }}
          >
            SITE / DELIVERY TO
          </div>
          {qt.site ? (
            <div>
              <p style={{ fontSize: '9.5px', color: '#4b5563', margin: '0 0 2mm 0', lineHeight: 1.5 }}>
                {qt.site}
              </p>
              {qt.customer?.phone && (
                <p style={{ fontSize: '9.5px', color: '#4b5563', margin: '0 0 1mm 0', display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                  <span style={{ color: COMPANY_COLORS.green, fontSize: '7px' }}>&#x25CF;</span>
                  {qt.customer.phone}
                </p>
              )}
              {qt.customer?.pic && (
                <p style={{ fontSize: '9.5px', color: '#4b5563', margin: 0, display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                  <span style={{ color: COMPANY_COLORS.green, fontSize: '7px' }}>&#x25CF;</span>
                  Site Contact: {qt.customer.pic}
                </p>
              )}
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '12px',
                  color: '#111827',
                  textTransform: 'uppercase',
                  marginBottom: '1.5mm',
                  lineHeight: 1.3,
                }}
              >
                {customerName}
              </div>
              {qt.customer?.address && (
                <p style={{ fontSize: '9.5px', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>
                  {qt.customer.address}
                </p>
              )}
            </div>
          )}
          {qt.projectName && (
            <div
              style={{
                marginTop: '3mm',
                paddingTop: '2mm',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <div
                style={{
                  fontSize: '8px',
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                  marginBottom: '0.5mm',
                }}
              >
                Project
              </div>
              <div style={{ fontSize: '10px', color: '#374151', fontWeight: 600 }}>
                {qt.projectName}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: OTHER INFORMATION */}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '3px',
            padding: '3mm',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: COMPANY_COLORS.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '2.5mm',
            }}
          >
            OTHER INFORMATION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8mm', fontSize: '10px' }}>
            {qt.projectName && (
              <InfoRow label="Project Name" value={qt.projectName} />
            )}
            {qt.site && (
              <InfoRow label="Site" value={qt.site} truncate />
            )}
            <InfoRow label="Date" value={fmtDate(qt.createdAt)} />
            <InfoRow label="Valid Until" value={fmtDate(qt.validUntil)} />
            {qt.referenceNo && (
              <InfoRow label="Reference" value={qt.referenceNo} />
            )}
            <InfoRow label="Prepared By" value={preparedByName} />
            <InfoRow label="Tax Rate" value={`${qt.taxRate || 0}%${qt.taxRate === 0 ? ' (Tax Exempt)' : ''}`} />
            {qt.deliveryPeriod && (
              <InfoRow label="Delivery" value={qt.deliveryPeriod} />
            )}
            {qt.warranty && (
              <InfoRow label="Warranty" value={qt.warranty} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2mm' }}>
              <span style={{ color: '#6b7280' }}>Status</span>
              <span
                style={{
                  fontSize: '8px',
                  fontWeight: 600,
                  padding: '0.5mm 2mm',
                  borderRadius: '2px',
                  border: '1px solid',
                  borderColor: COMPANY_COLORS.green,
                  color: COMPANY_COLORS.primary,
                  backgroundColor: COMPANY_COLORS.greenSoft,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          4. LINE ITEMS TABLE
          ===================================================== */}
      <div style={{ marginBottom: '5mm', overflow: 'hidden' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '9.5px',
          }}
        >
          {/* Table Header */}
          <thead>
            <tr
              style={{
                backgroundColor: '#f3f4f6',
                color: '#1f2937',
                borderBottom: '2px solid #d1d5db',
              }}
            >
              <th style={thStyle('center', '8mm')}>No</th>
              <th style={thStyle('left', 'auto')}>Item Description</th>
              <th style={thStyle('center', '12mm')}>Unit</th>
              <th style={thStyle('center', '12mm')}>Qty</th>
              <th style={thStyle('right', '20mm')}>Unit Price</th>
              <th style={thStyle('right', '16mm')}>Discount</th>
              <th style={thStyle('right', '12mm')}>Tax</th>
              <th style={thStyle('right', '22mm')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: 'center',
                    padding: '10mm 0',
                    color: '#9ca3af',
                    fontSize: '11px',
                  }}
                >
                  No line items
                </td>
              </tr>
            ) : (
              lineItems.map((item, i) => (
                <tr
                  key={item.id || i}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: i % 2 === 1 ? '#f9fafb' : '#ffffff',
                    breakInside: 'avoid',
                  }}
                >
                  <td style={tdStyle('center')}>{i + 1}</td>
                  <td style={{ ...tdStyle('left'), padding: '2.5mm 3mm', minWidth: '35mm' }}>
                    {item.title && (
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '9.5px', marginBottom: '0.5mm' }}>
                        {item.title}
                      </div>
                    )}
                    {item.description && (
                      <div style={{ color: '#6b7280', fontSize: '8.5px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {item.description}
                      </div>
                    )}
                    {!item.title && !item.description && (
                      <span style={{ color: '#9ca3af' }}>{'—'}</span>
                    )}
                  </td>
                  <td style={tdStyle('center')}>{item.unit || 'Nos'}</td>
                  <td style={tdStyle('center')}>{item.quantity}</td>
                  <td style={tdStyle('right')}>{fmtBND(item.rate)}</td>
                  <td style={tdStyle('right')}>
                    {item.discount && item.discount > 0 ? fmtBND(item.discount) : '—'}
                  </td>
                  <td style={tdStyle('right')}>
                    {item.tax && item.tax > 0 ? fmtBND(item.tax) : '—'}
                  </td>
                  <td style={{ ...tdStyle('right'), fontWeight: 700, color: '#111827' }}>
                    {fmtBND(item.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          5. COST SUMMARY (Right-aligned panel)
          ===================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '6mm',
          breakInside: 'avoid',
        }}
      >
        <div
          style={{
            width: '72mm',
            border: '1px solid #e5e7eb',
            borderRadius: '3px',
            padding: '3mm',
            backgroundColor: '#f0fdf4',
          }}
        >
          {/* Cost Breakdown (when available) */}
          {showCostBreakdown && (
            <div style={{ marginBottom: '2mm', borderBottom: '1px dashed #d1d5db', paddingBottom: '2mm' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: COMPANY_COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5mm' }}>
                Cost Breakdown
              </div>
              {materialCost > 0 && (
                <SummaryRow label="Material Cost" value={`${currency} ${fmtBND(materialCost)}`} />
              )}
              {labourCost > 0 && (
                <SummaryRow label="Labour Cost" value={`${currency} ${fmtBND(labourCost)}`} />
              )}
              {serviceCost > 0 && (
                <SummaryRow label="Service Cost" value={`${currency} ${fmtBND(serviceCost)}`} />
              )}
            </div>
          )}

          <SummaryRow label="Subtotal" value={`${currency} ${fmtBND(qt.subtotal)}`} />
          {qt.discount > 0 && (
            <SummaryRow label="Discount" value={`${currency} ${fmtBND(qt.discount)}`} />
          )}
          <SummaryRow label={`Tax (${qt.taxRate || 0}%)`} value={`${currency} ${fmtBND(qt.tax)}`} />
          {qt.shipping > 0 && (
            <SummaryRow label="Shipping" value={`${currency} ${fmtBND(qt.shipping)}`} />
          )}

          {/* Grand Total */}
          <div
            style={{
              borderTop: '2px solid #374151',
              marginTop: '2mm',
              paddingTop: '2mm',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>GRAND TOTAL</span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: COMPANY_COLORS.primary,
              }}
            >
              {currency} {fmtBND(qt.total)}
            </span>
          </div>

          {/* Amount in words */}
          <div
            style={{
              marginTop: '2mm',
              padding: '2mm',
              backgroundColor: '#ecfdf5',
              border: `1px solid ${COMPANY_COLORS.green}40`,
              borderRadius: '2px',
            }}
          >
            <div
              style={{
                fontSize: '7.5px',
                fontWeight: 700,
                color: COMPANY_COLORS.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.5mm',
              }}
            >
              Amount In Words
            </div>
            <div style={{ fontSize: '9.5px', color: '#111827', fontWeight: 600, lineHeight: 1.5 }}>
              {numberToCurrencyWords(qt.total)}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          6. TERMS & CONDITIONS
          ===================================================== */}
      <div style={{ marginBottom: '6mm', breakInside: 'avoid' }}>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 800,
            color: COMPANY_COLORS.primary,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '2.5mm',
            display: 'flex',
            alignItems: 'center',
            gap: '2mm',
          }}
        >
          <span style={{
            display: 'inline-block',
            width: '3mm',
            height: '0.4mm',
            backgroundColor: COMPANY_COLORS.green,
            borderRadius: '1px',
          }} />
          {'TERMS & CONDITIONS'}
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: '5mm',
            fontSize: '9.5px',
            color: '#4b5563',
            lineHeight: 1.7,
          }}
        >
          {terms.map((term, i) => (
            <li key={i} style={{ marginBottom: '0.5mm' }}>
              {term}
            </li>
          ))}
        </ol>
      </div>

      {/* =====================================================
          7. SIGNATURE SECTION (4-column grid)
          ===================================================== */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '5mm',
          marginBottom: '5mm',
          breakInside: 'avoid',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '5mm',
          }}
        >
          {/* Column 1: Notes */}
          <div>
            <SignatureHeading>Notes</SignatureHeading>
            <div
              style={{
                height: '8mm',
                marginBottom: '1mm',
              }}
            />
            <p
              style={{
                fontSize: '8.5px',
                color: '#6b7280',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {qt.notes || `Thank you for considering ${COMPANY.name}. We look forward to working with you.`}
            </p>
          </div>

          {/* Column 2: Prepared By */}
          <div>
            <SignatureHeading>Prepared By</SignatureHeading>
            <div
              style={{
                height: '10mm',
                borderBottom: '1px solid #374151',
                marginBottom: '1mm',
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: '0.5mm',
              }}
            >
              <span style={{ fontSize: '10px', fontStyle: 'italic', color: '#9ca3af' }}>
                {preparedByName !== '—' ? preparedByName : ''}
              </span>
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#111827' }}>
              {preparedByName}
            </div>
            <div style={{ fontSize: '8.5px', color: '#6b7280' }}>Sales Executive</div>
            <div style={{ fontSize: '8.5px', color: '#9ca3af', marginTop: '0.5mm' }}>
              Date: {fmtDate(qt.createdAt)}
            </div>
          </div>

          {/* Column 3: Approved By */}
          <div>
            <SignatureHeading>Approved By</SignatureHeading>
            <div
              style={{
                height: '10mm',
                borderBottom: '1px solid #374151',
                marginBottom: '1mm',
              }}
            />
            <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#111827' }}>{'—'}</div>
            <div style={{ fontSize: '8.5px', color: '#6b7280' }}>Authorized Signatory</div>
            <div style={{ fontSize: '8.5px', color: '#9ca3af', marginTop: '0.5mm' }}>Date: {'—'}</div>
          </div>

          {/* Column 4: Customer Acceptance */}
          <div>
            <SignatureHeading>Customer Acceptance</SignatureHeading>
            <div
              style={{
                height: '10mm',
                borderBottom: '1px solid #374151',
                marginBottom: '1mm',
              }}
            />
            <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#111827' }}>{'—'}</div>
            <div style={{ fontSize: '8.5px', color: '#6b7280' }}>Customer Signature</div>
            <div style={{ fontSize: '8.5px', color: '#9ca3af', marginTop: '0.5mm' }}>Date: {'—'}</div>
          </div>
        </div>
      </div>

      {/* =====================================================
          8. QR CODE SECTION
          ===================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          gap: '3mm',
          marginBottom: '4mm',
          breakInside: 'avoid',
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              width: '20mm',
              height: '20mm',
              display: 'inline-block',
            }}
          >
            <QRCodeSVG
              value={qrValue}
              size={80}
              level="M"
              includeMargin={false}
            />
          </div>
          <div
            style={{
              fontSize: '6.5px',
              color: '#9ca3af',
              marginTop: '1mm',
              maxWidth: '25mm',
              marginLeft: 'auto',
              lineHeight: 1.4,
            }}
          >
            Scan this QR code to verify this quotation.
          </div>
        </div>
      </div>

      {/* =====================================================
          9. FOOTER
          ===================================================== */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '3mm',
          textAlign: 'center',
        }}
      >
        {showPageNumbers && (
          <div style={{ fontSize: '8px', color: '#9ca3af', marginBottom: '1mm' }}>
            Page 1 of 1
          </div>
        )}
        <div style={{ fontSize: '8px', color: '#6b7280' }}>
          <span style={{ fontWeight: 600 }}>{COMPANY.name}</span>
          {' '}&middot;{' '}
          Generated: {fmtDate(qt.createdAt)}{' '}
          {new Date(qt.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div
          style={{
            fontSize: '7px',
            color: '#9ca3af',
            marginTop: '0.5mm',
            fontStyle: 'italic',
          }}
        >
          This is a computer-generated quotation and is valid without a signature.{' '}
          {!hideInternalNotes && 'CONFIDENTIAL - For the intended recipient only.'}
        </div>

        {/* Thank you */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: COMPANY_COLORS.primary,
            letterSpacing: '0.2em',
            marginTop: '3mm',
          }}
        >
          THANK YOU!
        </div>
      </div>

      {/* =====================================================
          PRINT STYLES
          ===================================================== */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .quotation-a4-template { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}} />
    </div>
  );
}

// ============ INLINE SUB-COMPONENTS ============

/** Key-value row in the "Other Information" column */
function InfoRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2mm' }}>
      <span style={{ color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          color: '#1f2937',
          textAlign: 'right',
          maxWidth: truncate ? '55%' : '70%',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Row in the cost summary panel */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1mm',
        fontSize: '10px',
      }}
    >
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#1f2937', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/** Section heading in the signature area */
function SignatureHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '8px',
        fontWeight: 800,
        color: COMPANY_COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '2mm',
      }}
    >
      {children}
    </div>
  );
}

// ============ TABLE CELL STYLES ============

function thStyle(align: 'left' | 'center' | 'right', width?: string): React.CSSProperties {
  return {
    textAlign: align,
    fontWeight: 700,
    fontSize: '8.5px',
    padding: '2mm 2.5mm',
    width: width || undefined,
    whiteSpace: 'nowrap' as const,
  };
}

function tdStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '2.5mm 2.5mm',
    color: '#374151',
    verticalAlign: 'top' as const,
  };
}