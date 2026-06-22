'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Eye, Printer, Mail, MessageCircle, MoreVertical,
  CreditCard, Download, FileText, Banknote, X,
  MapPin, Phone, MailIcon, User, Calendar, Hash, Building2,
  Upload, File, Loader2, AlertCircle, CheckCircle2, Send,
  Stamp,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAppStore, useAuthStore, hasMinRole } from '@/store';
import type { InvoiceItem, InvoiceLineItem } from '@/types';
import { numberToCurrencyWords } from '@/lib/number-to-words';
import { format } from 'date-fns';
import JsBarcode from 'jsbarcode';
import dynamic from 'next/dynamic';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

// ============ CONSTANTS ============

const DEFAULT_TERMS = [
  '50% advance payment and balance upon completion.',
  'Price validity: 60 days from the invoice date.',
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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  APPROVED: { label: 'Approved', className: 'bg-teal-100 text-teal-800 border-teal-300' },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-300' },
  OVERDUE: { label: 'Overdue', className: 'bg-rose-100 text-rose-800 border-rose-300' },
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

function parseLineItems(itemsStr?: string): InvoiceLineItem[] {
  if (!itemsStr) return [];
  try {
    const parsed = JSON.parse(itemsStr);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* empty */ }
  // Legacy format: [{description, amount}]
  try {
    const legacy = JSON.parse(itemsStr);
    if (Array.isArray(legacy)) {
      return legacy.map((item: { description?: string; amount?: number }, i: number) => ({
        title: item.description || `Item ${i + 1}`,
        description: '',
        unit: 'Nos',
        quantity: 1,
        rate: item.amount || 0,
        amount: item.amount || 0,
      }));
    }
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

export function InvoiceDetail() {
  const { viewParams, setView } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const id = viewParams.id;
  const [inv, setInv] = useState<InvoiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [terms, setTerms] = useState<string[]>(DEFAULT_TERMS);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ method: 'Bank Transfer', ref: '', transactionId: '' });
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const barcodeRef = useRef<SVGSVGElement>(null);

  const fetchInv = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setInv(json);
      setLineItems(parseLineItems(json.items));
      setTerms(parseTerms(json.terms));
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInv(); }, [fetchInv]);

  // Generate barcode
  useEffect(() => {
    if (inv?.invoiceNumber && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, inv.invoiceNumber, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
        });
      } catch { /* barcode generation can fail in SSR */ }
    }
  }, [inv?.invoiceNumber]);

  const updateStatus = async (status: string, extra?: Record<string, unknown>) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Invoice ${status.toLowerCase()}`);
      fetchInv();
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.method) {
      toast.error('Please select a payment method');
      return;
    }
    await updateStatus('PAID', {
      paymentMethod: paymentForm.method,
      paymentRef: paymentForm.ref,
      transactionId: paymentForm.transactionId,
    });
    setShowPaymentDialog(false);
    setPaymentForm({ method: 'Bank Transfer', ref: '', transactionId: '' });
  };

  const handleCancel = async () => {
    await updateStatus('CANCELLED');
    setShowCancelDialog(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    if (!inv) return;
    const subject = encodeURIComponent(`Invoice ${inv.invoiceNumber} - ${COMPANY.name}`);
    const body = encodeURIComponent(
      `Dear ${inv.customerName},\n\nPlease find attached invoice ${inv.invoiceNumber} for ${inv.title}.\n\nTotal Amount: BND ${fmtBND(inv.total)}\nDue Date: ${fmtDate(inv.dueDate)}\n\nThank you for your business.\n\nBest regards,\n${COMPANY.name}\n${COMPANY.phone}\n${COMPANY.email}`
    );
    window.open(`mailto:${inv.customerEmail || ''}?subject=${subject}&body=${body}`);
  };

  const handleSendWhatsApp = () => {
    if (!inv) return;
    const msg = encodeURIComponent(
      `Dear ${inv.customerName},\n\nInvoice *${inv.invoiceNumber}*\nAmount: *BND ${fmtBND(inv.total)}*\nDue: ${fmtDate(inv.dueDate)}\n\nPlease find the invoice attached. Thank you for your business.\n\n- ${COMPANY.name}`
    );
    const phone = (inv.customerPhone || '').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const isAdmin = user ? hasMinRole(user.role, 'admin') : false;
  const isFinance = user?.role === 'finance';
  const canManage = isAdmin || isFinance;

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-lg">Invoice not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setView('invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Invoices
        </Button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.DRAFT;
  const currencyLabel = inv.currency === 'BND' ? 'Brunei Dollar' : (inv.currency || 'BND');

  return (
    <div className="p-3 md:p-6 space-y-4 print:p-0">
      {/* ===== TOP ACTION BAR ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => setView('invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-5 w-5 text-orange-500" />
            <h1 className="text-lg md:text-xl font-bold truncate">
              Invoice {inv.invoiceNumber}
            </h1>
            <Badge variant="outline" className={statusStyle.className}>
              {statusStyle.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
              <DropdownMenuItem onClick={() => toast.info('PDF download coming soon')}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </DropdownMenuItem>
              {canManage && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                <>
                  <DropdownMenuItem onClick={() => setShowPaymentDialog(true)} className="text-emerald-700">
                    <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCancelDialog(true)} className="text-red-600">
                    <X className="h-4 w-4 mr-2" /> Cancel Invoice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===== MAIN LAYOUT: Invoice Card + Summary Sidebar ===== */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Main Invoice Content */}
        <div className="flex-1 min-w-0">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border-0">
        <div className="p-4 md:p-8">
          {/* === HEADER: Company Info (Left) + Barcode/QR/Invoice Details (Right) === */}
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

            {/* Right: Barcode, QR, Invoice Details */}
            <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
              {/* Barcode */}
              <div className="bg-white p-2">
                <svg ref={barcodeRef} className="h-12" />
              </div>
              {/* QR Code */}
              <div className="w-16 h-16">
                <QRCodeSVG
                  value={`https://smartms.com/invoice/${inv.invoiceNumber}`}
                  size={64}
                  level="M"
                  includeMargin={false}
                />
              </div>
              {/* Invoice Label */}
              <div className="text-center md:text-right">
                <p className="text-emerald-600 font-bold text-lg">INVOICE</p>
                <p className="font-bold text-sm text-gray-900">{inv.invoiceNumber}</p>
              </div>
              {/* Invoice Meta */}
              <div className="text-xs text-gray-500 space-y-1.5 text-right w-full max-w-52">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Invoice Date</span>
                  <span className="font-medium text-gray-700">{fmtDate(inv.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Due Date</span>
                  <span className="font-medium text-gray-700">{fmtDate(inv.dueDate)}</span>
                </div>
                {inv.referenceNo && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Reference</span>
                    <span className="font-medium text-gray-700">{inv.referenceNo}</span>
                  </div>
                )}
                {inv.poReference && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">PO/Ref No.</span>
                    <span className="font-medium text-gray-700">{inv.poReference}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Payment Terms</span>
                  <span className="font-medium text-gray-700">{inv.paymentTerms || '30 Days'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Currency</span>
                  <span className="font-medium text-gray-700">{inv.currency || 'BND'} - {currencyLabel}</span>
                </div>
                {(inv.preparedByName || inv.creatorName) && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Prepared By</span>
                    <span className="font-medium text-gray-700">{inv.preparedByName || inv.creatorName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* === BILL TO / SHIP TO === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Bill To */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Bill To
              </h3>
              <p className="font-bold text-sm text-gray-900 mb-1">
                {(inv.customerCompany || inv.customerName || '').toUpperCase()}
              </p>
              {inv.customerAddress && (
                <p className="text-xs text-gray-500 mb-1.5">{inv.customerAddress}</p>
              )}
              <div className="space-y-1">
                {inv.customerPhone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {inv.customerPhone}
                  </p>
                )}
                {inv.customerEmail && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <MailIcon className="h-3 w-3" /> {inv.customerEmail}
                  </p>
                )}
                {inv.customerPic && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <User className="h-3 w-3" /> {inv.customerPic} (PIC)
                  </p>
                )}
              </div>
            </div>

            {/* Ship To */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Ship To
              </h3>
              {inv.shipToName ? (
                <>
                  <p className="font-bold text-sm text-gray-900 mb-1">{inv.shipToName.toUpperCase()}</p>
                  {inv.shipToAddress && (
                    <p className="text-xs text-gray-500 mb-1.5">{inv.shipToAddress}</p>
                  )}
                  <div className="space-y-1">
                    {inv.shipToPhone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {inv.shipToPhone}
                      </p>
                    )}
                    {inv.shipToContact && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <User className="h-3 w-3" /> {inv.shipToContact}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm text-gray-900 mb-1">
                    {(inv.customerCompany || inv.customerName || '').toUpperCase()}
                  </p>
                  {inv.customerAddress && (
                    <p className="text-xs text-gray-500 mb-1.5">{inv.customerAddress}</p>
                  )}
                  <div className="space-y-1">
                    {inv.customerPhone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {inv.customerPhone}
                      </p>
                    )}
                    {inv.customerPic && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <User className="h-3 w-3" /> {inv.customerPic}
                      </p>
                    )}
                  </div>
                </>
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
                  <th className="text-right font-semibold text-gray-700 py-2.5 px-2 w-20">Rate ({inv.currency || 'BND'})</th>
                  <th className="text-right font-semibold text-gray-700 py-2.5 px-2 w-24">Amount ({inv.currency || 'BND'})</th>
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
                      key={i}
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
              {inv.pdfUrl && (
                <div className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded-lg">
                  <File className="h-4 w-4 text-red-500" />
                  <span className="text-gray-700 truncate flex-1">
                    Invoice_{inv.invoiceNumber.replace(/\//g, '-')}.pdf
                  </span>
                  <span className="text-gray-400 shrink-0">PDF</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Notes
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {inv.notes || 'Thank you for choosing Smart Maintenance Services.'}
              </p>
              <div className="mt-4 flex items-end gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    {(inv.preparedByName || inv.creatorName || '—')}
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
          <InvoiceSummaryPrint inv={inv} lineItems={lineItems} />
        </div>
      </div>
        </div>{/* End left column */}

        {/* Right: Summary Sidebar (desktop only, sticky) */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-24">
            <InvoiceSummaryCard inv={inv} onRecordPayment={() => setShowPaymentDialog(true)} canManage={canManage} />
          </div>
        </div>
      </div>{/* End layout wrapper */}

      {/* === MOBILE SUMMARY CARD (shown below invoice card on mobile) === */}
      <div className="lg:hidden">
        <InvoiceSummaryCard inv={inv} onRecordPayment={() => setShowPaymentDialog(true)} canManage={canManage} />
      </div>

      {/* ===== PAYMENT DIALOG ===== */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Mark this invoice as paid and record payment details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Amount Due</p>
              <p className="text-2xl font-bold text-emerald-700">
                {inv.currency || 'BND'} {fmtBND(inv.total)}
              </p>
            </div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <select
                className="w-full mt-1 h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              >
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Cash</option>
                <option>Online Payment</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Payment Reference</Label>
              <Input
                placeholder="e.g. Receipt number"
                value={paymentForm.ref}
                onChange={(e) => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Transaction ID</Label>
              <Input
                placeholder="e.g. TRX202606200123"
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={handleRecordPayment}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CANCEL DIALOG ===== */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel invoice {inv.invoiceNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Keep Invoice</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Cancel Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ SUMMARY COMPONENTS ============

function InvoiceSummaryCard({ inv, onRecordPayment, canManage }: {
  inv: InvoiceItem;
  onRecordPayment: () => void;
  canManage: boolean;
}) {
  const currency = inv.currency || 'BND';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
      {/* Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-700">{currency} {fmtBND(inv.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Discount</span>
            <span className="text-gray-700">{currency} {fmtBND(inv.discount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Tax ({inv.taxRate || 0}%)</span>
            <span className="text-gray-700">{currency} {fmtBND(inv.tax)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Shipping</span>
            <span className="text-gray-700">{currency} {fmtBND(inv.shipping)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Grand Total</span>
            <span className="text-lg font-bold text-emerald-600">{currency} {fmtBND(inv.total)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="bg-emerald-50 rounded-lg p-3">
        <p className="text-[10px] text-emerald-600 font-medium mb-0.5">Amount In Words</p>
        <p className="text-xs text-emerald-700 italic font-medium">
          {numberToCurrencyWords(inv.total)}
        </p>
      </div>

      {/* Payment Information */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Information</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Bank Name</span>
            <span className="text-gray-700 font-medium">{inv.bankName || 'BAIDURI BANK'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Account Name</span>
            <span className="text-gray-700 font-medium text-right max-w-[60%]">{inv.bankAccountName || COMPANY.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Account No.</span>
            <span className="text-gray-700 font-medium">{inv.bankAccountNo || '00-12345-678901-2'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Payment Method</span>
            <span className="text-gray-700">{inv.paymentMethod || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Payment Status</span>
            <span className={`font-semibold ${inv.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {inv.status === 'PAID' ? 'Paid' : inv.status === 'CANCELLED' ? 'Cancelled' : 'Unpaid'}
            </span>
          </div>
          {inv.paidAt && (
            <div className="flex justify-between">
              <span className="text-gray-400">Paid On</span>
              <span className="text-gray-700">{fmtDate(inv.paidAt)}</span>
            </div>
          )}
          {inv.transactionId && (
            <div className="flex justify-between">
              <span className="text-gray-400">Transaction ID</span>
              <span className="text-gray-700 font-mono text-[10px]">{inv.transactionId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {canManage && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Actions</h3>
          <Button
            onClick={onRecordPayment}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
          >
            <CreditCard className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button variant="outline" className="w-full text-sm">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          <Button variant="outline" className="w-full text-sm">
            <Mail className="h-4 w-4 mr-2" /> Send Email
          </Button>
          <Button variant="outline" className="w-full text-sm">
            <MessageCircle className="h-4 w-4 mr-2" /> Send WhatsApp
          </Button>
          <Button variant="outline" className="w-full text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
            <X className="h-4 w-4 mr-2" /> Cancel Invoice
          </Button>
        </div>
      )}
    </div>
  );
}

function InvoiceSummaryPrint({ inv, lineItems }: { inv: InvoiceItem; lineItems: InvoiceLineItem[] }) {
  const currency = inv.currency || 'BND';
  return (
    <div className="flex justify-end">
      <div className="w-72 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{currency} {fmtBND(inv.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>{currency} {fmtBND(inv.discount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax ({inv.taxRate || 0}%)</span><span>{currency} {fmtBND(inv.tax)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{currency} {fmtBND(inv.shipping)}</span></div>
          <Separator />
          <div className="flex justify-between text-base font-bold text-emerald-600"><span>Grand Total</span><span>{currency} {fmtBND(inv.total)}</span></div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2.5 mt-3">
          <p className="text-[10px] text-emerald-600 font-medium">Amount In Words</p>
          <p className="text-xs text-emerald-700 italic">{numberToCurrencyWords(inv.total)}</p>
        </div>
      </div>
    </div>
  );
}