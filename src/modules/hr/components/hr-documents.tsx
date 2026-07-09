'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Loader2, Search, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const statusColors: Record<string, string> = { active: 'bg-emerald-100 text-emerald-800', expired: 'bg-rose-100 text-rose-800', revoked: 'bg-gray-100 text-gray-700' };

export function HrDocuments() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeName: '', documentType: 'passport', title: '', fileUrl: '', expiryDate: '', reminderDays: '30' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/documents', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load documents'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.employeeName || !form.title || !form.fileUrl) { toast.error('Employee, title, and file URL are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, expiryDate: form.expiryDate || null, reminderDays: parseInt(form.reminderDays) || 30 }),
      });
      if (!res.ok) throw new Error();
      toast.success('Document uploaded');
      setDialogOpen(false);
      setForm({ employeeName: '', documentType: 'passport', title: '', fileUrl: '', expiryDate: '', reminderDays: '30' });
      fetchData();
    } catch { toast.error('Failed to upload document'); } finally { setSubmitting(false); }
  };

  const filtered = data.filter((d: any) => !search || (d.employeeName || d.title || '').toLowerCase().includes(search.toLowerCase()));
  const expiring = data.filter((d: any) => {
    if (!d.expiryDate || d.status === 'expired') return false;
    const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><FileText className="h-5 w-5 text-violet-600" /></div>
          <div><h1 className="text-2xl font-bold">HR Documents</h1><p className="text-sm text-muted-foreground">Employee document management</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white"><Plus className="h-4 w-4 mr-2" /> Upload Document</Button>
      </div>
      {expiring.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-base text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Expiry Alerts ({expiring.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {expiring.slice(0, 5).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{d.title}</span>
                <Badge variant="outline" className="text-amber-700">Expires {d.expiryDate?.slice(0, 10)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Title</TableHead>
          <TableHead>Upload Date</TableHead><TableHead>Expiry Date</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>
            : filtered.map((d: any) => (
              <TableRow key={d.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{d.employeeName || '—'}</TableCell>
                <TableCell><Badge variant="outline">{d.documentType}</Badge></TableCell>
                <TableCell>{d.title}</TableCell>
                <TableCell className="text-sm">{d.uploadedAt?.slice(0, 10) || d.createdAt?.slice(0, 10)}</TableCell>
                <TableCell className="text-sm">{d.expiryDate?.slice(0, 10) || '—'}</TableCell>
                <TableCell><Badge className={statusColors[d.status] || ''}>{d.status}</Badge></TableCell>
              </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} placeholder="John Doe" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Document Type</Label><Select value={form.documentType} onValueChange={(v) => setForm({ ...form, documentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="passport">Passport</SelectItem><SelectItem value="visa">Visa</SelectItem><SelectItem value="driving_license">Driving License</SelectItem><SelectItem value="certificate">Certificate</SelectItem><SelectItem value="contract">Contract</SelectItem><SelectItem value="insurance">Insurance</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Passport Scan" /></div>
            <div><Label>File URL *</Label><Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Reminder Days Before Expiry</Label><Input type="number" value={form.reminderDays} onChange={(e) => setForm({ ...form, reminderDays: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Upload</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}