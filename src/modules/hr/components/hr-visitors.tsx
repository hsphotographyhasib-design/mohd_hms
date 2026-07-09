'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserCheck, Plus, Loader2, Search, LogIn, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const statusColors: Record<string, string> = { expected: 'bg-sky-100 text-sky-800', checked_in: 'bg-emerald-100 text-emerald-800', checked_out: 'bg-gray-100 text-gray-700' };

export function HrVisitors() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', purpose: '', hostName: '', idNumber: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/visitors', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load visitors'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Visitor name is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/visitors', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Visitor registered');
      setDialogOpen(false);
      setForm({ name: '', email: '', phone: '', company: '', purpose: '', hostName: '', idNumber: '' });
      fetchData();
    } catch { toast.error('Failed to register visitor'); } finally { setSubmitting(false); }
  };

  const handleCheckIn = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/visitors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: 'checked_in', checkIn: new Date().toISOString() }) });
      if (!res.ok) throw new Error();
      toast.success('Visitor checked in');
      fetchData();
    } catch { toast.error('Failed to check in'); }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/visitors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: 'checked_out', checkOut: new Date().toISOString() }) });
      if (!res.ok) throw new Error();
      toast.success('Visitor checked out');
      fetchData();
    } catch { toast.error('Failed to check out'); }
  };

  const filtered = data.filter((v: any) => !search || (v.name || v.company || '').toLowerCase().includes(search.toLowerCase()));
  const checkedIn = data.filter((v: any) => v.status === 'checked_in').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center"><UserCheck className="h-5 w-5 text-cyan-600" /></div>
          <div><h1 className="text-2xl font-bold">Visitor Management</h1><p className="text-sm text-muted-foreground">{checkedIn} currently checked in</p></div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white"><Plus className="h-4 w-4 mr-2" /> Register Visitor</Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search visitors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead>Company</TableHead><TableHead>Purpose</TableHead>
          <TableHead>Host</TableHead><TableHead>Check-In</TableHead><TableHead>Check-Out</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No visitors found</TableCell></TableRow>
            : filtered.map((v: any) => (
              <TableRow key={v.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.company || '—'}</TableCell>
                <TableCell className="max-w-[150px] truncate">{v.purpose || '—'}</TableCell>
                <TableCell>{v.hostName || '—'}</TableCell>
                <TableCell className="text-sm">{v.checkIn ? new Date(v.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                <TableCell className="text-sm">{v.checkOut ? new Date(v.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                <TableCell><Badge className={statusColors[v.status] || ''}>{v.status.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {v.status === 'expected' && <Button variant="ghost" size="sm" onClick={() => handleCheckIn(v.id)}><LogIn className="h-3.5 w-3.5 mr-1" />In</Button>}
                    {v.status === 'checked_in' && <Button variant="ghost" size="sm" onClick={() => handleCheckOut(v.id)}><LogOut className="h-3.5 w-3.5 mr-1" />Out</Button>}
                  </div>
                </TableCell>
              </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Register Visitor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Host Employee</Label><Input value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} /></div>
            </div>
            <div><Label>Purpose</Label><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Business meeting" /></div>
            <div><Label>ID Number</Label><Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Register</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}