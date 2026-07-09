'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plane, Plus, Loader2, Search, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', MANAGER_APPROVED: 'bg-sky-100 text-sky-800',
  HR_APPROVED: 'bg-teal-100 text-teal-800', REJECTED: 'bg-rose-100 text-rose-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-gray-100 text-gray-700',
};

export function HrTravel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeName: '', destination: '', purpose: '', startDate: '', endDate: '', budget: '', notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/travel', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load travel requests'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.employeeName || !form.destination || !form.startDate) { toast.error('Employee, destination, and start date are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/travel', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, budget: parseFloat(form.budget) || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Travel request created');
      setDialogOpen(false);
      setForm({ employeeName: '', destination: '', purpose: '', startDate: '', endDate: '', budget: '', notes: '' });
      fetchData();
    } catch { toast.error('Failed to create request'); } finally { setSubmitting(false); }
  };

  const updateStatus = async (id: string, status: string, rejectionReason?: string) => {
    try {
      const body: any = { status };
      if (rejectionReason) body.rejectionReason = rejectionReason;
      const res = await fetch(`/api/hr/travel/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(`Request ${status === 'REJECTED' ? 'rejected' : 'approved'}`);
      fetchData();
    } catch { toast.error('Failed to update request'); }
  };

  const filtered = data.filter((t: any) => !search || (t.employeeName || t.destination || t.purpose || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><Plane className="h-5 w-5 text-sky-600" /></div>
          <div><h1 className="text-2xl font-bold">Travel Requests</h1><p className="text-sm text-muted-foreground">Manage business travel and approvals</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white"><Plus className="h-4 w-4 mr-2" /> New Request</Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search travel requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Employee</TableHead><TableHead>Destination</TableHead><TableHead>Purpose</TableHead>
          <TableHead>Dates</TableHead><TableHead>Budget</TableHead><TableHead>Actual</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No travel requests found</TableCell></TableRow>
            : filtered.map((t: any) => (
              <TableRow key={t.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{t.employeeName || '—'}</TableCell>
                <TableCell>{t.destination}</TableCell>
                <TableCell className="max-w-[150px] truncate">{t.purpose}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{t.startDate?.slice(0, 10)} — {t.endDate?.slice(0, 10)}</TableCell>
                <TableCell>{t.budget != null ? `$${t.budget.toFixed(2)}` : '—'}</TableCell>
                <TableCell>{t.actualCost != null ? `$${t.actualCost.toFixed(2)}` : '—'}</TableCell>
                <TableCell><Badge className={statusColors[t.status] || ''}>{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell>
                  {t.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => updateStatus(t.id, 'MANAGER_APPROVED')}><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => updateStatus(t.id, 'REJECTED', 'Declined')}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                  {t.status === 'MANAGER_APPROVED' && (
                    <Button variant="ghost" size="sm" className="text-teal-600" onClick={() => updateStatus(t.id, 'HR_APPROVED')}><Check className="h-3.5 w-3.5 mr-1" />HR</Button>
                  )}
                </TableCell>
              </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Travel Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Destination *</Label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="New York, USA" /></div>
              <div><Label>Budget ($)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            </div>
            <div><Label>Purpose</Label><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Client meeting" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}