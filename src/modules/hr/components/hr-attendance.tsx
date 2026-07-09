'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
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
  Clock, UserCheck, UserX, AlertTriangle, LogIn, LogOut,
  Search, ChevronLeft, ChevronRight, CalendarDays, Loader2,
  MapPin, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PaginatedResponse, SelectOption } from '@/core/types';

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-800',
    absent: 'bg-rose-100 text-rose-800',
    late: 'bg-amber-100 text-amber-800',
    half_day: 'bg-orange-100 text-orange-800',
    leave: 'bg-sky-100 text-sky-800',
  };
  const labels: Record<string, string> = {
    present: 'Present', absent: 'Absent', late: 'Late',
    half_day: 'Half Day', leave: 'On Leave',
  };
  return <Badge variant="outline" className={v[status] || ''}>{labels[status] || status}</Badge>;
}

function CalendarDot({ status }: { status: string }) {
  const c: Record<string, string> = {
    present: 'bg-emerald-500', absent: 'bg-rose-500', late: 'bg-amber-500',
    half_day: 'bg-orange-500', leave: 'bg-sky-500',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${c[status] || 'bg-gray-300'}`} />;
}

interface AttendanceRecord {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number | null;
  status: string;
  checkInGps: string | null;
  checkOutGps: string | null;
  notes: string | null;
  createdAt: string;
}

interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
  status?: string;
}

// ============ MAIN COMPONENT ============

export function HrAttendance() {
  const [data, setData] = useState<PaginatedResponse<AttendanceRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employees, setEmployees] = useState<SelectOption[]>([]);

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);

  // Check-in/out dialog
  const [checkDialogOpen, setCheckDialogOpen] = useState(false);
  const [checkAction, setCheckAction] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [checkForm, setCheckForm] = useState({ userId: '', notes: '', gps: '' });
  const [submitting, setSubmitting] = useState(false);

  // Today stats
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, late: 0, half_day: 0, leave: 0 });

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?pageSize=200', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setEmployees((json.data || []).map((e: { id: string; name: string }) => ({
        label: e.name, value: e.id,
      })));
    } catch { /* silent */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/hr/attendance?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
      if (json.todayStats) setTodayStats(json.todayStats);
    } catch { toast.error('Failed to load attendance data'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  const fetchCalendar = useCallback(async () => {
    try {
      const params = new URLSearchParams({ month: String(calMonth + 1), year: String(calYear) });
      const res = await fetch(`/api/hr/attendance?${params}&view=calendar`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.calendarDays) setCalendarData(json.calendarDays);
    } catch { /* silent */ }
  }, [calMonth, calYear]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const handleCheckAction = () => {
    setCheckDialogOpen(true);
    setCheckForm({ userId: '', notes: '', gps: '' });
  };

  const handleSubmitCheck = async () => {
    if (!checkForm.userId) { toast.error('Select an employee'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: checkAction, userId: checkForm.userId, notes: checkForm.notes, gps: checkForm.gps || null }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${checkAction === 'checkIn' ? 'Check-in' : 'Check-out'} recorded`);
      setCheckDialogOpen(false);
      fetchData();
      fetchCalendar();
    } catch { toast.error(`Failed to ${checkAction === 'checkIn' ? 'check in' : 'check out'}`); }
    finally { setSubmitting(false); }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const records = data?.data || [];

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();

  const calCells: CalendarDay[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calCells.push({ date: prevDays - i, fullDate: '', isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const fullDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const found = calendarData.find((c) => c.fullDate === fullDate);
    calCells.push({ date: d, fullDate, isCurrentMonth: true, status: found?.status });
  }
  while (calCells.length % 7 !== 0) {
    calCells.push({ date: calCells.length - firstDay - daysInMonth + 1, fullDate: '', isCurrentMonth: false });
  }

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statsCards = [
    { label: 'Present', value: todayStats.present, icon: <UserCheck className="h-4 w-4 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700' },
    { label: 'Absent', value: todayStats.absent, icon: <UserX className="h-4 w-4 text-rose-600" />, color: 'border-rose-200 bg-rose-50/50 text-rose-700' },
    { label: 'Late', value: todayStats.late, icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, color: 'border-amber-200 bg-amber-50/50 text-amber-700' },
    { label: 'Half Day', value: todayStats.half_day, icon: <Clock className="h-4 w-4 text-orange-600" />, color: 'border-orange-200 bg-orange-50/50 text-orange-700' },
    { label: 'On Leave', value: todayStats.leave, icon: <FileText className="h-4 w-4 text-sky-600" />, color: 'border-sky-200 bg-sky-50/50 text-sky-700' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Attendance</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleCheckAction()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <LogIn className="h-4 w-4 mr-2" /> Manual Check-In
          </Button>
          <Button variant="outline" onClick={() => { setCheckAction('checkOut'); setCheckDialogOpen(true); setCheckForm({ userId: '', notes: '', gps: '' }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Manual Check-Out
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statsCards.map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-3 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs font-medium opacity-75">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> {monthNames[calMonth]} {calYear}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else { setCalMonth(calMonth - 1); } }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else { setCalMonth(calMonth + 1); } }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            {[
              { label: 'Present', color: 'bg-emerald-500' },
              { label: 'Absent', color: 'bg-rose-500' },
              { label: 'Late', color: 'bg-amber-500' },
              { label: 'Half Day', color: 'bg-orange-500' },
              { label: 'Leave', color: 'bg-sky-500' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${l.color}`} /> {l.label}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
            {calCells.map((cell, i) => (
              <div
                key={i}
                className={`flex flex-col items-center justify-center h-10 rounded-md text-sm
                  ${cell.isCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground/50'}
                  ${cell.fullDate === new Date().toISOString().split('T')[0] ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <span className="text-xs">{cell.date}</span>
                {cell.status && <CalendarDot status={cell.status} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by employee..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-full sm:w-40" placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-full sm:w-40" placeholder="To" />
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
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>GPS</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                )) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No attendance records found</TableCell></TableRow>
                ) : records.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm">{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{r.userName}</TableCell>
                    <TableCell className="text-sm font-mono">{fmtTime(r.checkIn)}</TableCell>
                    <TableCell className="text-sm font-mono">{fmtTime(r.checkOut)}</TableCell>
                    <TableCell className="text-right text-sm">{r.hoursWorked != null ? r.hoursWorked.toFixed(1) + 'h' : '—'}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      {(r.checkInGps || r.checkOutGps) ? (
                        <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{r.notes || '—'}</TableCell>
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

      {/* Manual Check-In/Out Dialog */}
      <Dialog open={checkDialogOpen} onOpenChange={setCheckDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{checkAction === 'checkIn' ? 'Manual Check-In' : 'Manual Check-Out'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={checkForm.userId} onValueChange={(v) => setCheckForm({ ...checkForm, userId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" value={checkForm.notes} onChange={(e) => setCheckForm({ ...checkForm, notes: e.target.value })} placeholder="Optional notes..." rows={2} />
            </div>
            <div>
              <Label>GPS Location (optional)</Label>
              <Input className="mt-1" value={checkForm.gps} onChange={(e) => setCheckForm({ ...checkForm, gps: e.target.value })} placeholder="lat, lng" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCheck} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {checkAction === 'checkIn' ? 'Check In' : 'Check Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}