'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Play, CheckCircle2, XCircle, Loader2, DollarSign, Clock, Wrench, Package, Image as ImageIcon, StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, useAuthStore } from '@/store';
import type { WorkOrderItem, WorkOrderMaterialItem } from '@/types';

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

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export function WorkOrderDetail() {
  const { viewParams, setView } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const id = viewParams.id;
  const [wo, setWo] = useState<WorkOrderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [checklist, setChecklist] = useState<{ text: string; checked: boolean }[]>([]);

  const fetchWo = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setWo(json);
      if (json.checklistData) {
        try { setChecklist(JSON.parse(json.checklistData).map((c: string) => ({ text: c, checked: false }))); } catch { /* ignore */ }
      }
    } catch { toast.error('Failed to load work order'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWo(); }, [id]);

  const updateStatus = async (status: string, body?: Record<string, string>) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status, ...body }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Work order ${status.toLowerCase().replace('_', ' ')}`);
      fetchWo();
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(false); }
  };

  const handleCancel = () => {
    updateStatus('CANCELLED', { notes: cancelNote });
    setCancelDialog(false);
    setCancelNote('');
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'supervisor';

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
  if (!wo) return <div className="p-6 text-center text-muted-foreground">Work order not found</div>;

  const typeBadgeColor = wo.type === 'corrective' ? 'bg-amber-100 text-amber-800' : wo.type === 'preventive' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
  const totalCost = (wo.laborCost || 0) + (wo.materialCost || 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Back & Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('work-orders')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{wo.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={wo.status} />
            <Badge variant="outline" className={typeBadgeColor}>{wo.type}</Badge>
            <Badge variant="outline" className="capitalize">{wo.priority} priority</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {wo.status === 'PENDING' && (
            <Button onClick={() => updateStatus('IN_PROGRESS')} disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Start Work
            </Button>
          )}
          {wo.status === 'IN_PROGRESS' && (
            <Button onClick={() => updateStatus('COMPLETED')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Complete
            </Button>
          )}
          {(wo.status === 'PENDING' || wo.status === 'IN_PROGRESS') && isAdmin && (
            <Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => setCancelDialog(true)}><XCircle className="h-4 w-4 mr-2" /> Cancel</Button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Wrench className="h-4 w-4" /> Equipment</CardTitle></CardHeader>
          <CardContent className="pt-0"><p className="font-medium">{wo.equipmentName || 'None'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Assigned:</span> {wo.assignedToName || '—'}</p>
            <p><span className="text-muted-foreground">Created:</span> {fmtDate(wo.createdAt)}</p>
            <p><span className="text-muted-foreground">Scheduled:</span> {fmtDate(wo.scheduledDate)}</p>
            <p><span className="text-muted-foreground">Started:</span> {fmtDate(wo.startedAt)}</p>
            <p><span className="text-muted-foreground">Completed:</span> {fmtDate(wo.completedAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Cost Summary</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Labor Hours</span><span>{wo.laborHours ?? 0}h</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Labor Cost</span><span>{fmt(wo.laborCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Material Cost</span><span>{fmt(wo.materialCost)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total</span><span>{fmt(totalCost)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {wo.description && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle></CardHeader>
          <CardContent className="pt-0"><p className="text-sm whitespace-pre-wrap">{wo.description}</p></CardContent>
        </Card>
      )}

      {/* Materials */}
      {wo.materials && wo.materials.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" /> Materials Used</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wo.materials.map((m: WorkOrderMaterialItem) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.itemName || m.inventoryItemId}</TableCell>
                    <TableCell className="text-right">{m.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(m.unitCost)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(m.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Checklist</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {checklist.map((item, i) => (
              <label key={i} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-lg">
                <input type="checkbox" checked={item.checked} onChange={() => {
                  const updated = [...checklist];
                  updated[i] = { ...updated[i], checked: !updated[i].checked };
                  setChecklist(updated);
                }} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <span className={item.checked ? 'line-through text-muted-foreground' : ''}>{item.text}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Photos & Notes Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Photos</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Photo uploads coming soon
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Textarea placeholder="Add notes..." rows={4} defaultValue={wo.notes || ''} />
            <Button className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">Save Note</Button>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Work Order</DialogTitle></DialogHeader>
          <div><label className="text-sm font-medium">Reason for cancellation</label><Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Enter reason..." rows={3} className="mt-1" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Keep Open</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>{actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Cancel WO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}