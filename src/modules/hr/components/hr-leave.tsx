'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  CalendarOff, Plus, Search, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, XCircle, Clock, Scale, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PaginatedResponse, SelectOption } from '@/core/types';

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

function LeaveStatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    SUPERVISOR_APPROVED: 'bg-sky-100 text-sky-800',
    HR_APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    SUPERVISOR_APPROVED: 'Supervisor Approved',
    HR_APPROVED: 'HR Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };
  return <Badge variant="outline" className={v[status] || ''}>{labels[status] || status.replace(/_/g, ' ')}</Badge>;
}

interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  attachmentUrl: string | null;
  supervisorApprovedAt: string | null;
  hrApprovedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface LeaveBalanceItem {
  leaveTypeName: string;
  totalDays: number;
  usedDays: number;
  remaining: number;
}

// ============ MAIN COMPONENT ============

export function HrLeave() {
  const [data, setData] = useState<PaginatedResponse<LeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<SelectOption[]>([]);
  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '', attachment: '',
  });

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchMeta = useCallback(async () => {
    try {
      const [empRes, ltRes] = await Promise.all([
        fetch('/api/employees?pageSize=200', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/hr/leave?view=meta', { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const empJson = await empRes.json();
      const ltJson = await ltRes.json();
      setEmployees((empJson.data || []).map((e: { id: string; name: string }) => ({ label: e.name, value: e.id })));
      setLeaveTypes((ltJson.leaveTypes || []).map((lt: { id: string; name: string }) => ({ label: lt.name, value: lt.id })));
      if (ltJson.balances) setBalances(ltJson.balances);
    } catch { /* silent */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('leaveTypeId', typeFilter);
      const res = await fetch(`/api/hr/leave?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
    } catch { toast.error('Failed to load leave requests'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.employeeId || !form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error('Employee, leave type, and dates are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Leave request created');
      setCreateOpen(false);
      setForm({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '', attachment: '' });
      fetchData();
      fetchMeta();
    } catch { toast.error('Failed to create leave request'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/leave/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Leave approved');
      fetchData();
      fetchMeta();
    } catch { toast.error('Failed to approve leave'); }
  };

  const handleRejectClick = (id: string) => {
    setRejectId(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason) { toast.error('Please provide a rejection reason'); return; }
    setRejecting(true);
    try {
      const res = await fetch(`/api/hr/leave/${rejectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      });
      if (!res.ok) throw new Error();
      toast.success('Leave rejected');
      setRejectOpen(false);
      fetchData();
      fetchMeta();
    } catch { toast.error('Failed to reject leave'); }
    finally { setRejecting(false); }
  };

  const requests = data?.data || [];
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'HR_APPROVED' || r.status === 'SUPERVISOR_APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const totalBalance = balances.reduce((s, b) => s + b.remaining, 0);

  const statsCards = [
    { label: 'Pending', value: pendingCount, icon: <Clock className="h-4 w-4 text-amber-600" />, color: 'border-amber-200 bg-amber-50/50 text-amber-700' },
    { label: 'Approved', value: approvedCount, icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700' },
    { label: 'Rejected', value: rejectedCount, icon: <XCircle className="h-4 w-4 text-rose-600" />, color: 'border-rose-200 bg-rose-50/50 text-rose-700' },
    { label: 'Balance', value: totalBalance, icon: <Scale className="h-4 w-4 text-sky-600" />, color: 'border-sky-200 bg-sky-50/50 text-sky-700' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <CalendarOff className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Leave Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsCards.map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-3 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs font-medium opacity-75">{s.label}</p>
                <p className="text-xl font-bold">{s.label === 'Balance' ? s.value.toFixed(1) + ' days' : s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Balance Summary */}
      {balances.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4" /> Leave Balance Summary
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {balances.map((b) => (
                <div key={b.leaveTypeName} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{b.leaveTypeName}</p>
                  <p className="text-lg font-bold">{b.remaining.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ {b.totalDays} days</span></p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, (b.remaining / Math.max(b.totalDays, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by employee..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUPERVISOR_APPROVED">Supervisor Approved</SelectItem>
                <SelectItem value="HR_APPROVED">HR Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Leave Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {leaveTypes.map((lt) => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                )) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leave requests found</TableCell></TableRow>
                ) : requests.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell className="text-sm">{r.leaveTypeName}</TableCell>
                    <TableCell className="text-sm">{new Date(r.startDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{new Date(r.endDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-medium">{r.days}</TableCell>
                    <TableCell><LeaveStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{r.reason || '—'}</TableCell>
                    <TableCell>
                      {r.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => handleApprove(r.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={() => handleRejectClick(r.id)}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {r.status === 'SUPERVISOR_APPROVED' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => handleApprove(r.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> HR Approve
                        </Button>
                      )}
                      {r.status === 'REJECTED' && r.rejectionReason && (
                        <span className="text-xs text-muted-foreground" title={r.rejectionReason}>{r.rejectionReason.slice(0, 20)}...</span>
                      )}
                      {r.attachmentUrl && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(r.attachmentUrl!, '_blank')}>
                          <FileText className="h-3 w-3 mr-1" /> Doc
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} total)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Leave Request Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type *</Label>
              <Select value={form.leaveTypeId} onValueChange={(v) => setForm({ ...form, leaveTypeId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{leaveTypes.map((lt) => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" className="mt-1" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" className="mt-1" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea className="mt-1" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." rows={3} />
            </div>
            <div>
              <Label>Attachment URL (optional)</Label>
              <Input className="mt-1" value={form.attachment} onChange={(e) => setForm({ ...form, attachment: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Rejection Reason *</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Provide a reason for rejection..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button onClick={handleReject} disabled={rejecting} className="bg-rose-600 hover:bg-rose-700 text-white">
              {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}