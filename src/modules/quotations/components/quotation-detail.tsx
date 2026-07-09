'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/textarea';
import {
  ArrowLeft, Printer, Mail, MessageCircle, MoreVertical,
  Loader2, AlertCircle, CheckCircle2, Send, X,
  Copy, FileText, RotateCcw, Pencil, Eye, FileDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAppStore, useAuthStore, hasMinRole } from '@/app-shell/store';
import type { QuotationStatus } from '@/core/types';
import { COMPANY } from '@/core/constants/company';
import { QuotationA4Template, fmtBND, fmtDate } from './quotation-a4-template';
import { QuotationPreviewDialog } from './quotation-preview-dialog';

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

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

async function logAudit(quotationId: string, action: string) {
  try {
    await fetch(`/api/quotations/${quotationId}/audit-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action }),
    });
  } catch {
    // Audit logging is best-effort
  }
}

// ============ COMPONENT ============

interface QuotationCustomer {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  companyName?: string;
  pic?: string;
  district?: string;
  country?: string;
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
  warranty?: string;
  deliveryPeriod?: string;
  salesPerson?: string;
}

export function QuotationDetail({ quotationId }: { quotationId?: string }) {
  const { viewParams, setView } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const id = quotationId || viewParams.id;
  const [qt, setQt] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPreview, setShowPreview] = useState(false);

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
    } catch {
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchQt(); }, [fetchQt]);

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

  // ====== Preview ======
  const handlePreview = () => {
    if (!qt) return;
    logAudit(qt.id, 'preview');
    setShowPreview(true);
  };

  // ====== Print ======
  const handlePrint = () => {
    if (!qt) return;
    logAudit(qt.id, 'print');
    window.print();
  };

  // ====== PDF Download ======
  const handleDownloadPdf = async () => {
    if (!qt) return;
    setPdfLoading(true);
    try {
      logAudit(qt.id, 'pdf_download');
      const res = await fetch(`/api/quotations/${qt.id}/generate-pdf`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation-${(qt.quotationNo || qt.id).replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF. Please try Print > Save as PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ====== Email ======
  const handleSendEmail = async () => {
    if (!qt) return;
    if (!qt.customer?.email) {
      toast.error('No customer email address found');
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch(`/api/quotations/${qt.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email failed');
      toast.success(`Quotation sent to ${qt.customer.email}`);
      logAudit(qt.id, 'email_sent');
      fetchQt(); // Refresh to get updated sentAt
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setEmailLoading(false);
    }
  };

  // ====== WhatsApp ======
  const handleSendWhatsApp = async () => {
    if (!qt) return;
    if (!qt.customer?.phone) {
      toast.error('No customer phone number found');
      return;
    }
    try {
      const res = await fetch(`/api/quotations/${qt.id}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'WhatsApp failed');
      window.open(data.whatsappLink, '_blank');
      logAudit(qt.id, 'whatsapp_sent');
    } catch (err) {
      // Fallback to direct wa.me link
      const msg = encodeURIComponent(
        `Dear ${qt.customer?.name},\n\nQuotation *${qt.quotationNo || 'N/A'}*\nAmount: *${qt.currency || 'BND'} ${fmtBND(qt.total)}*\nValid Until: ${fmtDate(qt.validUntil)}\n\n- ${COMPANY.name}`
      );
      const phone = (qt.customer?.phone || '').replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    }
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

          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-1.5" /> Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileDown className="h-4 w-4 mr-1.5" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={emailLoading}>
            {emailLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
            Email
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

      {/* ===== QUOTATION DOCUMENT (A4 Template) ===== */}
      <div className="flex justify-center p-3 md:p-6 print:p-0">
        <div className="w-full" style={{ maxWidth: '210mm' }}>
          <QuotationA4Template
            quotation={{
              id: qt.id,
              quotationNo: qt.quotationNo,
              title: qt.title,
              description: qt.description,
              referenceNo: qt.referenceNo,
              projectName: qt.projectName,
              site: qt.site,
              preparedByName: qt.preparedByName,
              salesPerson: qt.salesPerson,
              items: qt.items,
              terms: qt.terms,
              currency: qt.currency,
              subtotal: qt.subtotal,
              taxRate: qt.taxRate,
              tax: qt.tax,
              discount: qt.discount,
              shipping: qt.shipping,
              total: qt.total,
              status: qt.status,
              validUntil: qt.validUntil,
              notes: qt.notes,
              warranty: qt.warranty,
              deliveryPeriod: qt.deliveryPeriod,
              createdAt: qt.createdAt,
              customer: qt.customer,
            }}
          />
        </div>
      </div>

      {/* ===== PREVIEW DIALOG ===== */}
      {qt && (
        <QuotationPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          quotation={{
            id: qt.id,
            quotationNo: qt.quotationNo,
            title: qt.title,
            description: qt.description,
            referenceNo: qt.referenceNo,
            projectName: qt.projectName,
            site: qt.site,
            preparedByName: qt.preparedByName,
            salesPerson: qt.salesPerson,
            items: qt.items,
            terms: qt.terms,
            currency: qt.currency,
            subtotal: qt.subtotal,
            taxRate: qt.taxRate,
            tax: qt.tax,
            discount: qt.discount,
            shipping: qt.shipping,
            total: qt.total,
            status: qt.status,
            validUntil: qt.validUntil,
            notes: qt.notes,
            warranty: qt.warranty,
            deliveryPeriod: qt.deliveryPeriod,
            createdAt: qt.createdAt,
            customer: qt.customer,
          }}
          onPrint={handlePrint}
          onDownloadPdf={handleDownloadPdf}
          onSendEmail={handleSendEmail}
          onSendWhatsApp={handleSendWhatsApp}
        />
      )}

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