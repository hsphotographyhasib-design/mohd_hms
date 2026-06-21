'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, CheckCircle2, Clock, Send, Loader2, Building2, CreditCard, CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, useAuthStore } from '@/store';
import type { InvoiceItem } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-800', ASSIGNED: 'bg-sky-100 text-sky-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800', RESOLVED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-600', COMPLETED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', PAID: 'bg-emerald-100 text-emerald-800',
    OVERDUE: 'bg-rose-100 text-rose-800', DRAFT: 'bg-gray-100 text-gray-600',
    APPROVED: 'bg-teal-100 text-teal-800', SENT: 'bg-sky-100 text-sky-800',
    REJECTED: 'bg-rose-100 text-rose-800', CANCELLED: 'bg-gray-100 text-gray-600',
    active: 'bg-emerald-100 text-emerald-800', inactive: 'bg-gray-100 text-gray-600',
    maintenance: 'bg-amber-100 text-amber-800',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

interface ParsedItem { description: string; amount: number; }

export function InvoiceDetail() {
  const { viewParams, setView } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const id = viewParams.id;
  const [inv, setInv] = useState<InvoiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lineItems, setLineItems] = useState<ParsedItem[]>([]);

  const fetchInv = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setInv(json);
      if (json.items) {
        try { setLineItems(JSON.parse(json.items)); } catch { setLineItems([]); }
      }
    } catch { toast.error('Failed to load invoice'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInv(); }, [id]);

  const updateStatus = async (status: string, extra?: Record<string, string>) => {
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
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(false); }
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance';

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  if (!inv) return <div className="p-6 text-center text-muted-foreground">Invoice not found</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Back & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('invoices')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{inv.invoiceNumber}</h1>
            <StatusBadge status={inv.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{inv.title}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {inv.status === 'DRAFT' && isAdmin && (
            <Button onClick={() => updateStatus('PENDING')} disabled={actionLoading} variant="outline">
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Mark Pending
            </Button>
          )}
          {inv.status === 'PENDING' && isAdmin && (
            <Button onClick={() => updateStatus('APPROVED')} disabled={actionLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Approve
            </Button>
          )}
          {(inv.status === 'APPROVED' || inv.status === 'PENDING') && isAdmin && (
            <Button onClick={() => updateStatus('PAID', { paymentMethod: 'Manual', paymentDate: new Date().toISOString() })} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />} Mark Paid
            </Button>
          )}
          {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && isAdmin && (
            <Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => updateStatus('CANCELLED')}>Cancel</Button>
          )}
        </div>
      </div>

      {/* Invoice Card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Top section */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-lg">Invoice</h2>
              </div>
              <p className="text-sm text-muted-foreground">{inv.invoiceNumber}</p>
              {inv.description && <p className="text-sm text-muted-foreground mt-1">{inv.description}</p>}
            </div>
            <div className="text-left sm:text-right space-y-1">
              <div className="flex items-center gap-2 sm:justify-end text-sm">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Date:</span> <span className="font-medium">{fmtDate(inv.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 sm:justify-end text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span> <span className="font-medium">{fmtDate(inv.dueDate)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">BILL TO</p>
            <p className="font-medium">{inv.customerName || 'Customer'}</p>
            <p className="text-sm text-muted-foreground">{inv.customerId}</p>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">LINE ITEMS</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">No line items</TableCell></TableRow>
                ) : lineItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{fmt(inv.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span>{fmt(inv.tax)}</span></div>
              {inv.discount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span>-{fmt(inv.discount)}</span></div>}
              <Separator />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{fmt(inv.total)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      {inv.status === 'PAID' && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Payment Received
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-emerald-700 space-y-1">
            <p><span className="opacity-75">Method:</span> {inv.paymentMethod || 'Manual'}</p>
            <p><span className="opacity-75">Date:</span> {fmtDate(inv.paidAt)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}