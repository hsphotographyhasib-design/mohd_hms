'use client';

import { useState, useEffect, useCallback } from 'react';
import { HeartPulse, Plus, Loader2, Search, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
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

const statusColors: Record<string, string> = { active: 'bg-emerald-100 text-emerald-800', expired: 'bg-rose-100 text-rose-800' };
const typeColors: Record<string, string> = { insurance: 'bg-sky-100 text-sky-800', medical_certificate: 'bg-teal-100 text-teal-800', vaccination: 'bg-amber-100 text-amber-800', checkup: 'bg-violet-100 text-violet-800' };

export function HrMedical() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeName: '', recordType: 'checkup', provider: '', date: '', expiryDate: '', details: '', cost: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/medical', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load medical records'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.employeeName || !form.date) { toast.error('Employee and date are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/medical', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, expiryDate: form.expiryDate || null, cost: parseFloat(form.cost) || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Medical record created');
      setDialogOpen(false);
      setForm({ employeeName: '', recordType: 'checkup', provider: '', date: '', expiryDate: '', details: '', cost: '' });
      fetchData();
    } catch { toast.error('Failed to create record'); } finally { setSubmitting(false); }
  };

  const filtered = data.filter((r: any) => !search || (r.employeeName || r.provider || '').toLowerCase().includes(search.toLowerCase()));
  const expiring = data.filter((r: any) => {
    if (!r.expiryDate || r.status === 'expired') return false;
    return Math.ceil((new Date(r.expiryDate).getTime() - Date.now()) / 86400000) <= 30 && Math.ceil((new Date(r.expiryDate).getTime() - Date.now()) / 86400000) >= 0;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><HeartPulse className="h-5 w-5 text-rose-600" /></div>
          <div><h1 className="text-2xl font-bold">Medical Records</h1><p className="text-sm text-muted-foreground">Track employee health and compliance</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white"><Plus className="h-4 w-4 mr-2" /> Add Record</Button>
      </div>
      {expiring.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-base text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Expiring Soon ({expiring.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {expiring.slice(0, 5).map((r: any) => (
              <div key={r.id} className="flex justify-between text-sm"><span>{r.employeeName} — {r.recordType}</span><span className="text-amber-700">{r.expiryDate?.slice(0, 10)}</span></div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Provider</TableHead>
          <TableHead>Date</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
            : filtered.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{r.employeeName || '—'}</TableCell>
                <TableCell><Badge className={typeColors[r.recordType] || ''}>{r.recordType.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell>{r.provider || '—'}</TableCell>
                <TableCell className="text-sm">{r.date?.slice(0, 10)}</TableCell>
                <TableCell className="text-sm">{r.expiryDate?.slice(0, 10) || '—'}</TableCell>
                <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
              </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Medical Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} placeholder="John Doe" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Record Type</Label><Select value={form.recordType} onValueChange={(v) => setForm({ ...form, recordType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="insurance">Insurance</SelectItem><SelectItem value="medical_certificate">Medical Certificate</SelectItem><SelectItem value="vaccination">Vaccination</SelectItem><SelectItem value="checkup">Checkup</SelectItem></SelectContent>
              </Select></div>
              <div><Label>Provider</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
              <div><Label>Cost ($)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            </div>
            <div><Label>Details</Label><Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}