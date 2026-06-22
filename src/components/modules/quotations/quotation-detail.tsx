'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Printer, Mail, MessageCircle, MoreVertical,
  Loader2, AlertCircle, CheckCircle2, Send, X,
  MapPin, Phone, MailIcon, User, Calendar, Hash, Building2, Landmark,
  Copy, FileText, RotateCcw, Pencil,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAppStore, useAuthStore, hasMinRole } from '@/store';
import type { QuotationLineItem, QuotationStatus } from '@/types';
import { numberToCurrencyWords } from '@/lib/number-to-words';
import { format } from 'date-fns';
import JsBarcode from 'jsbarcode';
import dynamic from 'next/dynamic';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

// ============ CONSTANTS ============

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  REVIEW: { label: 'In Review', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  APPROVED: { label: 'Approved', className: 'bg-teal-100 text-teal-800 border-teal-300' },
  SENT: { label: 'Sent', className: 'bg-sky-100 text-sky-800 border-sky-300' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-100 text-rose-700 border-rose-300' },
  EXPIRED: { label: 'Expired', className: 'bg-gray-100 text-gray-600 border-gray-300' },
  CONVERTED_WO: { label: 'Converted to WO', className: 'bg-purple-100 text-purple-800 border-purple-300' },
  CONVERTED_INVOICE: { label: 'Converted to Invoice', className: 'bg-violet-100 text-violet-800 border-violet-300' },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  CLOSED: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-300' },
};

const WORKFLOW_TRANSITIONS: Record<string, { label: string; target: string; icon: React.ReactNode; color: string }[]> = {
  DRAFT: [
    { label: 'Submit for Review', target: 'REVIEW', icon: <Send className="h-4 w-4" />, color: 'text-amber-700 hover:bg-amber-50' },
  ],
  REVIEW: [
    { label: 'Approve', target: 'APPROVED', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-700 hover:bg-emerald-50' },
    { label: 'Send Back to Draft', target: 'DRAFT', icon: <RotateCcw className="h-4 w-4" />, color: 'text-gray-700 hover:bg-gray-50' },
  ],
  APPROVED: [
    { label: 'Send to Customer', target: 'SENT', icon: <Send className="h-4 w-4" />, color: 'text-sky-700 hover:bg-sky-50' },
  ],
  SENT: [
    { label: 'Mark as Accepted', target: 'ACCEPTED', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-700 hover:bg-emerald-50' },
    { label: 'Mark as Rejected', target: 'REJECTED', icon: <X className="h-4 w-4" />, color: 'text-rose-700 hover:bg-rose-50' },
  ],
  ACCEPTED: [
    { label: 'Convert to Work Order', target: 'CONVERTED_WO', icon: <FileText className="h-4 w-4" />, color: 'text-purple-700 hover:bg-purple-50' },
    { label: 'Convert to Invoice', target: 'CONVERTED_INVOICE', icon: <FileText className="h-4 w-4" />, color: 'text-violet-700 hover:bg-violet-50' },
  ],
};

const DEFAULT_TERMS = [
  '50% advance payment and balance upon completion.',
  'Price validity: 60 days from the quotation date.',
  'Delivery period: 3 working days.',
  'Additional works are subject to variation order.',
  'Warranty applies only to workmanship.',
  'Material warranty follows manufacturer terms.',
  'Payment by bank transfer or cheque.',
];

const COMPANY = {
  name: 'SMART MAINTENANCE SERVICES SDN BHD',
  shortName: 'S',
  address: 'No. 25, Spg 88, Jln Gadong BE1318, Bandar Seri Begawan, Brunei Darussalam',
  phone: '+673 245 6789',
  email: 'info@smartms.com',
  website: 'www.smartms.com',
  regNo: 'BE1318',
};

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

function fmtBND(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  return format(new Date(d), 'dd/MM/yyyy');
}

function parseLineItems(itemsStr?: string): QuotationLineItem[] {
  if (!itemsStr) return [];
  try {
    const parsed = JSON.parse(itemsStr);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* empty */ }
  return [];
}

function parseTerms(termsStr?: string): string[] {
  if (!termsStr) return DEFAULT_TERMS;
  try {
    const parsed = JSON.parse(termsStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* empty */ }
  return DEFAULT_TERMS;
}

// ============ COMPONENT ============

interface QuotationCustomer {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  companyName?: string;
  pic?: string;
}

interface QuotationData {
  id: string;
  tenantId: string;
  customerId: string;
  customer: QuotationCustomer;
  quotationNo?: string;
  title: string;
  description?: string;
  referenceNo?: string;
  projectName?: string;
  site?: string;
  preparedBy?: string;
  preparedByName?: string;
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
  validUntil?: string;
  approvedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function QuotationDetail({ quotationId }: { quotationId?: string }) {
  const { viewParams, setView } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const id = quotationId || viewParams.id;
  const [qt, setQt] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [terms, setTerms] = useState<string[]>(DEFAULT_TERMS);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const barcodeRef = useRef<SVGSVGElement>(null);

  const fetchQt = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setQt(json);
      setLineItems(parseLineItems(json.items));
      setTerms(parseTerms(json.terms));
    } catch {
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchQt(); }, [fetchQt]);

  // Generate barcode
  useEffect(() => {
    const barcodeValue = qt?.quotationNo || qt?.title || '';
    if (barcodeValue && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 1.8,
          height: 45,
          displayValue: false,
          margin: 0,
        });
      } catch { /* barcode generation can fail in SSR */ }
    }
  }, [qt?.quotationNo, qt?.title]);

  const updateStatus = async (status: string, extra?: Record<string, unknown>) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Quotation ${status.toLowerCase().replace(/_/g, ' ')}`);
      fetchQt();
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    await updateStatus('REJECTED', { reason: rejectReason });
    setShowRejectDialog(false);
    setRejectReason('');
  };

  const handleCopyNumber = () => {
    if (qt?.quotationNo) {
      navigator.clipboard.writeText(qt.quotationNo);
      toast.success('Quotation number copied');
    }
  };

  const handlePrint = () => window.print();

  const handleSendEmail = () => {
    if (!qt) return;
    const subject = encodeURIComponent(`Quotation ${qt.quotationNo || 'N/A'} - ${COMPANY.name}`);
    const body = encodeURIComponent(
      `Dear ${qt.customer?.name || 'Customer'},\n\nPlease find attached quotation for ${qt.title}.\n\nTotal Amount: ${qt.currency || 'BND'} ${fmtBND(qt.total)}\nValid Until: ${fmtDate(qt.validUntil)}\n\nThank you for your interest.\n\nBest regards,\n${COMPANY.name}\n${COMPANY.phone}`
    );
    window.open(`mailto:${qt.customer?.email || ''}?subject=${subject}&body=${body}`);
  };

  const handleSendWhatsApp = () => {
    if (!qt) return;
    const msg = encodeURIComponent(
      `Dear ${qt.customer?.name},\n\nQuotation *${qt.quotationNo || 'N/A'}*\nAmount: *${qt.currency || 'BND'} ${fmtBND(qt.total)}*\nValid Until: ${fmtDate(qt.validUntil)}\n\nPlease review and let us know if you have any questions.\n\n- ${COMPANY.name}`
    );
    const phone = (qt.customer?.phone || '').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const canManage = user ? hasMinRole(user.role, 'admin') : false;
  const transitions = qt ? (WORKFLOW_TRANSITIONS[qt.status] || []) : [];

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[800px] w-full rounded-xl" />
      </div>
    );
  }

  if (!qt) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-lg">Quotation not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setView('quotations')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quotations
        </Button>
      </div>
    );
  }

  const statusStyle = STATUS_CONFIG[qt.status] || STATUS_CONFIG.DRAFT;
  const currency = qt.currency || 'BND';
  const currencyLabel = currency === 'BND' ? 'Brunei Dollar' : currency;
  const barcodeValue = qt.quotationNo || qt.title || '';

  return (
    <div className="print:p-0">
      {/* ===== TOP ACTION BAR (hidden on print) ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-6 pb-0 md:pb-0 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => setView('quotations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg md:text-xl font-bold truncate">
              Quotation {qt.quotationNo || 'N/A'}
            </h1>
            <Badge variant="outline" className={statusStyle.className}>
              {statusStyle.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Workflow Action Buttons */}
          {canManage && transitions.map((t) => (
            <Button
              key={t.target}
              variant="outline"
              size="sm"
              className={t.color}
              disabled={actionLoading}
              onClick={() => {
                if (t.target === 'REJECTED') {
                  setShowRejectDialog(true);
                } else {
                  updateStatus(t.target);
                }
              }}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : t.icon}
              <span className="ml-1.5">{t.label}</span>
            </Button>
          ))}

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendEmail}>
            <Mail className="h-4 w-4 mr-1.5" /> Email
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-1.5 text-green-600" /> WhatsApp
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyNumber}>
                <Copy className="h-4 w-4 mr-2" /> Copy Quotation No.
              </DropdownMenuItem>
              {canManage && qt.status === 'DRAFT' && (
                <DropdownMenuItem onClick={() => setView('quotation-edit', { id: qt.id })}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit Quotation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===== QUOTATION DOCUMENT (A4 Layout) ===== */}
      <div className="flex justify-center p-3 md:p-6 print:p-0">
        <div className="invoice-document bg-white border border-gray-200 rounded-xl shadow-sm print:shadow-none print:rounded-none print:border-0 w-full" style={{ maxWidth: '210mm' }}>
          <div className="p-5 md:p-8 print:p-6">

            {/* ====== ROW 1: Company Header (Left) + QUOTATION Title & Barcode (Right) ====== */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
              {/* Left: Company Logo & Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm">
                    {COMPANY.shortName}
                  </div>
                  <div>
                    <h2 className="font-bold text-sm md:text-[15px] leading-tight text-gray-900">{COMPANY.name}</h2>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 space-y-1 ml-0 sm:ml-14">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                    {COMPANY.address}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                    {COMPANY.phone}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MailIcon className="h-3 w-3 shrink-0 text-gray-400" />
                    {COMPANY.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 shrink-0 text-gray-400" />
                    {COMPANY.website}
                  </p>
                </div>
              </div>

              {/* Right: QUOTATION Label + Green Bar with Number + Barcode */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-emerald-600 font-bold text-xl tracking-wide">QUOTATION</p>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 rounded-md px-4 py-1.5">
                    <span className="text-white font-bold text-sm tracking-wide">{barcodeValue}</span>
                  </div>
                  <div className="bg-white p-1">
                    <svg ref={barcodeRef} className="h-11" />
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700 font-mono">{barcodeValue}</p>
              </div>
            </div>

            {/* ====== ROW 2: Quotation Details (Left) + Project / Site Info (Right) ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Left: Quotation Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Quotation Details
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-gray-400" /> Quotation Date
                    </span>
                    <span className="font-medium text-gray-800">{fmtDate(qt.createdAt)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-gray-400" /> Valid Until
                    </span>
                    <span className="font-medium text-gray-800">{fmtDate(qt.validUntil)}</span>
                  </div>
                  {qt.referenceNo && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-gray-400" /> Reference
                      </span>
                      <span className="font-medium text-gray-800">{qt.referenceNo}</span>
                    </div>
                  )}
                  {qt.projectName && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-gray-400" /> Project
                      </span>
                      <span className="font-medium text-gray-800">{qt.projectName}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Landmark className="h-3 w-3 text-gray-400" /> Currency
                    </span>
                    <span className="font-medium text-gray-800">{currency} - {currencyLabel}</span>
                  </div>
                  {qt.preparedByName && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-gray-400" /> Prepared By
                      </span>
                      <span className="font-medium text-gray-800">{qt.preparedByName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Status & Timeline */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Status & Timeline
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Current Status</span>
                    <Badge variant="outline" className={STATUS_CONFIG[qt.status]?.className || ''}>
                      {STATUS_CONFIG[qt.status]?.label || qt.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium text-gray-800">{fmtDate(qt.createdAt)}</span>
                  </div>
                  {qt.validUntil && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Valid Until</span>
                      <span className="font-medium text-gray-800">{fmtDate(qt.validUntil)}</span>
                    </div>
                  )}
                  {qt.sentAt && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Sent On</span>
                      <span className="font-medium text-gray-800">{fmtDate(qt.sentAt)}</span>
                    </div>
                  )}
                  {qt.acceptedAt && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Accepted On</span>
                      <span className="font-medium text-gray-800">{fmtDate(qt.acceptedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ====== ROW 3: Bill To (Left) + Site (Right) ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Bill To */}
              <div className="bg-blue-50/40 rounded-lg p-4 border border-blue-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  Bill To
                </h3>
                <p className="font-bold text-sm text-gray-900 mb-1">
                  {(qt.customer?.companyName || qt.customer?.name || '').toUpperCase()}
                </p>
                {qt.customer?.address && (
                  <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{qt.customer.address}</p>
                )}
                <div className="space-y-1">
                  {qt.customer?.phone && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-gray-400" /> {qt.customer.phone}
                    </p>
                  )}
                  {qt.customer?.email && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <MailIcon className="h-3 w-3 text-gray-400" /> {qt.customer.email}
                    </p>
                  )}
                  {qt.customer?.pic && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <User className="h-3 w-3 text-gray-400" /> {qt.customer.pic} (PIC)
                    </p>
                  )}
                </div>
              </div>

              {/* Site Info */}
              <div className="bg-blue-50/40 rounded-lg p-4 border border-blue-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  Site / Ship To
                </h3>
                {qt.site ? (
                  <p className="text-[11px] text-gray-700 leading-relaxed">{qt.site}</p>
                ) : (
                  <>
                    <p className="font-bold text-sm text-gray-900 mb-1">
                      {(qt.customer?.companyName || qt.customer?.name || '').toUpperCase()}
                    </p>
                    {qt.customer?.address && (
                      <p className="text-[11px] text-gray-500 leading-relaxed">{qt.customer.address}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ====== ROW 4: Line Items Table + Summary (side by side on desktop) ====== */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Table */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-emerald-600 text-white">
                        <th className="text-center font-semibold py-2.5 px-2 w-10 rounded-tl-md">SL</th>
                        <th className="text-left font-semibold py-2.5 px-2">Item Title</th>
                        <th className="text-left font-semibold py-2.5 px-2">Description</th>
                        <th className="text-center font-semibold py-2.5 px-2 w-14">Unit</th>
                        <th className="text-center font-semibold py-2.5 px-2 w-12">Qty</th>
                        <th className="text-right font-semibold py-2.5 px-2 w-22">Rate ({currency})</th>
                        <th className="text-right font-semibold py-2.5 px-2 w-24 rounded-tr-md">Amount ({currency})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                            No line items
                          </td>
                        </tr>
                      ) : (
                        lineItems.map((item, i) => (
                          <tr
                            key={item.id || i}
                            className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-emerald-50/30 transition-colors`}
                          >
                            <td className="text-center py-3 px-2 text-gray-600 font-medium">{i + 1}</td>
                            <td className="py-3 px-2">
                              <p className="font-semibold text-gray-800 text-xs">{item.title}</p>
                            </td>
                            <td className="py-3 px-2">
                              <p className="text-gray-500 text-[11px] leading-relaxed">{item.description || '—'}</p>
                            </td>
                            <td className="text-center py-3 px-2 text-gray-600">{item.unit || 'Nos'}</td>
                            <td className="text-center py-3 px-2 text-gray-600">{item.quantity}</td>
                            <td className="text-right py-3 px-2 text-gray-700">{fmtBND(item.rate)}</td>
                            <td className="text-right py-3 px-2 font-semibold text-gray-800">{fmtBND(item.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Panel (right side, inline) */}
                <div className="lg:w-72 shrink-0">
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(qt.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(qt.discount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Tax ({qt.taxRate || 0}%)</span>
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(qt.tax)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Shipping</span>
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(qt.shipping)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900">GRAND TOTAL</span>
                        <span className="text-lg font-bold text-emerald-600">{currency} {fmtBND(qt.total)}</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-md p-2.5 mt-1 border border-emerald-100">
                      <p className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mb-0.5">Amount In Words</p>
                      <p className="text-[11px] text-emerald-800 italic font-medium leading-relaxed">
                        {numberToCurrencyWords(qt.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ====== ROW 5: Terms & Conditions ====== */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                Terms & Conditions
              </h3>
              <ol className="text-[11px] text-gray-500 space-y-1.5 list-decimal list-inside leading-relaxed">
                {terms.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ol>
            </div>

            {/* ====== ROW 6: Footer — Signature, Stamp, Notes, QR, Thank You ====== */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                {/* Left: Authorised Signature + Stamp */}
                <div className="flex items-end gap-5">
                  <div>
                    <p className="text-xs font-medium text-gray-800 mb-1">
                      {qt.preparedByName || '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 mb-2">Authorised Signature</p>
                    <p className="text-[10px] text-gray-400">Managing Director</p>
                    <div className="w-40 border-b border-gray-300 mt-1" />
                  </div>
                  {/* Company Stamp */}
                  <div className="w-16 h-16 border-2 border-emerald-600 rounded-full flex items-center justify-center shrink-0 opacity-80">
                    <div className="text-center">
                      <span className="text-emerald-600 font-bold text-base leading-none block">{COMPANY.shortName}</span>
                      <span className="text-emerald-600 text-[7px] leading-none block mt-0.5">{COMPANY.regNo}</span>
                    </div>
                  </div>
                </div>

                {/* Center: Notes */}
                <div className="text-xs text-gray-500 max-w-xs">
                  <p className="font-medium text-gray-600 mb-1">Notes</p>
                  <p className="text-[11px] leading-relaxed">
                    {qt.notes || 'Thank you for choosing Smart Maintenance Services. We look forward to working with you.'}
                  </p>
                </div>

                {/* Right: QR Code + Thank You */}
                <div className="flex items-end gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto">
                      <QRCodeSVG
                        value={`https://smartms.com/quotation/${qt.quotationNo || qt.id}`}
                        size={64}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-[8px] text-gray-400 mt-1">Scan to Verify</p>
                  </div>
                  <div>
                    <p className="text-emerald-600 font-semibold text-lg italic">Thank You!</p>
                    <div className="text-[10px] text-gray-400 space-y-0.5 mt-1">
                      <p className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {COMPANY.phone}</p>
                      <p className="flex items-center gap-1"><MailIcon className="h-2.5 w-2.5" /> {COMPANY.email}</p>
                      <p className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5" /> {COMPANY.website}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page indicator */}
              <div className="text-center mt-6">
                <p className="text-[10px] text-gray-300">Page 1 of 1</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ===== REJECT DIALOG ===== */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this quotation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reject Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}