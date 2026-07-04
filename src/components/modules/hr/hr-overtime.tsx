'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Plus, Loader2, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Hourglass, DollarSign, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

interface OTRecord {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  date: string;
  hours: number;
  rate: number | null;
  totalPay: number | null;
  reason: string | null;
  status: string;
  supervisorApprovedAt: string | null;
  hrApprovedAt: string | null;
}

interface OTStats {
  pending: number;
  supervisorApproved: number;
  hrApproved: number;
  rejected: number;
  totalHours: number;
  totalAmount: number;
}

function OTStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    SUPERVISOR_APPROVED: 'bg-amber-100 text-amber-800',
    HR_APPROVED: 'bg-teal-100 text-teal-800',
    REJECTED: 'bg-rose-100 text-rose-800',
    PAID: 'bg-emerald-100 text-emerald-800',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    SUPERVISOR_APPROVED: 'Supervisor Approved',
    HR_APPROVED: 'HR Approved',
    REJECTED: 'Rejected',
    PAID: 'Paid',
  };
  return <Badge variant="outline" className={styles[status] || ''}>{labels[status] || status}</Badge>;
}

export function HrOvertime() {
  const [records, setRecords] = useState<OTRecord[]>([]);
  const [stats, setStats] = useState<OTStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: '', hours: '', reason: '', rate: '' });

  // Employee list for form
  const [employees, setEmployees] = useState<{ id: string; name: string; code: string }[]>([]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?pageSize=200', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setEmployees((json.data || []).map((e: { id: string; name: string; employeeId: string }) => ({
        id: e.id, name: e.name, code: e.employeeId || e.id.slice(0, 8),
      })));
    } catch { /* ignore */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('employeeId', search);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/hr/overtime?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setRecords(json.data || []);
      setStats(json.stats);
      setTotal(json.total || 0);
    } catch {
      toast.error('Failed to load overtime data');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, dateFrom, dateTo]);

  useEffect(() => { fetchData(); fetchEmployees(); }, [fetchData, fetchEmployees]);

  const handleCreate = async () => {
    if (!form.employeeId || !form.date || !form.hours || Number(form.hours) <= 0) {
      toast.error('Employee, date, and valid hours are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          employeeId: form.employeeId,
          date: form.date,
          hours: Number(form.hours),
          reason: form.reason || null,
          rate: form.rate ? Number(form.rate) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('OT request created');
      setCreateOpen(false);
      setForm({ employeeId: '', date: '', hours: '', reason: '', rate: '' });
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create OT request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    const confirmMsg = action.includes('reject') ? 'Reject this OT request?' : 'Approve this OT request?';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/hr/overtime/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const statsCards = [
    { label: 'Pending', value: stats?.pending ?? 0, icon: <Hourglass className="h-4 w-4 text-gray-600" />, color: 'border-gray-200 bg-gray-50/50' },
    { label: 'Supervisor Approved', value: stats?.supervisorApproved ?? 0, icon: <CheckCircle2 className="h-4 w-4 text-amber-600" />, color: 'border-amber-200 bg-amber-50/50' },
    { label: 'HR Approved', value: stats?.hrApproved ?? 0, icon: <CheckCircle2 className="h-4 w-4 text-teal-600" />, color: 'border-teal-200 bg-teal-50/50' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: <XCircle className="h-4 w-4 text-rose-600" />, color: 'border-rose-200 bg-rose-50/50' },
    { label: 'Total Hours', value: stats?.totalHours?.toFixed(1) ?? '0', icon: <Clock className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50' },
    { label: 'Total Amount', value: stats ? fmt(stats.totalAmount) : '—', icon: <DollarSign className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Overtime Management</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New OT Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <Filter className="h-4 w-4 text-muted-foreground mt-2 md:mt-0" />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUPERVISOR_APPROVED">Supervisor Approved</SelectItem>
                <SelectItem value="HR_APPROVED">HR Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full md:w-40"
              placeholder="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full md:w-40"
              placeholder="To date"
            />
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
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No overtime requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{r.employeeCode} · {r.department}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(r.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.hours}h</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.rate ? fmt(r.rate) : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{r.totalPay ? fmt(r.totalPay) : '—'}</TableCell>
                      <TableCell><OTStatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === 'PENDING' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => handleAction(r.id, 'supervisor_approve')}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => handleAction(r.id, 'reject')}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {r.status === 'SUPERVISOR_APPROVED' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                onClick={() => handleAction(r.id, 'hr_approve')}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => handleAction(r.id, 'reject')}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {r.reason && (
                            <span className="text-xs text-muted-foreground max-w-32 truncate" title={r.reason}>{r.reason}</span>
                          )}
                        </div>
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

      {/* Create OT Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New OT Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input type="number" step="0.5" min="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="e.g. 2.5" />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate (optional)</Label>
                <Input type="number" step="0.01" min="0" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="Auto" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for overtime..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}