'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Plus, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const severityColors: Record<string, string> = { minor: 'bg-amber-100 text-amber-800', major: 'bg-orange-100 text-orange-800', critical: 'bg-rose-100 text-rose-800' };
const statusColors: Record<string, string> = { active: 'bg-rose-100 text-rose-800', resolved: 'bg-emerald-100 text-emerald-800', appealed: 'bg-sky-100 text-sky-800', overturned: 'bg-gray-100 text-gray-700' };

export function HrDisciplinary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeName: '', type: 'warning', severity: 'minor', incidentDate: '', description: '', actionTaken: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/disciplinary', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load disciplinary actions'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.employeeName || !form.incidentDate || !form.description) { toast.error('Employee, date, and description are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/disciplinary', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Disciplinary action recorded');
      setDialogOpen(false);
      setForm({ employeeName: '', type: 'warning', severity: 'minor', incidentDate: '', description: '', actionTaken: '' });
      fetchData();
    } catch { toast.error('Failed to record action'); } finally { setSubmitting(false); }
  };

  const filtered = data.filter((d: any) => !search || (d.employeeName || d.description || '').toLowerCase().includes(search.toLowerCase()));
  const criticalCount = data.filter((d: any) => d.severity === 'critical' && d.status === 'active').length;
  const activeCount = data.filter((d: any) => d.status === 'active').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><ShieldAlert className="h-5 w-5 text-red-600" /></div>
          <div><h1 className="text-2xl font-bold">Disciplinary Actions</h1><p className="text-sm text-muted-foreground">{activeCount} active · {criticalCount} critical</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-red-600 hover:bg-red-700 text-white"><Plus className="h-4 w-4 mr-2" /> Record Action</Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search disciplinary records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead>
          <TableHead>Incident Date</TableHead><TableHead>Status</TableHead><TableHead>Action Taken</TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No disciplinary records found</TableCell></TableRow>
            : filtered.map((d: any) => (
              <TableRow key={d.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{d.employeeName || '—'}</TableCell>
                <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                <TableCell><Badge className={severityColors[d.severity] || ''}>{d.severity}</Badge></TableCell>
                <TableCell className="text-sm">{d.incidentDate?.slice(0, 10)}</TableCell>
                <TableCell><Badge className={statusColors[d.status] || ''}>{d.status}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">{d.actionTaken || '—'}</TableCell>
              </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Disciplinary Action</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="warning">Warning</SelectItem><SelectItem value="suspension">Suspension</SelectItem><SelectItem value="investigation">Investigation</SelectItem><SelectItem value="termination">Termination</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select></div>
              <div><Label>Severity</Label><Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select></div>
            </div>
            <div><Label>Incident Date *</Label><Input type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} /></div>
            <div><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Action Taken</Label><Textarea value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Record Action</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}