'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Loader2, Pencil, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const token = () => localStorage.getItem('cmms_token') || '';

const typeColors: Record<string, string> = {
  info: 'bg-sky-100 text-sky-800', holiday: 'bg-emerald-100 text-emerald-800',
  emergency: 'bg-rose-100 text-rose-800', event: 'bg-violet-100 text-violet-800', policy: 'bg-amber-100 text-amber-800',
};
const priorityColors: Record<string, string> = { low: 'bg-gray-100 text-gray-600', normal: 'bg-sky-100 text-sky-800', high: 'bg-amber-100 text-amber-800', urgent: 'bg-rose-100 text-rose-800' };
const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', published: 'bg-emerald-100 text-emerald-800', archived: 'bg-slate-100 text-slate-700' };

const emptyForm = { title: '', content: '', type: 'info', priority: 'normal', status: 'draft' };

export function HrAnnouncements() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/announcements', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json.data || json || []);
    } catch { toast.error('Failed to load announcements'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    setSubmitting(true);
    const isEdit = !!editId;
    try {
      const url = isEdit ? `/api/hr/announcements/${editId}` : '/api/hr/announcements';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Announcement updated' : 'Announcement created');
      setDialogOpen(false);
      setForm(emptyForm);
      setEditing(false);
      setEditId(null);
      fetchData();
    } catch { toast.error(`Failed to ${isEdit ? 'update' : 'create'} announcement`); } finally { setSubmitting(false); }
  };

  const openEdit = (a: any) => {
    setForm({ title: a.title, content: a.content, type: a.type, priority: a.priority, status: a.status });
    setEditId(a.id);
    setEditing(true);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Megaphone className="h-5 w-5 text-indigo-600" /></div>
          <div><h1 className="text-2xl font-bold">Announcements</h1><p className="text-sm text-muted-foreground">Company-wide announcements</p></div>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditing(false); setEditId(null); setDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="h-4 w-4 mr-2" /> New Announcement</Button>
      </div>
      {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-5 w-3/4 mb-3" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>)}</div>
        : data.length === 0 ? <Card><CardContent className="p-12 text-center text-muted-foreground">No announcements yet</CardContent></Card>
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((a: any) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base leading-tight">{a.title}</h3>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDialog(a)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={typeColors[a.type] || ''}>{a.type}</Badge>
                  <Badge className={priorityColors[a.priority] || ''}>{a.priority}</Badge>
                  <Badge className={statusColors[a.status] || ''}>{a.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{a.content}</p>
                <p className="text-xs text-muted-foreground">{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : 'Draft'}</p>
              </CardContent>
            </Card>))}
        </div>}
      {/* View dialog */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{viewDialog?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2"><Badge className={typeColors[viewDialog?.type] || ''}>{viewDialog?.type}</Badge><Badge className={priorityColors[viewDialog?.priority] || ''}>{viewDialog?.priority}</Badge></div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto">{viewDialog?.content}</div>
          </div></DialogContent>
      </Dialog>
      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Company Holiday" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="holiday">Holiday</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="event">Event</SelectItem><SelectItem value="policy">Policy</SelectItem></SelectContent>
              </Select></div>
              <div><Label>Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
              </Select></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
              </Select></div>
            </div>
            <div><Label>Content *</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="Write your announcement here..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? 'Update' : 'Publish'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}