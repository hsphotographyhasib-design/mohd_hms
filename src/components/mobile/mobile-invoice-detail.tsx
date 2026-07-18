'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  User,
  Hash,
  CreditCard,
  Truck,
  Receipt,
  Download,
  Share2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { InvoiceItem, InvoiceLineItem, InvoiceStatus } from '@/types';

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function formatCurrency(amount: number, currency?: string) {
  const sym = currency === 'AED' ? 'AED ' : currency === 'BND' ? 'BND ' : currency ? `${currency} ` : '';
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
}

function parseItems(itemsJson?: string | null): InvoiceLineItem[] {
  if (!itemsJson) return [];
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STATUS_CONFIG: Record<string, { badge: string; label: string; icon: typeof CheckCircle2 }> = {
  PAID: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Paid', icon: CheckCircle2 },
  PENDING: { badge: 'bg-red-100 text-red-700 border-red-200', label: 'Unpaid', icon: CreditCard },
  APPROVED: { badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Approved', icon: CheckCircle2 },
  OVERDUE: { badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Overdue', icon: Receipt },
  DRAFT: { badge: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Draft', icon: FileText },
  CANCELLED: { badge: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Cancelled', icon: FileText },
};

// ============ ANIMATION VARIANTS ============

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

// ============ MAIN COMPONENT ============

export function MobileInvoiceDetail() {
  const { viewParams, setView } = useAppStore();
  const invoiceId = viewParams?.id as string;

  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Invoice not found');
      const data = await res.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleCopyNumber = () => {
    if (invoice?.invoiceNumber) {
      navigator.clipboard.writeText(invoice.invoiceNumber).then(() => {
        setCopied(true);
        toast.success('Invoice number copied');
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3 pb-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // ============ ERROR STATE ============
  if (error || !invoice) {
    return (
      <div className="space-y-4 pb-4">
        <button
          onClick={() => setView('invoices')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-5" />
          <span>Back to Invoices</span>
        </button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center text-sm text-red-600">
            {error || 'Invoice not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ DATA ============
  const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;
  const items = parseItems(invoice.items);
  const isOverdue = invoice.status === 'OVERDUE' || (invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID');

  return (
    <div className="space-y-5 pb-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('invoices')}
            className="flex size-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Back to invoices"
          >
            <ArrowLeft className="size-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Invoice Detail</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={handleCopyNumber}
            aria-label="Copy invoice number"
          >
            {copied ? (
              <CheckCircle2 className="size-4.5 text-emerald-600" />
            ) : (
              <Copy className="size-4.5 text-gray-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => toast.info('Share feature coming soon')}
            aria-label="Share invoice"
          >
            <Share2 className="size-4.5 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* ─── Status + Invoice Number ─── */}
      <motion.div {...fadeUp(0)}>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className={cn('px-3 py-1.5 text-xs font-semibold border', cfg.badge)}
          >
            {cfg.label}
          </Badge>
          {isOverdue && invoice.status !== 'PAID' && (
            <Badge variant="outline" className="px-2 py-1 text-[11px] font-medium bg-orange-50 text-orange-600 border-orange-200">
              Overdue
            </Badge>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Hash className="size-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-bold text-emerald-700">{invoice.invoiceNumber}</span>
        </div>
      </motion.div>

      {/* ─── Amount Card ─── */}
      <motion.div {...fadeUp(0.05)}>
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5 text-center">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(invoice.total, invoice.currency)}
            </p>
            {invoice.dueDate && (
              <p className="mt-2 text-xs text-gray-500">
                Due: {formatDate(invoice.dueDate)}
              </p>
            )}
            {invoice.paidAt && (
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                Paid on {formatDate(invoice.paidAt)}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Customer Info ─── */}
      <motion.div {...fadeUp(0.1)}>
        <Card className="border-gray-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Bill To</h3>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {invoice.customerName && (
              <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                <Building2 className="size-4 text-gray-400 shrink-0" />
                <span>{invoice.customerName}</span>
              </div>
            )}
            {invoice.customerCompany && (
              <p className="text-sm text-gray-600 ml-6">{invoice.customerCompany}</p>
            )}
            {invoice.customerEmail && (
              <p className="text-xs text-gray-500 ml-6">{invoice.customerEmail}</p>
            )}
            {invoice.customerPhone && (
              <p className="text-xs text-gray-500 ml-6">{invoice.customerPhone}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-xs text-gray-500 ml-6">{invoice.customerAddress}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Invoice Details ─── */}
      <motion.div {...fadeUp(0.15)}>
        <Card className="border-gray-200">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Invoice Details</h3>

            <div className="grid grid-cols-2 gap-3">
              {invoice.title && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Title</p>
                  <p className="text-sm font-medium text-gray-900">{invoice.title}</p>
                </div>
              )}

              {(invoice as any).workOrderTitle && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Work Order</p>
                  <p className="text-sm text-gray-700">{(invoice as any).workOrderTitle}</p>
                </div>
              )}

              {invoice.quotationNo && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Quotation</p>
                  <p className="text-sm text-gray-700">{invoice.quotationNo}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-0.5">Issue Date</p>
                <p className="text-sm text-gray-700">{formatDate(invoice.createdAt)}</p>
              </div>

              {invoice.dueDate && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Due Date</p>
                  <p className={cn('text-sm font-medium', isOverdue && invoice.status !== 'PAID' ? 'text-orange-600' : 'text-gray-700')}>
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              )}

              {invoice.referenceNo && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Reference</p>
                  <p className="text-sm text-gray-700">{invoice.referenceNo}</p>
                </div>
              )}

              {invoice.poReference && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">PO Reference</p>
                  <p className="text-sm text-gray-700">{invoice.poReference}</p>
                </div>
              )}

              {invoice.paymentTerms && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Payment Terms</p>
                  <p className="text-sm text-gray-700">{invoice.paymentTerms}</p>
                </div>
              )}
            </div>

            {invoice.preparedByName && (
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-1">
                <User className="size-4 text-gray-400 shrink-0" />
                <span>Prepared by: <span className="font-medium text-gray-800">{invoice.preparedByName}</span></span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Line Items ─── */}
      {items.length > 0 && (
        <motion.div {...fadeUp(0.2)}>
          <Card className="border-gray-200">
            <CardHeader className="pb-2 px-4 pt-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Items ({items.length})
              </h3>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-0 divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {item.quantity} × {formatCurrency(item.rate, invoice.currency)}
                          {item.unit && <span className="ml-1">/ {item.unit}</span>}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 shrink-0">
                        {formatCurrency(item.amount, invoice.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Summary ─── */}
      <motion.div {...fadeUp(0.25)}>
        <Card className="border-gray-200">
          <CardContent className="p-4 space-y-2.5">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Summary</h3>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>

            {invoice.taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({invoice.taxRate}%)</span>
                <span className="text-gray-900 font-medium">{formatCurrency(invoice.tax, invoice.currency)}</span>
              </div>
            )}

            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-emerald-600 font-medium">−{formatCurrency(invoice.discount, invoice.currency)}</span>
              </div>
            )}

            {invoice.shipping > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-900 font-medium">{formatCurrency(invoice.shipping, invoice.currency)}</span>
              </div>
            )}

            <Separator className="my-2" />

            <div className="flex justify-between">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-base font-bold text-emerald-700">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Payment Info ─── */}
      {(invoice.paymentMethod || invoice.paymentRef || invoice.transactionId || invoice.bankName) && (
        <motion.div {...fadeUp(0.3)}>
          <Card className="border-gray-200">
            <CardHeader className="pb-2 px-4 pt-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Information</h3>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {invoice.paymentMethod && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="size-4 text-gray-400 shrink-0" />
                  <span>Method: <span className="font-medium text-gray-800">{invoice.paymentMethod}</span></span>
                </div>
              )}
              {invoice.paymentRef && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Receipt className="size-4 text-gray-400 shrink-0" />
                  <span>Ref: <span className="font-medium text-gray-800">{invoice.paymentRef}</span></span>
                </div>
              )}
              {invoice.transactionId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash className="size-4 text-gray-400 shrink-0" />
                  <span>Transaction: <span className="font-medium text-gray-800">{invoice.transactionId}</span></span>
                </div>
              )}
              {invoice.bankName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="size-4 text-gray-400 shrink-0" />
                  <span>Bank: <span className="font-medium text-gray-800">{invoice.bankName}</span></span>
                </div>
              )}
              {invoice.bankAccountName && (
                <p className="text-xs text-gray-500 ml-6">A/C Name: {invoice.bankAccountName}</p>
              )}
              {invoice.bankAccountNo && (
                <p className="text-xs text-gray-500 ml-6">A/C No: {invoice.bankAccountNo}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Shipping To ─── */}
      {invoice.shipToName && (
        <motion.div {...fadeUp(0.32)}>
          <Card className="border-gray-200">
            <CardHeader className="pb-2 px-4 pt-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                <Truck className="size-3 inline mr-1" />
                Ship To
              </h3>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              <p className="text-sm font-medium text-gray-900">{invoice.shipToName}</p>
              {invoice.shipToAddress && (
                <p className="text-xs text-gray-500">{invoice.shipToAddress}</p>
              )}
              {(invoice.shipToPhone || invoice.shipToContact) && (
                <p className="text-xs text-gray-500">
                  {[invoice.shipToContact, invoice.shipToPhone].filter(Boolean).join(' · ')}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Notes & Terms ─── */}
      {(invoice.notes || invoice.description) && (
        <motion.div {...fadeUp(0.35)}>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              {invoice.description && (
                <>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">{invoice.description}</p>
                </>
              )}
              {invoice.notes && (
                <>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Metadata ─── */}
      <motion.div {...fadeUp(0.38)}>
        <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
          <span>Created: {formatDateTime(invoice.createdAt)}</span>
          <span>Updated: {formatDateTime(invoice.updatedAt)}</span>
        </div>
      </motion.div>
    </div>
  );
}