'use client';

import { useState, useEffect, useCallback } from 'react';
import { Laptop, Plus, Loader2, Search, Undo2 } from 'lucide-react';
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

const statusColors: Record<string, string> = { assigned: 'bg-sky-100 text-sky-800', returned: 'bg-emerald-100 text-emerald-800', damaged: 'bg-amber-100 text-amber-800', lost: 'bg-rose-100 text-rose-800' };
const conditionColors: Record<string, string> = { new: 'bg-emerald-100 text-emerald-800', good: 'bg-sky-100 text-sky-800', fair: 'bg-amber-100 text-amber-800', poor: 'bg-rose-100 text-rose-800' };

export function HrAssets() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeName: '', assetType: 'laptop', assetName: '', serialNumber: '', condition: 'new', notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/assets', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load asset assignments'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.employeeName || !form.assetName) { toast.error('Employee and asset name are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/assets', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Asset assigned');
      setDialogOpen(false);
      setForm({ employeeName: '', assetType: 'laptop', assetName: '', serialNumber: '', condition: 'new', notes: '' });
      fetchData();
    } catch { toast.error('Failed to assign asset'); } finally { setSubmitting(false); }
  };

  const handleReturn = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/assets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: 'returned' }) });
      if (!res.ok) throw new Error();
      toast.success('Asset marked as returned');
      fetchData();
    } catch { toast.error('Failed to return asset'); }
  };

  const filtered = data.filter((a: any) => !search || (a.employeeName || a.assetName || '').toLowerCase().includes(search.toLowerCase()));
  const assignedCount = data.filter((a: any) => a.status === 'assigned').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Laptop className="h-5 w-5 text-slate-600" /></div>
          <div><h1 className="text-2xl font-bold">Asset Assignment</h1><p className="text-sm text-muted-foreground">{assignedCount} currently assigned</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-slate-700 hover:bg-slate-800 text-white"><Plus className="h-4 w-4 mr-2" /> Assign Asset</Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Asset Name</TableHead>
          <TableHead>Serial No</TableHead><TableHead>Assigned Date</TableHead><TableHead>Status</TableHead><TableHead>Condition</TableHead><TableHead>Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assets found</TableCell></TableRow>
            : filtered.map((a: any) => (
              <TableRow key={a.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{a.employeeName || '—'}</TableCell>
                <TableCell><Badge variant="outline">{a.assetType}</Badge></TableCell>
                <TableCell>{a.assetName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.serialNumber || '—'}</TableCell>
                <TableCell className="text-sm">{a.assignedDate?.slice(0, 10)}</TableCell>
                <TableCell><Badge className={statusColors[a.status] || ''}>{a.status}</Badge></TableCell>
                <TableCell><Badge className={conditionColors[a.condition] || ''}>{a.condition || '—'}</Badge></TableCell>
                <TableCell>{a.status === 'assigned' && <Button variant="ghost" size="sm" onClick={() => handleReturn(a.id)}><Undo2 className="h-3.5 w-3.5 mr-1" />Return</Button>}</TableCell>
              </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign Asset</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} placeholder="John Doe" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Asset Type</Label><Select value={form.assetType} onValueChange={(v) => setForm({ ...form, assetType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="laptop">Laptop</SelectItem><SelectItem value="mobile">Mobile</SelectItem><SelectItem value="vehicle">Vehicle</SelectItem><SelectItem value="tools">Tools</SelectItem><SelectItem value="uniform">Uniform</SelectItem><SelectItem value="ppe">PPE</SelectItem><SelectItem value="equipment">Equipment</SelectItem></SelectContent>
              </Select></div>
              <div><Label>Asset Name *</Label><Input value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} placeholder="MacBook Pro 14&quot;" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Serial Number</Label><Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
              <div><Label>Condition</Label><Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent>
              </Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-slate-700 hover:bg-slate-800 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Assign Asset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}