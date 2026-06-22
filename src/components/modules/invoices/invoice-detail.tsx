'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Textarea
} from '@/components/ui/textarea';
import {
  ArrowLeft, Printer, Mail, MessageCircle, MoreVertical,
  CreditCard, Download, FileText, X,
  MapPin, Phone, MailIcon, User, Calendar, Hash, Building2, Landmark,
  Loader2, AlertCircle, CheckCircle2,
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
  shortName: 'S',
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

// ============ MAIN COMPONENT ============

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
  const qrReady = useRef(false);

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
          width: 1.8,
          height: 45,
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

  const handlePrint = () => window.print();

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
        <Skeleton className="h-[800px] w-full rounded-xl" />
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
  const currency = inv.currency || 'BND';
  const currencyLabel = currency === 'BND' ? 'Brunei Dollar' : currency;

  return (
    <div className="print:p-0">
      {/* ===== TOP ACTION BAR (hidden on print) ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-6 pb-0 md:pb-0 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => setView('invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-5 w-5 text-emerald-600" />
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

      {/* ===== INVOICE DOCUMENT (A4 Layout) ===== */}
      <div className="flex justify-center p-3 md:p-6 print:p-0">
        <div className="invoice-document bg-white border border-gray-200 rounded-xl shadow-sm print:shadow-none print:rounded-none print:border-0 w-full" style={{ maxWidth: '210mm' }}>
          <div className="p-5 md:p-8 print:p-6">

            {/* ====== ROW 1: Company Header (Left) + INVOICE Title & Barcode (Right) ====== */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
              {/* Left: Company Logo & Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  {/* Green "S" Logo */}
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

              {/* Right: INVOICE Label + Green Bar with Number + Barcode */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-emerald-600 font-bold text-xl tracking-wide">INVOICE</p>
                {/* Green bar with invoice number in white + barcode */}
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 rounded-md px-4 py-1.5">
                    <span className="text-white font-bold text-sm tracking-wide">{inv.invoiceNumber}</span>
                  </div>
                  <div className="bg-white p-1">
                    <svg ref={barcodeRef} className="h-11" />
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700 font-mono">{inv.invoiceNumber}</p>
              </div>
            </div>

            {/* ====== ROW 2: Invoice Details (Left) + Payment Information (Right) ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Left: Invoice Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Invoice Details
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-gray-400" /> Invoice Date
                    </span>
                    <span className="font-medium text-gray-800">{fmtDate(inv.createdAt)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-gray-400" /> Due Date
                    </span>
                    <span className="font-medium text-gray-800">{fmtDate(inv.dueDate)}</span>
                  </div>
                  {inv.referenceNo && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-gray-400" /> Reference
                      </span>
                      <span className="font-medium text-gray-800">{inv.referenceNo}</span>
                    </div>
                  )}
                  {inv.poReference && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-gray-400" /> PO / Ref No.
                      </span>
                      <span className="font-medium text-gray-800">{inv.poReference}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-gray-400" /> Payment Terms
                    </span>
                    <span className="font-medium text-gray-800">{inv.paymentTerms || '30 Days'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Landmark className="h-3 w-3 text-gray-400" /> Currency
                    </span>
                    <span className="font-medium text-gray-800">{currency} - {currencyLabel}</span>
                  </div>
                  {(inv.preparedByName || inv.creatorName) && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-gray-400" /> Prepared By
                      </span>
                      <span className="font-medium text-gray-800">{inv.preparedByName || inv.creatorName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Payment Information */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  Payment Information
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Bank Name</span>
                    <span className="font-medium text-gray-800">{inv.bankName || 'BAIDURI BANK'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-medium text-gray-800 text-right max-w-[60%]">{inv.bankAccountName || COMPANY.name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Account No.</span>
                    <span className="font-medium text-gray-800 font-mono">{inv.bankAccountNo || '00-12345-678901-2'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Payment Method</span>
                    <span className="font-medium text-gray-800">{inv.paymentMethod || 'Bank Transfer'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Payment Status</span>
                    <span className={`font-bold ${inv.status === 'PAID' ? 'text-emerald-600' : inv.status === 'CANCELLED' ? 'text-red-600' : 'text-amber-600'}`}>
                      {inv.status === 'PAID' ? 'Paid' : inv.status === 'CANCELLED' ? 'Cancelled' : 'Unpaid'}
                    </span>
                  </div>
                  {inv.paidAt && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Paid On</span>
                      <span className="font-medium text-gray-800">{fmtDate(inv.paidAt)}</span>
                    </div>
                  )}
                  {inv.transactionId && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Transaction ID</span>
                      <span className="font-medium text-gray-800 font-mono text-[10px]">{inv.transactionId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ====== ROW 3: Bill To (Left) + Ship To (Right) ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Bill To */}
              <div className="bg-blue-50/40 rounded-lg p-4 border border-blue-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  Bill To
                </h3>
                <p className="font-bold text-sm text-gray-900 mb-1">
                  {(inv.customerCompany || inv.customerName || '').toUpperCase()}
                </p>
                {inv.customerAddress && (
                  <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{inv.customerAddress}</p>
                )}
                <div className="space-y-1">
                  {inv.customerPhone && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-gray-400" /> {inv.customerPhone}
                    </p>
                  )}
                  {inv.customerEmail && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <MailIcon className="h-3 w-3 text-gray-400" /> {inv.customerEmail}
                    </p>
                  )}
                  {inv.customerPic && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <User className="h-3 w-3 text-gray-400" /> {inv.customerPic} (PIC)
                    </p>
                  )}
                </div>
              </div>

              {/* Ship To */}
              <div className="bg-blue-50/40 rounded-lg p-4 border border-blue-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  Ship To
                </h3>
                {inv.shipToName ? (
                  <>
                    <p className="font-bold text-sm text-gray-900 mb-1">{inv.shipToName.toUpperCase()}</p>
                    {inv.shipToAddress && (
                      <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{inv.shipToAddress}</p>
                    )}
                    <div className="space-y-1">
                      {inv.shipToPhone && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-gray-400" /> {inv.shipToPhone}
                        </p>
                      )}
                      {inv.shipToContact && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <User className="h-3 w-3 text-gray-400" /> {inv.shipToContact}
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
                      <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{inv.customerAddress}</p>
                    )}
                    <div className="space-y-1">
                      {inv.customerPhone && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-gray-400" /> {inv.customerPhone}
                        </p>
                      )}
                      {inv.customerPic && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <User className="h-3 w-3 text-gray-400" /> {inv.customerPic}
                        </p>
                      )}
                    </div>
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
                            key={i}
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
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(inv.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(inv.discount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Tax ({inv.taxRate || 0}%)</span>
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(inv.tax)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Shipping</span>
                      <span className="text-gray-800 font-medium">{currency} {fmtBND(inv.shipping)}</span>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-gray-300 pt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900">GRAND TOTAL</span>
                        <span className="text-lg font-bold text-emerald-600">{currency} {fmtBND(inv.total)}</span>
                      </div>
                    </div>
                    {/* Amount in Words */}
                    <div className="bg-emerald-50 rounded-md p-2.5 mt-1 border border-emerald-100">
                      <p className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mb-0.5">Amount In Words</p>
                      <p className="text-[11px] text-emerald-800 italic font-medium leading-relaxed">
                        {numberToCurrencyWords(inv.total)}
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

            {/* ====== ROW 6: Footer — Signature, Stamp, Attachment, QR, Thank You ====== */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                {/* Left: Authorised Signature + Stamp */}
                <div className="flex items-end gap-5">
                  <div>
                    <p className="text-xs font-medium text-gray-800 mb-1">
                      {inv.preparedByName || inv.creatorName || '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 mb-2">Authorised Signature</p>
                    <p className="text-[10px] text-gray-400">Managing Director</p>
                    {/* Signature line */}
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

                {/* Center: Attachment (if quotation linked) */}
                {inv.referenceNo && (
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-gray-600">Attachment</span>
                    </div>
                    <p className="text-[11px] text-gray-500">Quotation_{inv.referenceNo.replace(/\//g, '-')}.pdf</p>
                  </div>
                )}

                {/* Right: QR Code + Thank You */}
                <div className="flex items-end gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto">
                      <QRCodeSVG
                        value={`https://smartms.com/invoice/${inv.invoiceNumber}`}
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

      {/* ===== MOBILE ACTION BAR (hidden on print) ===== */}
      <div className="lg:hidden px-3 md:px-6 pb-4 print:hidden space-y-3">
        {canManage && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
          <Button
            onClick={() => setShowPaymentDialog(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" /> Record Payment
          </Button>
        )}
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
                {currency} {fmtBND(inv.total)}
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