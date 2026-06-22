'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Eye, Printer, Mail, MessageCircle, MoreVertical,
  Loader2, AlertCircle, CheckCircle2, Send, X,
  MapPin, Phone, MailIcon, User, Building2,
  Upload, File, Copy, FileText, RotateCcw, Lock,
  Pencil, ChevronRight, MessageSquare,
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
  shortName: 'LS',
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
          width: 2,
          height: 50,
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
        <Skeleton className="h-[600px] w-full rounded-xl" />
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
  const currencyLabel = qt.currency === 'BND' ? 'Brunei Dollar' : (qt.currency || 'BND');
  const barcodeValue = qt.quotationNo || qt.title || '';

  return (
    <div className="p-3 md:p-6 space-y-4 print:p-0">
      {/* ===== TOP ACTION BAR ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => setView('quotations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-5 w-5 text-orange-500" />
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
            <Mail className="h-4 w-4 mr-1.5" /> Send Email
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

      {/* ===== MAIN LAYOUT: Quotation Card + Summary Sidebar ===== */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Main Quotation Content */}
        <div className="flex-1 min-w-0">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border-0">
        <div className="p-4 md:p-8">
          {/* === HEADER: Company Info (Left) + Barcode/QR/Quotation Details (Right) === */}
          <div className="flex flex-col md:flex-row md:justify-between gap-6 mb-8">
            {/* Left: Company Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  {COMPANY.shortName}
                </div>
                <div>
                  <h2 className="font-bold text-sm md:text-base leading-tight">{COMPANY.name}</h2>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1 ml-0 md:ml-15">
                <p className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {COMPANY.address}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {COMPANY.phone}
                </p>
                <p className="flex items-center gap-1.5">
                  <MailIcon className="h-3.5 w-3.5 shrink-0" />
                  {COMPANY.email}
                </p>
                <p className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {COMPANY.website}
                </p>
              </div>
            </div>

            {/* Right: Barcode, QR, Quotation Details */}
            <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
              {/* Barcode */}
              <div className="bg-white p-2">
                <svg ref={barcodeRef} className="h-12" />
              </div>
              {/* QR Code */}
              <div className="w-16 h-16">
                <QRCodeSVG
                  value={`https://smartms.com/quotation/${qt.quotationNo || qt.id}`}
                  size={64}
                  level="M"
                  includeMargin={false}
                />
              </div>
              {/* Quotation Label */}
              <div className="text-center md:text-right">
                <p className="text-emerald-600 font-bold text-lg">QUOTATION</p>
                <p className="font-bold text-sm text-gray-900">{qt.quotationNo || 'N/A'}</p>
              </div>
              {/* Quotation Meta */}
              <div className="text-xs text-gray-500 space-y-1.5 text-right w-full max-w-52">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Quotation Date</span>
                  <span className="font-medium text-gray-700">{fmtDate(qt.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Valid Until</span>
                  <span className="font-medium text-gray-700">{fmtDate(qt.validUntil)}</span>
                </div>
                {qt.referenceNo && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Reference</span>
                    <span className="font-medium text-gray-700">{qt.referenceNo}</span>
                  </div>
                )}
                {qt.projectName && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Project</span>
                    <span className="font-medium text-gray-700">{qt.projectName}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Currency</span>
                  <span className="font-medium text-gray-700">{qt.currency || 'BND'} - {currencyLabel}</span>
                </div>
                {qt.preparedByName && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Prepared By</span>
                    <span className="font-medium text-gray-700">{qt.preparedByName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* === BILL TO === */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Bill To
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="font-bold text-sm text-gray-900 mb-1">
                  {(qt.customer?.companyName || qt.customer?.name || '').toUpperCase()}
                </p>
                {qt.customer?.address && (
                  <p className="text-xs text-gray-500 mb-1.5">{qt.customer.address}</p>
                )}
                <div className="space-y-1">
                  {qt.customer?.phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {qt.customer.phone}
                    </p>
                  )}
                  {qt.customer?.email && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <MailIcon className="h-3 w-3" /> {qt.customer.email}
                    </p>
                  )}
                  {qt.customer?.pic && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <User className="h-3 w-3" /> {qt.customer.pic} (PIC)
                    </p>
                  )}
                </div>
              </div>
              {qt.site && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Site
                  </h3>
                  <p className="text-xs text-gray-700">{qt.site}</p>
                </div>
              )}
            </div>
          </div>

          {/* === LINE ITEMS TABLE === */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-center font-semibold text-gray-700 py-2.5 px-2 w-10">SL</th>
                  <th className="text-left font-semibold text-gray-700 py-2.5 px-2">Item Title</th>
                  <th className="text-center font-semibold text-gray-700 py-2.5 px-2 w-16">Unit</th>
                  <th className="text-center font-semibold text-gray-700 py-2.5 px-2 w-14">Qty</th>
                  <th className="text-right font-semibold text-gray-700 py-2.5 px-2 w-20">Rate ({qt.currency || 'BND'})</th>
                  <th className="text-right font-semibold text-gray-700 py-2.5 px-2 w-24">Amount ({qt.currency || 'BND'})</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                      No line items
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item, i) => (
                    <tr
                      key={item.id || i}
                      className={`border-b border-gray-200 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                    >
                      <td className="text-center py-2.5 px-2 text-gray-600">{i + 1}</td>
                      <td className="py-2.5 px-2">
                        <p className="font-medium text-gray-800 text-xs">{item.title}</p>
                        {item.description && (
                          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.description}</p>
                        )}
                      </td>
                      <td className="text-center py-2.5 px-2 text-gray-600">{item.unit || 'Nos'}</td>
                      <td className="text-center py-2.5 px-2 text-gray-600">{item.quantity}</td>
                      <td className="text-right py-2.5 px-2 text-gray-700">{fmtBND(item.rate)}</td>
                      <td className="text-right py-2.5 px-2 font-medium text-gray-800">{fmtBND(item.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="text-center text-xs text-gray-400 mt-3 italic">Thank you for your business!</p>
          </div>

          <Separator className="mb-6" />

          {/* === BOTTOM SECTIONS: 3 Columns (Terms, Attachments, Notes) === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Terms & Conditions */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Terms & Conditions
              </h3>
              <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
                {terms.map((term, i) => (
                  <li key={i} className="leading-relaxed">{term}</li>
                ))}
              </ol>
            </div>

            {/* Attachments */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Attachments
              </h3>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center mb-3">
                <Upload className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Drag & drop files here or click to browse</p>
                <p className="text-[10px] text-gray-300 mt-0.5">PDF, DOC, XLS, JPG, PNG (Max 10MB)</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Notes
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {qt.notes || 'Thank you for choosing Smart Maintenance Services. We look forward to working with you.'}
              </p>
              <div className="mt-4 flex items-end gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    {qt.preparedByName || '—'}
                  </p>
                  <p className="text-[10px] text-gray-400">Authorised Signature</p>
                </div>
                <div className="w-14 h-14 border-2 border-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-emerald-600 font-bold text-xs">{COMPANY.shortName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === PRINT SUMMARY (inline for print) === */}
        <div className="print:block hidden print:px-8 print:pb-6">
          <QuotationSummaryPrint qt={qt} />
        </div>
      </div>
        </div>{/* End left column */}

        {/* Right: Summary Sidebar (desktop only, sticky) */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-24">
            <QuotationSummaryCard qt={qt} />
          </div>
        </div>
      </div>{/* End layout wrapper */}

      {/* === MOBILE SUMMARY CARD === */}
      <div className="lg:hidden">
        <QuotationSummaryCard qt={qt} />
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

// ============ SUMMARY COMPONENTS ============

function QuotationSummaryCard({ qt }: { qt: QuotationData }) {
  const currency = qt.currency || 'BND';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-700">{currency} {fmtBND(qt.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Discount</span>
            <span className="text-gray-700">{currency} {fmtBND(qt.discount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Tax ({qt.taxRate || 0}%)</span>
            <span className="text-gray-700">{currency} {fmtBND(qt.tax)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Shipping</span>
            <span className="text-gray-700">{currency} {fmtBND(qt.shipping)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Grand Total</span>
            <span className="text-lg font-bold text-emerald-600">{currency} {fmtBND(qt.total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-lg p-3">
        <p className="text-[10px] text-emerald-600 font-medium mb-0.5">Amount In Words</p>
        <p className="text-xs text-emerald-700 italic font-medium">
          {numberToCurrencyWords(qt.total)}
        </p>
      </div>

      {/* Quotation Status Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Current Status</span>
            <Badge variant="outline" className={STATUS_CONFIG[qt.status]?.className || ''}>
              {STATUS_CONFIG[qt.status]?.label || qt.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Created</span>
            <span className="text-gray-700">{fmtDate(qt.createdAt)}</span>
          </div>
          {qt.validUntil && (
            <div className="flex justify-between">
              <span className="text-gray-400">Valid Until</span>
              <span className="text-gray-700">{fmtDate(qt.validUntil)}</span>
            </div>
          )}
          {qt.sentAt && (
            <div className="flex justify-between">
              <span className="text-gray-400">Sent On</span>
              <span className="text-gray-700">{fmtDate(qt.sentAt)}</span>
            </div>
          )}
          {qt.acceptedAt && (
            <div className="flex justify-between">
              <span className="text-gray-400">Accepted On</span>
              <span className="text-gray-700">{fmtDate(qt.acceptedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuotationSummaryPrint({ qt }: { qt: QuotationData }) {
  const currency = qt.currency || 'BND';
  return (
    <div className="flex justify-end">
      <div className="w-72 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{currency} {fmtBND(qt.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>{currency} {fmtBND(qt.discount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax ({qt.taxRate || 0}%)</span><span>{currency} {fmtBND(qt.tax)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{currency} {fmtBND(qt.shipping)}</span></div>
          <Separator />
          <div className="flex justify-between text-base font-bold text-emerald-600"><span>Grand Total</span><span>{currency} {fmtBND(qt.total)}</span></div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2.5 mt-3">
          <p className="text-[10px] text-emerald-600 font-medium">Amount In Words</p>
          <p className="text-xs text-emerald-700 italic">{numberToCurrencyWords(qt.total)}</p>
        </div>
      </div>
    </div>
  );
}