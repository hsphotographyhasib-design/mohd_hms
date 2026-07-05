'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Play, FileText, Eye, Loader2, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

function PayrollStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PROCESSED: 'bg-amber-100 text-amber-800',
    PAID: 'bg-emerald-100 text-emerald-800',
  };
  return <Badge variant="outline" className={styles[status] || ''}>{status}</Badge>;
}

interface PayrollRecord {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  overtimePay: number;
  bonus: number;
  loanDeduction: number;
  tax: number;
  netPay: number;
  status: string;
  processedAt: string | null;
  paidAt: string | null;
  notes: string | null;
}

interface PayrollStats {
  totalAmount: number;
  totalRecords: number;
  draft: number;
  processed: number;
  paid: number;
}

export function HrPayroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/hr/payroll?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setRecords(json.data || []);
      setStats(json.stats);
      setTotal(json.total || 0);
    } catch {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, [month, year, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProcessPayroll = async () => {
    if (!confirm('Generate payroll for all active employees? Existing records will be skipped.')) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: 'process', month, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleGeneratePayslips = () => {
    toast.info('Payslip generation will be available in the next release');
  };

  const statsCards = [
    { label: 'Total Payroll', value: stats ? fmt(stats.totalAmount) : '—', icon: <Wallet className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50' },
    { label: 'Processed', value: stats?.processed ?? 0, icon: <CheckCircle2 className="h-4 w-4 text-amber-600" />, color: 'border-amber-200 bg-amber-50/50' },
    { label: 'Pending (Draft)', value: stats?.draft ?? 0, icon: <Clock className="h-4 w-4 text-gray-600" />, color: 'border-gray-200 bg-gray-50/50' },
    { label: 'Paid', value: stats?.paid ?? 0, icon: <DollarSign className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">HR Payroll</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleProcessPayroll} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Process Payroll
          </Button>
          <Button variant="outline" onClick={handleGeneratePayslips}>
            <FileText className="h-4 w-4 mr-2" /> Generate Payslips
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsCards.map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">{s.label}</p>
                <p className="text-lg font-bold truncate">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select value={String(month)} onValueChange={(v) => { setMonth(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {MONTHS[month - 1]?.label} {year} — {total} record{total !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Basic Salary</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">OT Pay</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No payroll records for {MONTHS[month - 1]?.label} {year}. Click "Process Payroll" to generate.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{r.employeeCode} · {r.department}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.basicSalary)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">+{fmt(r.allowances)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-rose-600">-{fmt(r.deductions + r.loanDeduction + r.tax)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-amber-600">+{fmt(r.overtimePay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-teal-600">+{fmt(r.bonus)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{fmt(r.netPay)}</TableCell>
                      <TableCell><PayrollStatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetailRecord(r); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payroll Detail</DialogTitle>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{detailRecord.employeeName}</span></div>
                <div><span className="text-muted-foreground">Code:</span> <span className="font-medium">{detailRecord.employeeCode}</span></div>
                <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{detailRecord.department}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <PayrollStatusBadge status={detailRecord.status} /></div>
              </div>
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span>Basic Salary</span><span className="font-mono">{fmt(detailRecord.basicSalary)}</span></div>
                <div className="flex justify-between text-sm"><span>Allowances</span><span className="font-mono text-emerald-600">+{fmt(detailRecord.allowances)}</span></div>
                <div className="flex justify-between text-sm"><span>Overtime Pay</span><span className="font-mono text-amber-600">+{fmt(detailRecord.overtimePay)}</span></div>
                <div className="flex justify-between text-sm"><span>Bonus</span><span className="font-mono text-teal-600">+{fmt(detailRecord.bonus)}</span></div>
                <div className="border-t pt-2 mt-2" />
                <div className="flex justify-between text-sm"><span>Deductions</span><span className="font-mono text-rose-600">-{fmt(detailRecord.deductions)}</span></div>
                <div className="flex justify-between text-sm"><span>Loan Deduction</span><span className="font-mono text-rose-600">-{fmt(detailRecord.loanDeduction)}</span></div>
                <div className="flex justify-between text-sm"><span>Tax</span><span className="font-mono text-rose-600">-{fmt(detailRecord.tax)}</span></div>
                <div className="border-t pt-2 mt-2" />
                <div className="flex justify-between font-semibold"><span>Net Pay</span><span className="font-mono text-emerald-700">{fmt(detailRecord.netPay)}</span></div>
              </div>
              {detailRecord.notes && (
                <div className="text-sm"><span className="text-muted-foreground">Notes:</span> {detailRecord.notes}</div>
              )}
              {detailRecord.processedAt && (
                <p className="text-xs text-muted-foreground">Processed: {new Date(detailRecord.processedAt).toLocaleString()}</p>
              )}
              {detailRecord.paidAt && (
                <p className="text-xs text-muted-foreground">Paid: {new Date(detailRecord.paidAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}