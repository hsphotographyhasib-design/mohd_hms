'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, FileText, Send, CheckCircle2, Clock, XCircle,
  Copy, Printer, Loader2, AlertTriangle, Eye, Pencil,
  RotateCcw, Wrench, FileSpreadsheet, Banknote, Lock,
  Building2, Phone, Mail, MapPin, Hash, User, Calendar,
  MessageSquare, ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store';
import type { QuotationLineItem, QuotationStatus } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============ CONSTANTS ============

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; description: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', description: 'Quotation is being prepared' },
  REVIEW: { label: 'In Review', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', description: 'Quotation is under review' },
  APPROVED: { label: 'Approved', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-300', description: 'Quotation has been approved' },
  SENT: { label: 'Sent to Customer', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-300', description: 'Quotation has been sent to customer' },
  ACCEPTED: { label: 'Accepted', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', description: 'Customer has accepted the quotation' },
  REJECTED: { label: 'Rejected', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-300', description: 'Customer has rejected the quotation' },
  EXPIRED: { label: 'Expired', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-300', description: 'Quotation has expired' },
  CONVERTED_WO: { label: 'Converted to WO', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', description: 'Quotation converted to Work Order' },
  CONVERTED_INVOICE: { label: 'Converted to Invoice', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300', description: 'Quotation converted to Invoice' },
  PAID: { label: 'Paid', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', description: 'Payment received' },
  CLOSED: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-300', description: 'Quotation is closed' },
};

const WORKFLOW_STEPS = [
  'DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'ACCEPTED', 'CONVERTED_WO', 'PAID', 'CLOSED',
] as const;

const VALID_TRANSITIONS: Record<string, { target: string; label: string; icon: React.ElementType; color: string; confirm?: string }[]> = {
  DRAFT: [
    { target: 'REVIEW', label: 'Submit for Review', icon: Eye, color: 'bg-amber-600 hover:bg-amber-700' },
    { target: 'REJECTED', label: 'Reject', icon: XCircle, color: 'bg-rose-600 hover:bg-rose-700', confirm: 'Reject this quotation?' },
  ],
  REVIEW: [
    { target: 'APPROVED', label: 'Approve', icon: CheckCircle2, color: 'bg-teal-600 hover:bg-teal-700' },
    { target: 'REJECTED', label: 'Reject', icon: XCircle, color: 'bg-rose-600 hover:bg-rose-700', confirm: 'Reject this quotation?' },
    { target: 'DRAFT', label: 'Back to Draft', icon: RotateCcw, color: 'bg-gray-600 hover:bg-gray-700' },
  ],
  APPROVED: [
    { target: 'SENT', label: 'Send to Customer', icon: Send, color: 'bg-sky-600 hover:bg-sky-700' },
    { target: 'DRAFT', label: 'Back to Draft', icon: RotateCcw, color: 'bg-gray-600 hover:bg-gray-700' },
  ],
  SENT: [
    { target: 'ACCEPTED', label: 'Mark as Accepted', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { target: 'EXPIRED', label: 'Mark as Expired', icon: Clock, color: 'bg-gray-600 hover:bg-gray-700', confirm: 'Mark this quotation as expired?' },
  ],
  ACCEPTED: [
    { target: 'CONVERTED_WO', label: 'Convert to Work Order', icon: Wrench, color: 'bg-purple-600 hover:bg-purple-700' },
    { target: 'CONVERTED_INVOICE', label: 'Convert to Invoice', icon: FileSpreadsheet, color: 'bg-indigo-600 hover:bg-indigo-700' },
    { target: 'CLOSED', label: 'Close', icon: Lock, color: 'bg-gray-600 hover:bg-gray-700', confirm: 'Close this quotation?' },
  ],
  REJECTED: [
    { target: 'DRAFT', label: 'Reopen as Draft', icon: RotateCcw, color: 'bg-gray-600 hover:bg-gray-700' },
  ],
  EXPIRED: [
    { target: 'DRAFT', label: 'Reopen as Draft', icon: RotateCcw, color: 'bg-gray-600 hover:bg-gray-700' },
  ],
  CONVERTED_WO: [
    { target: 'CLOSED', label: 'Close', icon: Lock, color: 'bg-gray-600 hover:bg-gray-700' },
    { target: 'PAID', label: 'Mark as Paid', icon: Banknote, color: 'bg-emerald-600 hover:bg-emerald-700' },
  ],
  CONVERTED_INVOICE: [
    { target: 'PAID', label: 'Mark as Paid', icon: Banknote, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { target: 'CLOSED', label: 'Close', icon: Lock, color: 'bg-gray-600 hover:bg-gray-700' },
  ],
  PAID: [
    { target: 'CLOSED', label: 'Close', icon: Lock, color: 'bg-gray-600 hover:bg-gray-700' },
  ],
  CLOSED: [],
};

const CURRENCY_SYMBOLS: Record<string, string> = { BND: 'BND', USD: '$', SGD: 'S$', MYR: 'RM' };

// ============ HELPERS ============

const getToken = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function formatCurrency(amount: number, currency?: string): string {
  const sym = currency ? (CURRENCY_SYMBOLS[currency] || currency) : 'BND';
  return `${sym} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';
  if (!Number.isFinite(num)) return 'ZERO';
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  function convertBelowThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' AND ' + convertBelowThousand(n % 100) : '');
  }
  let words = '';
  if (intPart >= 1000000) words += convertBelowThousand(Math.floor(intPart / 1000000)) + ' MILLION ';
  if (intPart >= 1000) words += convertBelowThousand(Math.floor((intPart % 1000000) / 1000)) + ' THOUSAND ';
  if (intPart % 1000 > 0) words += convertBelowThousand(intPart % 1000);
  if (decPart > 0) words += ' AND ' + convertBelowThousand(decPart) + ' CENTS';
  return words.trim() || 'ZERO';
}

// ============ MAIN COMPONENT ============

interface QuotationDetailData {
  id: string;
  tenantId: string;
  customerId: string;
  customer?: { name: string; phone?: string; email?: string; address?: string };
  customerName?: string;
  complaintId?: string;
  quotationNo?: string;
  title: string;
  description?: string;
  referenceNo?: string;
  projectName?: string;
  site?: string;
  preparedBy?: string;
  preparedByName?: string;
  items?: string | QuotationLineItem[];
  terms?: string | string[];
  currency?: string;
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  validUntil?: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  pdfUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function QuotationDetail({ quotationId }: { quotationId?: string }) {
  const setView = useAppStore((s) => s.setView);

  const [data, setData] = useState<QuotationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; targetStatus: string; label: string; confirm?: string }>({
    open: false, targetStatus: '', label: '', confirm: '',
  });
  const [statusNotes, setStatusNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchQuotation = useCallback(async () => {
    if (!quotationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load quotation');
      setView('quotations');
    } finally {
      setLoading(false);
    }
  }, [quotationId, setView]);

  useEffect(() => { fetchQuotation(); }, [fetchQuotation]);

  // Parse items and terms
  const lineItems = useMemo<QuotationLineItem[]>(() => {
    if (!data?.items) return [];
    try {
      const parsed = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [data?.items]);

  const termsList = useMemo<string[]>(() => {
    if (!data?.terms) return [];
    try {
      const parsed = typeof data.terms === 'string' ? JSON.parse(data.terms) : data.terms;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [data?.terms]);

  const currentStatus = data?.status || 'DRAFT';
  const availableActions = VALID_TRANSITIONS[currentStatus] || [];
  const currentStepIndex = WORKFLOW_STEPS.indexOf(currentStatus as typeof WORKFLOW_STEPS[number]);

  // Handle status transition
  const handleStatusChange = async () => {
    if (!quotationId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: statusDialog.targetStatus, notes: statusNotes || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Status update failed');
      }
      toast.success(`Quotation status updated to ${STATUS_CONFIG[statusDialog.targetStatus]?.label || statusDialog.targetStatus}`);
      setStatusDialog({ open: false, targetStatus: '', label: '', confirm: '' });
      setStatusNotes('');
      fetchQuotation();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!quotationId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success('Quotation deleted');
      setView('quotations');
    } catch {
      toast.error('Failed to delete quotation');
    } finally {
      setDeleting(false);
    }
  };

  // Handle duplicate
  const handleDuplicate = async () => {
    if (!data) return;
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          customerId: data.customerId,
          title: data.title + ' (Copy)',
          description: data.description,
          referenceNo: data.referenceNo,
          projectName: data.projectName,
          site: data.site,
          items: data.items,
          terms: data.terms,
          currency: data.currency || 'BND',
          taxRate: data.taxRate,
          discount: data.discount,
          shipping: data.shipping || 0,
          validUntil: data.validUntil,
          notes: data.notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Quotation duplicated');
      setView('quotations');
    } catch {
      toast.error('Failed to duplicate quotation');
    }
  };

  const currency = data?.currency || 'BND';
  const amountInWords = useMemo(() => {
    if (!data) return '';
    const words = numberToWords(data.total);
    const currencyName: Record<string, string> = {
      BND: 'BRUNEI DOLLARS', USD: 'US DOLLARS', SGD: 'SINGAPORE DOLLARS', MYR: 'MALAYSIAN RINGGIT',
    };
    return `${words} ${currencyName[currency] || currency} ONLY`;
  }, [data?.total, currency]);

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-gray-600">Quotation not found</p>
        <Button variant="outline" onClick={() => setView('quotations')}>Back to Quotations</Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.DRAFT;

  return (
    <div className="p-4 md:p-6 space-y-5 pb-20">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setView('quotations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Quotation Details</h1>
              <Badge variant="outline" className={cn('font-medium border', statusCfg.bgColor, statusCfg.color, statusCfg.borderColor)}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{data.quotationNo || 'No quotation number'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-1.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView('quotation-edit', { id: quotationId || '' })}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteDialogOpen(true)}>
            <XCircle className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* ==================== WORKFLOW PROGRESS BAR ==================== */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {WORKFLOW_STEPS.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = step === currentStatus;
              const stepCfg = STATUS_CONFIG[step];
              return (
                <div key={step} className="flex items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all shrink-0',
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium whitespace-nowrap',
                        isCurrent
                          ? 'text-emerald-700 font-bold'
                          : isCompleted
                            ? 'text-gray-700'
                            : 'text-gray-400'
                      )}
                    >
                      {stepCfg?.label || step}
                    </span>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div className={cn(
                      'w-8 h-0.5 mx-1 shrink-0',
                      i < currentStepIndex ? 'bg-emerald-500' : 'bg-gray-200'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ============ LEFT: Customer & Meta Info ============ */}
        <div className="lg:col-span-1 space-y-4">
          {/* Customer Information */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {data.customer ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{data.customer.name}</p>
                      {data.customer.email && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{data.customer.email}</span>
                        </div>
                      )}
                      {data.customer.phone && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{data.customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {data.customer.address && (
                    <div className="flex items-start gap-2 pt-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{data.customer.address}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{data.customerName || '—'}</p>
              )}
            </CardContent>
          </Card>

          {/* Quotation Meta */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quotation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <InfoRow icon={Hash} label="Reference No." value={data.referenceNo || '—'} />
              <InfoRow icon={User} label="Prepared By" value={data.preparedByName || '—'} />
              <InfoRow icon={Calendar} label="Date" value={format(new Date(data.createdAt), 'dd MMM yyyy, hh:mm a')} />
              <InfoRow icon={Clock} label="Valid Until" value={data.validUntil ? format(new Date(data.validUntil), 'dd MMM yyyy') : '—'} />
              {data.approvedAt && (
                <InfoRow icon={CheckCircle2} label="Approved At" value={format(new Date(data.approvedAt), 'dd MMM yyyy, hh:mm a')} />
              )}
              {data.sentAt && (
                <InfoRow icon={Send} label="Sent At" value={format(new Date(data.sentAt), 'dd MMM yyyy, hh:mm a')} />
              )}
              {data.acceptedAt && (
                <InfoRow icon={CheckCircle2} label="Accepted At" value={format(new Date(data.acceptedAt), 'dd MMM yyyy, hh:mm a')} />
              )}
            </CardContent>
          </Card>

          {/* Project & Site */}
          {(data.projectName || data.site || data.description) && (
            <Card className="py-0 gap-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {data.projectName && <InfoRow icon={FileText} label="Project Name" value={data.projectName} />}
                {data.site && <InfoRow icon={MapPin} label="Site" value={data.site} />}
                {data.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2.5 whitespace-pre-wrap">{data.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ============ CENTER: Line Items & Summary ============ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Line Items Table */}
          <Card className="py-0 gap-0 overflow-hidden">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Line Items ({lineItems.length})
                </CardTitle>
                <span className="text-xs text-muted-foreground font-mono">{data.quotationNo}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-10">SL#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-16">Unit</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-16">Qty</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-24">Rate</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          No line items
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, index) => (
                        <tr key={index} className={cn('border-t border-gray-100', index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono">{index + 1}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-900">{item.title || '—'}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-muted-foreground uppercase">{item.unit || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{item.quantity || 0}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(item.rate || 0, currency)}</td>
                          <td className="px-3 py-2.5 text-right font-bold font-mono text-gray-900">
                            {formatCurrency(item.amount || (item.quantity || 0) * (item.rate || 0), currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary & Totals */}
          <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gray-50 rounded-b-xl p-5">
                <div className="max-w-sm ml-auto space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-sm font-mono font-medium">{formatCurrency(data.subtotal, currency)}</span>
                  </div>
                  {(data.taxRate || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tax ({data.taxRate}%)</span>
                      <span className="text-sm font-mono font-medium">{formatCurrency(data.tax, currency)}</span>
                    </div>
                  )}
                  {data.discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Discount</span>
                      <span className="text-sm font-mono font-medium text-rose-600">-{formatCurrency(data.discount, currency)}</span>
                    </div>
                  )}
                  {data.shipping > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Shipping</span>
                      <span className="text-sm font-mono font-medium">{formatCurrency(data.shipping, currency)}</span>
                    </div>
                  )}
                  <Separator className="!mt-3 !mb-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">Grand Total</span>
                    <span className="text-xl font-bold text-emerald-700 font-mono">{formatCurrency(data.total, currency)}</span>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 rounded-lg px-3 py-2 text-xs font-medium mt-2">
                    {amountInWords}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          {termsList.length > 0 && (
            <Card className="py-0 gap-0 overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Terms & Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {termsList.filter((t) => t.trim()).map((term, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="text-xs text-muted-foreground mt-0.5 w-4 shrink-0 font-mono">{i + 1}.</span>
                      <p className="text-sm text-gray-600">{term}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {data.notes && (
            <Card className="py-0 gap-0 overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{data.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ==================== STICKY FOOTER: ACTION BUTTONS ==================== */}
      {availableActions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-muted-foreground font-medium shrink-0 mr-1">Actions:</span>
              {availableActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.target}
                    size="sm"
                    className={cn('text-white shadow-sm shrink-0', action.color)}
                    onClick={() => {
                      if (action.confirm) {
                        setStatusDialog({ open: true, targetStatus: action.target, label: action.label, confirm: action.confirm });
                      } else {
                        setStatusDialog({ open: true, targetStatus: action.target, label: action.label, confirm: undefined });
                        setStatusNotes('');
                      }
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {action.label}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== STATUS CHANGE DIALOG ==================== */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => !open && setStatusDialog({ open: false, targetStatus: '', label: '', confirm: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusDialog.confirm ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
              {statusDialog.label}
            </DialogTitle>
            <DialogDescription>
              {statusDialog.confirm
                ? statusDialog.confirm
                : `Change quotation status to "${STATUS_CONFIG[statusDialog.targetStatus]?.label || statusDialog.targetStatus}"?`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <Textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Add any notes for this status change..."
              className="mt-1.5"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, targetStatus: '', label: '', confirm: '' })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRMATION DIALOG ==================== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Delete Quotation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      </div>
    </div>
  );
}