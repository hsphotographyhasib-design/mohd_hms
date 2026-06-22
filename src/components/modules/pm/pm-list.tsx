'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Plus, CalendarClock, ChevronLeft, ChevronRight, Calendar, List, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import type { PmScheduleItem, PaginatedResponse, SelectOption } from '@/types';

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

function FrequencyBadge({ freq }: { freq: string }) {
  const v: Record<string, string> = {
    monthly: 'bg-emerald-100 text-emerald-800',
    quarterly: 'bg-sky-100 text-sky-800',
    half_yearly: 'bg-amber-100 text-amber-800',
    yearly: 'bg-purple-100 text-purple-800',
    custom: 'bg-gray-100 text-gray-600',
  };
  const label = freq === 'half_yearly' ? 'Half Yearly' : freq.charAt(0).toUpperCase() + freq.slice(1);
  return <Badge variant="outline" className={v[freq] || ''}>{label}</Badge>;
}

const token = () => localStorage.getItem('cmms_token') || '';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : '—';

export function PmList() {
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<PaginatedResponse<PmScheduleItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [equipment, setEquipment] = useState<SelectOption[]>([]);
  const [technicians, setTechnicians] = useState<SelectOption[]>([]);
  const [form, setForm] = useState({ equipmentId: '', title: '', description: '', frequency: 'monthly', assignedToId: '' });
  const [calMonth, setCalMonth] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      const res = await fetch(`/api/pm?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
    } catch { toast.error('Failed to load PM schedules'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDropdowns = async () => {
    try {
      const [eqRes, techRes] = await Promise.all([
        fetch('/api/equipment?pageSize=100', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/employees?role=technician&pageSize=100', { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const eqJson = await eqRes.json();
      const techJson = await techRes.json();
      setEquipment((eqJson.data || []).map((e: { id: string; name: string; assetNumber: string }) => ({ label: `${e.name} (${e.assetNumber})`, value: e.id })));
      setTechnicians((techJson.data || []).map((e: { id: string; name: string }) => ({ label: e.name, value: e.id })));
    } catch { /* silent */ }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.equipmentId) { toast.error('Title and equipment are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/pm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('PM schedule created');
      setDialogOpen(false);
      setForm({ equipmentId: '', title: '', description: '', frequency: 'monthly', assignedToId: '' });
      fetchData();
    } catch { toast.error('Failed to create PM schedule'); }
    finally { setSubmitting(false); }
  };

  const items = data?.data || [];
  const now = new Date();
  const activeCount = items.filter((p) => p.status === 'active').length;
  const dueSoonCount = items.filter((p) => {
    if (p.status !== 'active') return false;
    const due = new Date(p.nextDueDate);
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  }).length;
  const overdueCount = items.filter((p) => p.status === 'active' && new Date(p.nextDueDate) < now).length;
  const completedCount = items.filter((p) => p.status === 'completed').length;

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number; items: PmScheduleItem[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toISOString().split('T')[0];
      days.push({ day: d, items: items.filter((p) => p.nextDueDate && p.nextDueDate.startsWith(dateStr)) });
    }
    return { firstDay, days };
  }, [calMonth, items]);

  const monthLabel = calMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <CalendarClock className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Preventive Maintenance</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={viewMode === 'calendar' ? 'default' : 'outline'} onClick={() => setViewMode('calendar')}>
            <Calendar className="h-4 w-4 mr-2" /> Calendar
          </Button>
          <Button variant="outline" size={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>
            <List className="h-4 w-4 mr-2" /> List
          </Button>
          <Button onClick={() => { fetchDropdowns(); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> New PM Schedule
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Due Soon', value: dueSoonCount, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Overdue', value: overdueCount, color: 'bg-rose-50 text-rose-700 border-rose-200' },
          { label: 'Completed', value: completedCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-4">
              <p className="text-xs font-medium opacity-75">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Executed</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  )) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No PM schedules found</TableCell></TableRow>
                  ) : items.map((pm) => {
                    const isOverdue = pm.status === 'active' && new Date(pm.nextDueDate) < now;
                    return (
                      <TableRow key={pm.id} className={isOverdue ? 'bg-rose-50/60 hover:bg-rose-50' : ''}>
                        <TableCell className="font-medium">{pm.title}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{pm.equipmentName || '—'}</TableCell>
                        <TableCell><FrequencyBadge freq={pm.frequency} /></TableCell>
                        <TableCell className="text-sm">{fmtDate(pm.lastExecuted)}</TableCell>
                        <TableCell className={`text-sm font-medium ${isOverdue ? 'text-rose-600' : ''}`}>{fmtDate(pm.nextDueDate)}</TableCell>
                        <TableCell>{pm.assignedToName || '—'}</TableCell>
                        <TableCell><StatusBadge status={pm.status} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Calendar View */
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{monthLabel}</h2>
              <Button variant="outline" size="icon" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {Array.from({ length: calendarDays.firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {calendarDays.days.map(({ day, items: dayItems }) => (
                <div key={day} className="min-h-20 border rounded-lg p-1 text-sm">
                  <span className="text-xs font-medium">{day}</span>
                  {dayItems.map((pm) => (
                    <div key={pm.id} className="text-xs bg-emerald-100 text-emerald-700 rounded px-1 mt-0.5 truncate cursor-pointer hover:bg-emerald-200">
                      {pm.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New PM Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New PM Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Equipment *</Label>
              <Select value={form.equipmentId} onValueChange={(v) => setForm({ ...form, equipmentId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent>{equipment.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="PM schedule title" /></div>
            <div><Label>Description</Label><Textarea className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the maintenance..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Assigned To</Label>
                <Select value={form.assignedToId} onValueChange={(v) => setForm({ ...form, assignedToId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select technician" /></SelectTrigger>
                  <SelectContent>{technicians.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}