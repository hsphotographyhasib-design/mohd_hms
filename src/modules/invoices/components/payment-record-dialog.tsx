'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import {
  CreditCard, Banknote, Building2, Mail, CheckCircle2,
  Loader2, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';
import type { InvoicePaymentItem } from '@/core/types';

// ============ TYPES ============

interface PaymentRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceTotal: number;
  amountPaid: number;
  currency?: string;
  payments?: InvoicePaymentItem[];
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  { value: 'cheque', label: 'Cheque', icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
  { value: 'online', label: 'Online Payment', icon: Wallet, color: 'text-amber-600 bg-amber-50' },
  { value: 'card', label: 'Card Payment', icon: CreditCard, color: 'text-rose-600 bg-rose-50' },
] as const;

// ============ HELPERS ============

const getToken = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

function formatCurrency(amount: number, currency?: string): string {
  const symbols: Record<string, string> = { BND: 'BND', USD: '$', SGD: 'S$', MYR: 'RM' };
  const sym = symbols[currency || 'BND'] || currency || 'BND';
  return `${sym} ${amount.toFixed(2)}`;
}

// ============ COMPONENT ============

export function PaymentRecordDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceTotal,
  amountPaid,
  currency = 'BND',
  payments: initialPayments = [],
  onSuccess,
}: PaymentRecordDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<InvoicePaymentItem[]>(initialPayments);

  // Form state
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('bank_transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const balanceDue = invoiceTotal - (amountPaid || 0);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(0);
      setMethod('bank_transfer');
      setReferenceNo('');
      setTransactionId('');
      setNotes('');
      setPayments(initialPayments || []);

      // Pre-fill amount with balance due
      const balance = invoiceTotal - (amountPaid || 0);
      if (balance > 0) {
        setAmount(Math.round(balance * 100) / 100);
      }
    }
  }, [open, invoiceTotal, amountPaid, initialPayments]);

  // Fetch payment history when dialog opens
  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch {
      // silent
    }
  }, [invoiceId]);

  useEffect(() => {
    if (open) fetchPayments();
  }, [open, fetchPayments]);

  // Submit payment
  const handleSubmit = useCallback(async () => {
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > balanceDue) {
      toast.error(`Amount cannot exceed balance due of ${formatCurrency(balanceDue, currency)}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoiceId,
        amount,
        method,
        referenceNo: referenceNo || undefined,
        transactionId: transactionId || undefined,
        notes: notes || undefined,
      };

      const res = await fetch('/api/invoice-payments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Payment recording failed');
      }

      const result = await res.json();
      toast.success(`Payment of ${formatCurrency(amount, currency)} recorded successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }, [invoiceId, amount, method, referenceNo, transactionId, notes, balanceDue, currency, onOpenChange, onSuccess]);

  const selectedMethodConfig = PAYMENT_METHODS.find(m => m.value === method);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for this invoice. Current balance due:{' '}
            <span className="font-semibold text-rose-600">{formatCurrency(balanceDue, currency)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Balance Summary */}
        <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
          <div className="text-center">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Invoice Total</div>
            <div className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency(invoiceTotal, currency)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Paid</div>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(amountPaid, currency)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Balance Due</div>
            <div className={cn(
              'text-sm font-bold mt-0.5',
              balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
            )}>
              {formatCurrency(balanceDue, currency)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Form */}
        <div className="space-y-4">
          {/* Amount */}
          <div>
            <Label className="text-sm font-medium">Payment Amount</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                {currency === 'BND' ? 'BND' : currency === 'USD' ? '$' : currency === 'SGD' ? 'S$' : 'RM'}
              </span>
              <Input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-16 h-10 text-sm font-medium"
                min={0}
                max={balanceDue}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            {amount > 0 && amount <= balanceDue && (
              <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Remaining balance after payment: {formatCurrency(balanceDue - amount, currency)}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-sm font-medium">Payment Method</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all text-left',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-emerald-600' : 'text-gray-400')} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference No */}
          <div>
            <Label className="text-sm font-medium">Reference No.</Label>
            <Input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Cheque number, transaction ref..."
              className="h-9 text-sm mt-1.5"
            />
          </div>

          {/* Transaction ID */}
          <div>
            <Label className="text-sm font-medium">Transaction ID</Label>
            <Input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Bank transaction ID (optional)"
              className="h-9 text-sm mt-1.5"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment notes or remarks (optional)"
              className="text-sm mt-1.5 min-h-[60px]"
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <Button
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={submitting || amount <= 0}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? 'Recording Payment...' : 'Record Payment'}
          </Button>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Payment History ({payments.length})
              </h4>
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">
                          {p.paidAt ? format(new Date(p.paidAt), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="text-[10px] font-medium capitalize">
                            {(p.method || '').replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                          {formatCurrency(p.amount, currency)}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs truncate max-w-[120px]">
                          {p.referenceNo || p.transactionId || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { PaymentRecordDialogProps };