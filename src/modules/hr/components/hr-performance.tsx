'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Plus, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const ratingColors: Record<string, string> = {
  outstanding: 'bg-emerald-100 text-emerald-800',
  excellent: 'bg-teal-100 text-teal-800',
  good: 'bg-sky-100 text-sky-800',
  satisfactory: 'bg-amber-100 text-amber-800',
  needs_improvement: 'bg-orange-100 text-orange-800',
  poor: 'bg-rose-100 text-rose-800',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  employee_review: 'bg-amber-100 text-amber-700',
  manager_review: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export function HrPerformance() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeName: '', period: '', type: 'quarterly', kpiScore: '', goalsScore: '', rating: '', employeeComments: '', managerComments: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/performance', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load performance reviews'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.employeeName || !form.period) { toast.error('Employee and period are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/performance', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, kpiScore: parseFloat(form.kpiScore) || null, goalsScore: parseFloat(form.goalsScore) || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Review created');
      setDialogOpen(false);
      setForm({ employeeName: '', period: '', type: 'quarterly', kpiScore: '', goalsScore: '', rating: '', employeeComments: '', managerComments: '' });
      fetchData();
    } catch { toast.error('Failed to create review'); } finally { setSubmitting(false); }
  };

  const filtered = data.filter((r: any) => !search || (r.employeeName || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Star className="h-5 w-5 text-amber-600" />
          </div>
          <div><h1 className="text-2xl font-bold">Performance Reviews</h1><p className="text-sm text-muted-foreground">Manage employee performance evaluations</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white"><Plus className="h-4 w-4 mr-2" /> New Review</Button>
      </div>
      <Card><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Type</TableHead>
            <TableHead>KPI</TableHead><TableHead>Goals</TableHead><TableHead>Overall</TableHead>
            <TableHead>Rating</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
              : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No reviews found</TableCell></TableRow>
              : filtered.map((r: any) => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{r.employeeName || '—'}</TableCell>
                  <TableCell>{r.period}</TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                  <TableCell>{r.kpiScore != null ? r.kpiScore.toFixed(1) : '—'}</TableCell>
                  <TableCell>{r.goalsScore != null ? r.goalsScore.toFixed(1) : '—'}</TableCell>
                  <TableCell className="font-semibold">{r.overallScore != null ? r.overallScore.toFixed(1) : '—'}</TableCell>
                  <TableCell><Badge className={ratingColors[r.rating] || ''}>{(r.rating || '—').replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                </TableRow>))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} placeholder="John Doe" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period *</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Q1 2025" /></div>
              <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
              </Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>KPI Score</Label><Input type="number" step="0.1" min="0" max="10" value={form.kpiScore} onChange={(e) => setForm({ ...form, kpiScore: e.target.value })} /></div>
              <div><Label>Goals Score</Label><Input type="number" step="0.1" min="0" max="10" value={form.goalsScore} onChange={(e) => setForm({ ...form, goalsScore: e.target.value })} /></div>
              <div><Label>Rating</Label><Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Object.keys(ratingColors).map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select></div>
            </div>
            <div><Label>Employee Comments</Label><Textarea value={form.employeeComments} onChange={(e) => setForm({ ...form, employeeComments: e.target.value })} rows={3} /></div>
            <div><Label>Manager Comments</Label><Textarea value={form.managerComments} onChange={(e) => setForm({ ...form, managerComments: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}