'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, UserCheck, AlertCircle, FileText, Wrench, Star,
  CheckCircle2, Clock, Play, Ban, ChevronDown, Loader2,
  MessageSquare, MapPin, Phone, Building2, Package, Send,
  ShieldAlert, Banknote, Lock, RotateCcw, ThumbsUp, ClipboardList,
  CirclePlus, BadgeCheck, Eye, Camera, PenTool, Timer, X, Plus, Trash2,
  Users, RefreshCw, Shield,
} from 'lucide-react';
import { TechnicianAssignmentPanel } from './technician-assignment-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuthStore, useAppStore } from '@/store';
import type { ComplaintItem, ComplaintTimelineEntry, WorkflowAction } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============ HELPERS ============
function getToken(): string { return localStorage.getItem('cmms_token') || ''; }
const API = (url: string, opts?: RequestInit) => fetch(url, {
  ...opts,
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts?.headers },
});

const MAIN_FLOW = [
  'NEW', 'ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS',
  'WAITING_CLIENT_CONFIRMATION', 'CLIENT_CONFIRMED', 'DRAFT_INVOICE',
  'INVOICE_APPROVED', 'INVOICE_SENT', 'PAID', 'CLOSED',
] as const;

const STEP_LABELS: Record<string, string> = {
  NEW: 'New', ASSIGNED: 'Assigned', ACCEPTED: 'Accepted',
  WORK_ORDER_CREATED: 'WO Created', IN_PROGRESS: 'In Progress',
  WAITING_CLIENT_CONFIRMATION: 'Confirmation', CLIENT_CONFIRMED: 'Confirmed',
  DRAFT_INVOICE: 'Draft Invoice', INVOICE_APPROVED: 'Approved',
  INVOICE_SENT: 'Sent', PAID: 'Paid', CLOSED: 'Closed',
  REWORK_REQUIRED: 'Rework',
};

const STEP_COLORS: Record<string, { dot: string; line: string; text: string }> = {
  NEW: { dot: 'bg-slate-400', line: 'bg-slate-200', text: 'text-slate-600' },
  ASSIGNED: { dot: 'bg-blue-500', line: 'bg-blue-200', text: 'text-blue-700' },
  ACCEPTED: { dot: 'bg-cyan-500', line: 'bg-cyan-200', text: 'text-cyan-700' },
  WORK_ORDER_CREATED: { dot: 'bg-indigo-500', line: 'bg-indigo-200', text: 'text-indigo-700' },
  IN_PROGRESS: { dot: 'bg-amber-500', line: 'bg-amber-200', text: 'text-amber-700' },
  WAITING_CLIENT_CONFIRMATION: { dot: 'bg-orange-500', line: 'bg-orange-200', text: 'text-orange-700' },
  CLIENT_CONFIRMED: { dot: 'bg-emerald-500', line: 'bg-emerald-200', text: 'text-emerald-700' },
  DRAFT_INVOICE: { dot: 'bg-violet-500', line: 'bg-violet-200', text: 'text-violet-700' },
  INVOICE_APPROVED: { dot: 'bg-purple-500', line: 'bg-purple-200', text: 'text-purple-700' },
  INVOICE_SENT: { dot: 'bg-sky-500', line: 'bg-sky-200', text: 'text-sky-700' },
  PAID: { dot: 'bg-green-500', line: 'bg-green-200', text: 'text-green-700' },
  CLOSED: { dot: 'bg-zinc-500', line: 'bg-zinc-200', text: 'text-zinc-500' },
  REWORK_REQUIRED: { dot: 'bg-rose-500', line: 'bg-rose-200', text: 'text-rose-700' },
};

function getStepIndex(status: string): number {
  const idx = MAIN_FLOW.indexOf(status as typeof MAIN_FLOW[number]);
  return idx >= 0 ? idx : -1;
}

function StatusBadge({ status }: { status: string }) {
  const c = STEP_COLORS[status] || STEP_COLORS.NEW;
  return (
    <Badge variant="outline" className={cn('px-3 py-1.5 font-semibold border', c.text, STEP_COLORS[status]?.line || 'bg-slate-100')}>
      {STEP_LABELS[status] || status.replace(/_/g, ' ')}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const v: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700 border-gray-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    critical: 'bg-rose-100 text-rose-700 border-rose-300',
  };
  return <Badge variant="outline" className={cn('px-2.5 py-1 font-medium border', v[priority] || '')}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Badge>;
}

function fmtDate(d?: string) { return d ? format(new Date(d), 'MMM d, yyyy HH:mm') : '—'; }
function fmtRelative(d?: string) { return d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : ''; }

function TimelineIcon({ action }: { action: string }) {
  const icons: Record<string, React.ReactNode> = {
    created: <CirclePlus className="h-4 w-4 text-slate-500" />,
    assigned: <UserCheck className="h-4 w-4 text-blue-500" />,
    accepted: <CheckCircle2 className="h-4 w-4 text-cyan-500" />,
    rejected: <Ban className="h-4 w-4 text-rose-500" />,
    started: <Play className="h-4 w-4 text-amber-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    client_confirmed: <ThumbsUp className="h-4 w-4 text-emerald-500" />,
    client_rejected: <RotateCcw className="h-4 w-4 text-rose-500" />,
    rework_required: <RotateCcw className="h-4 w-4 text-rose-500" />,
    invoice_generated: <FileText className="h-4 w-4 text-violet-500" />,
    invoice_approved: <BadgeCheck className="h-4 w-4 text-purple-500" />,
    invoice_sent: <Send className="h-4 w-4 text-sky-500" />,
    payment_received: <Banknote className="h-4 w-4 text-green-500" />,
    closed: <Lock className="h-4 w-4 text-zinc-500" />,
    status_override: <ShieldAlert className="h-4 w-4 text-amber-500" />,
  };
  return icons[action] || <Clock className="h-4 w-4 text-gray-400" />;
}

// ============ MAIN COMPONENT ============
export function ComplaintDetail() {
  const { user } = useAuthStore();
  const { viewParams, setView } = useAppStore();
  const complaintId = viewParams?.id as string;

  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [timeline, setTimeline] = useState<ComplaintTimelineEntry[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  // Dialogs
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [dialogData, setDialogData] = useState<Record<string, unknown>>({});

  // Technician assignment panel state
  const [assignmentPanelOpen, setAssignmentPanelOpen] = useState(false);
  const [reassignPanelOpen, setReassignPanelOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [materials, setMaterials] = useState<Array<{ name: string; qty: string; unit: string; cost: string }>>([]);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [supervisors, setSupervisors] = useState<Array<{ id: string; name: string }>>([]);

  // ============ FETCH ============
  const fetchWorkflow = useCallback(async () => {
    if (!complaintId) return;
    try {
      const res = await fetch(`/api/complaints/${complaintId}/workflow`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setActions(data.availableActions || []);
      setTimeline(data.timeline || []);
      // Merge workflow data into complaint
      if (data.complaint) {
        setComplaint(prev => prev ? { ...prev, ...data.complaint } : prev);
      }
    } catch {
      toast.error('Failed to load workflow data');
    }
  }, [complaintId]);

  const fetchComplaint = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setComplaint(data);
      // Fetch workflow actions + timeline
      await fetchWorkflow();
    } catch {
      toast.error('Failed to load complaint');
      setView('complaints');
    } finally {
      setLoading(false);
    }
  }, [complaintId, fetchWorkflow, setView]);

  const fetchUsers = useCallback(async () => {
    try {
      const [techRes, supRes] = await Promise.all([
        fetch(`/api/employees?role=technician&pageSize=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`/api/employees?role=supervisor&pageSize=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (techRes.ok) { const d = await techRes.json(); setTechnicians((d.data || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))); }
      if (supRes.ok) { const d = await supRes.json(); setSupervisors((d.data || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))); }
    } catch {}
  }, []);

  useEffect(() => { fetchComplaint(); fetchUsers(); }, [fetchComplaint, fetchUsers]);

  // ============ TRANSITION ============
  const executeTransition = async (action: string, body: Record<string, unknown> = {}) => {
    if (!complaintId || transitioning) return;
    setTransitioning(true);
    try {
      const res = await API(`/api/complaints/${complaintId}/workflow`, {
        method: 'POST',
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transition failed');
      toast.success(data.message || 'Action completed');
      setDialogType(null);
      setFormData({});
      setMaterials([]);
      await fetchComplaint();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setTransitioning(false);
    }
  };

  // ============ ACTION HANDLERS ============
  const openDialog = (action: WorkflowAction) => {
    setDialogType(action.action);
    setFormData({});
    setMaterials([{ name: '', qty: '1', unit: 'pcs', cost: '0' }]);
  };

  const handleSubmitAction = () => {
    if (!dialogType) return;
    switch (dialogType) {
      case 'assigned':
        // Use the new TechnicianAssignmentPanel instead
        setDialogType(null);
        setAssignmentPanelOpen(true);
        return;
      case 'reassigned':
        setDialogType(null);
        setReassignPanelOpen(true);
        return;
      case 'accepted':
        executeTransition('accept', { eta: formData.eta });
        break;
      case 'assignment_rejected':
        if (!formData.rejectionReason) { toast.error('Provide a rejection reason'); return; }
        executeTransition('reject', { rejectionReason: formData.rejectionReason });
        break;
      case 'work_started':
        executeTransition('start');
        break;
      case 'work_completed':
        executeTransition('complete', {
          checklistData: formData.checklistData,
          laborHours: parseFloat(formData.laborHours) || 0,
          laborCost: parseFloat(formData.laborCost) || 0,
          materialCost: parseFloat(formData.materialCost) || 0,
          remarks: formData.remarks,
          materialsUsed: JSON.stringify(materials.filter(m => m.name)),
        });
        break;
      case 'client_confirmed':
        executeTransition('client_confirm');
        break;
      case 'rework_requested':
        if (!formData.reworkReason) { toast.error('Provide a reason for rework'); return; }
        executeTransition('client_reject', { reworkReason: formData.reworkReason });
        break;
      case 'rework_started':
        executeTransition('rework');
        break;
      case 'invoice_approved':
        executeTransition('approve_invoice');
        break;
      case 'invoice_sent':
        if (!formData.sentVia) { toast.error('Select a send method'); return; }
        executeTransition('send_invoice', { sentVia: formData.sentVia });
        break;
      case 'invoice_paid':
        if (!formData.paymentMethod) { toast.error('Select payment method'); return; }
        executeTransition('record_payment', {
          paymentMethod: formData.paymentMethod,
          paymentRef: formData.paymentRef,
          paidAt: formData.paidAt || new Date().toISOString(),
        });
        break;
      case 'complaint_closed':
        executeTransition('close');
        break;
      case 'status_override':
        if (!dialogData.targetStatus) { toast.error('Select a status'); return; }
        executeTransition('override', {
          targetStatus: dialogData.targetStatus,
          notes: formData.notes,
        });
        break;
    }
  };

  const addMaterial = () => setMaterials(p => [...p, { name: '', qty: '1', unit: 'pcs', cost: '0' }]);
  const removeMaterial = (i: number) => setMaterials(p => p.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: string, value: string) => {
    setMaterials(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  // ============ RENDER: LOADING ============
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!complaint) return null;

  const currentIdx = getStepIndex(complaint.status);
  const isRework = complaint.status === 'REWORK_REQUIRED';

  // ============ RENDER ============
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('complaints')} className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{complaint.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">ID: {complaint.id.substring(0, 12).toUpperCase()} · Created {fmtRelative(complaint.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          {complaint.category && <Badge variant="outline" className="border-gray-300">{complaint.category}</Badge>}
        </div>
      </div>

      {/* STATUS PROGRESS BAR */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <ScrollArea className="w-full">
            <div className="flex items-center min-w-max gap-0 py-2">
              {MAIN_FLOW.map((step, idx) => {
                const stepIdx = idx;
                const isCompleted = stepIdx < currentIdx;
                const isCurrent = step === complaint.status;
                const sc = STEP_COLORS[step] || STEP_COLORS.NEW;
                return (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5 w-16">
                      <div className={cn(
                        'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        isCompleted ? 'bg-emerald-500 text-white' :
                        isCurrent ? cn(sc.dot, 'ring-4 ring-offset-1', sc.line.replace('bg-', 'ring-')) :
                        'bg-gray-100 text-gray-400 border border-gray-200',
                      )}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Wrench className="h-3.5 w-3.5" /> : <span>{idx + 1}</span>}
                      </div>
                      <span className={cn('text-[10px] font-medium text-center leading-tight', isCurrent ? sc.text : isCompleted ? 'text-emerald-600' : 'text-gray-400')}>
                        {STEP_LABELS[step]}
                      </span>
                    </div>
                    {idx < MAIN_FLOW.length - 1 && (
                      <div className={cn('h-0.5 w-8 mx-0.5', stepIdx < currentIdx ? 'bg-emerald-400' : 'bg-gray-200')} />
                    )}
                  </div>
                );
              })}
              {/* Rework indicator */}
              {isRework && (
                <div className="flex items-center ml-4">
                  <div className="h-7 w-7 rounded-full bg-rose-500 text-white flex items-center justify-center"><RotateCcw className="h-3.5 w-3.5" /></div>
                  <span className="text-[10px] font-medium text-rose-600 ml-1.5">Rework</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* Complaint Info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Complaint Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">{complaint.title}</h3>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{complaint.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Customer:</span><span className="font-medium">{complaint.customerName || '—'}</span></div>
                <div className="flex items-center gap-2"><Package className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Equipment:</span><span className="font-medium">{complaint.equipmentName || '—'}</span></div>
                {complaint.assignedToName && <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-blue-400" /><span className="text-gray-500">Technician:</span><span className="font-medium">{complaint.assignedToName}</span></div>}
                {complaint.supervisorName && <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Supervisor:</span><span className="font-medium">{complaint.supervisorName}</span></div>}
                {complaint.eta && <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-amber-400" /><span className="text-gray-500">ETA:</span><span className="font-medium">{complaint.eta}</span></div>}
              </div>
              {/* Manage Assignment link */}
              {['super_admin','admin','supervisor','manager'].includes(user?.role || '') && (
                <button
                  type="button"
                  onClick={() => setView('complaint-assignment', { id: complaintId })}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Open full assignment screen
                </button>
              )}
              {/* Timestamps */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                <div>Created: {fmtDate(complaint.createdAt)}</div>
                {complaint.acceptedAt && <div>Accepted: {fmtDate(complaint.acceptedAt)}</div>}
                {complaint.startedAt && <div>Started: {fmtDate(complaint.startedAt)}</div>}
                {complaint.completedAt && <div>Completed: {fmtDate(complaint.completedAt)}</div>}
                {complaint.clientConfirmedAt && <div>Confirmed: {fmtDate(complaint.clientConfirmedAt)}</div>}
                {complaint.closedAt && <div>Closed: {fmtDate(complaint.closedAt)}</div>}
              </div>
              {complaint.reworkReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm">
                  <span className="font-medium text-rose-700">Rework Reason:</span>
                  <p className="text-rose-600 mt-1">{complaint.reworkReason}</p>
                </div>
              )}
              {complaint.rejectionReason && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <span className="font-medium text-amber-700">Rejection Reason:</span>
                  <p className="text-amber-600 mt-1">{complaint.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Order Card */}
          {complaint.workOrders && complaint.workOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Work Order
                  </CardTitle>
                  <StatusBadge status={complaint.workOrders[0].status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{complaint.workOrders[0].type}</span></div>
                  <div><span className="text-gray-500">Technician:</span> <span className="font-medium">{complaint.workOrders[0].assignedToName || '—'}</span></div>
                  {complaint.workOrders[0].laborHours != null && <div><span className="text-gray-500">Labor:</span> <span className="font-medium">{complaint.workOrders[0].laborHours}h</span></div>}
                  {complaint.workOrders[0].totalCost != null && <div><span className="text-gray-500">Total Cost:</span> <span className="font-bold text-emerald-700">${complaint.workOrders[0].totalCost?.toFixed(2)}</span></div>}
                </div>
                {complaint.workOrders[0].notes && <p className="text-gray-600 bg-gray-50 rounded p-2">{complaint.workOrders[0].notes}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Action Panel */}
          {actions.filter(a => !a.isAutomatic).length > 0 && (
            <Card className="border-dashed border-2 border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Play className="h-4 w-4 text-emerald-600" /> Available Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {actions.filter(a => !a.isAutomatic && a.action !== 'reassigned').map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className={cn('w-full justify-start gap-2 h-10', action.color, 'border-current/20 hover:opacity-80')}
                    onClick={() => openDialog(action)}
                    disabled={transitioning}
                  >
                    {action.label}
                    {transitioning && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" />}
                  </Button>
                ))}
                {/* Reassign button — show separately for ASSIGNED status */}
                {complaint.status === 'ASSIGNED' && complaint.assignedToId && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-10 text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => setReassignPanelOpen(true)}
                    disabled={transitioning}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reassign Technician
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px] pr-2">
                <div className="relative space-y-0">
                  {timeline.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>}
                  {timeline.map((entry, idx) => (
                    <div key={entry.id} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="mt-1"><TimelineIcon action={entry.action} /></div>
                        {idx < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm font-medium text-gray-800">{entry.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {entry.performedByName && (
                            <span className="text-xs text-gray-500">{entry.performedByName}</span>
                          )}
                          {entry.performedByRole && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{entry.performedByRole}</Badge>
                          )}
                          <span className="text-[11px] text-gray-400">{fmtRelative(entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============ TECHNICIAN ASSIGNMENT PANEL ============ */}
      <TechnicianAssignmentPanel
        complaintId={complaintId}
        isReassignment={!!complaint?.assignedToId}
        currentTechnicianName={complaint?.assignedToName}
        onSuccess={async () => {
          await fetchComplaint();
        }}
        open={assignmentPanelOpen}
        onOpenChange={setAssignmentPanelOpen}
      />

      {/* ============ TECHNICIAN REASSIGNMENT PANEL ============ */}
      <TechnicianAssignmentPanel
        complaintId={complaintId}
        isReassignment={true}
        currentTechnicianName={complaint?.assignedToName}
        onSuccess={async () => {
          await fetchComplaint();
        }}
        open={reassignPanelOpen}
        onOpenChange={setReassignPanelOpen}
      />

      {/* ============ DIALOGS ============ */}
      <AnimatePresence>
        {/* ASSIGN DIALOG — kept as lightweight fallback, but primary flow uses TechnicianAssignmentPanel */}
        {dialogType === 'assigned' && !assignmentPanelOpen && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Assign Technician</DialogTitle><DialogDescription>Select a technician and supervisor for this complaint.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Technician *</Label><Select value={formData.assignedToId} onValueChange={v => setFormData(p => ({ ...p, assignedToId: v }))}><SelectTrigger><SelectValue placeholder="Select technician..." /></SelectTrigger><SelectContent>{technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Supervisor</Label><Select value={formData.supervisorId} onValueChange={v => setFormData(p => ({ ...p, supervisorId: v }))}><SelectTrigger><SelectValue placeholder="Select supervisor..." /></SelectTrigger><SelectContent>{supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ACCEPT DIALOG */}
        {dialogType === 'accepted' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Accept Assignment</DialogTitle><DialogDescription>Confirm you will handle this complaint.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Estimated Time of Arrival</Label><Input placeholder="e.g., 30 minutes" value={formData.eta} onChange={e => setFormData(p => ({ ...p, eta: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* REJECT DIALOG */}
        {dialogType === 'assignment_rejected' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Reject Assignment</DialogTitle><DialogDescription>Provide a reason for rejecting this assignment.</DialogDescription></DialogHeader>
              <div className="py-2"><Label>Reason *</Label><Textarea rows={3} value={formData.rejectionReason} onChange={e => setFormData(p => ({ ...p, rejectionReason: e.target.value }))} placeholder="Why are you rejecting this assignment?" /></div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button variant="destructive" onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* START DIALOG */}
        {dialogType === 'work_started' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Start Work</DialogTitle><DialogDescription>Confirm you are starting work on this complaint.</DialogDescription></DialogHeader>
              <div className="py-2 text-sm text-gray-600">This will record the start time and notify the customer.</div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Work'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* COMPLETE WORK DIALOG */}
        {dialogType === 'work_completed' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Complete Work</DialogTitle><DialogDescription>Fill in the work details, checklist, and costs.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Checklist / Completion Notes</Label><Textarea rows={4} value={formData.checklistData} onChange={e => setFormData(p => ({ ...p, checklistData: e.target.value }))} placeholder="List completed tasks and inspection results..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Labor Hours</Label><Input type="number" step="0.5" value={formData.laborHours} onChange={e => setFormData(p => ({ ...p, laborHours: e.target.value }))} /></div>
                  <div><Label>Labor Cost ($)</Label><Input type="number" step="0.01" value={formData.laborCost} onChange={e => setFormData(p => ({ ...p, laborCost: e.target.value }))} /></div>
                </div>
                <div><Label>Material Cost ($)</Label><Input type="number" step="0.01" value={formData.materialCost} onChange={e => setFormData(p => ({ ...p, materialCost: e.target.value }))} /></div>
                <div>
                  <div className="flex items-center justify-between mb-2"><Label>Materials Used</Label><Button size="sm" variant="outline" onClick={addMaterial}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
                  <div className="space-y-2">
                    {materials.map((m, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input className="flex-1" placeholder="Item name" value={m.name} onChange={e => updateMaterial(i, 'name', e.target.value)} />
                        <Input className="w-16" placeholder="Qty" value={m.qty} onChange={e => updateMaterial(i, 'qty', e.target.value)} />
                        <Input className="w-16" placeholder="Unit" value={m.unit} onChange={e => updateMaterial(i, 'unit', e.target.value)} />
                        <Input className="w-20" placeholder="Cost" value={m.cost} onChange={e => updateMaterial(i, 'cost', e.target.value)} />
                        <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => removeMaterial(i)}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div><Label>Remarks</Label><Textarea rows={2} value={formData.remarks} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))} placeholder="Additional remarks..." /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete Work'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* CLIENT CONFIRM DIALOG */}
        {dialogType === 'client_confirmed' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Confirm Completion</DialogTitle><DialogDescription>Confirm the work has been completed to your satisfaction.</DialogDescription></DialogHeader>
              <div className="py-2 text-sm text-gray-600">This will generate a draft invoice and notify the finance team.</div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Completion'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* CLIENT REJECT / REWORK DIALOG */}
        {(dialogType === 'rework_requested' || dialogType === 'rework_started') && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{dialogType === 'rework_requested' ? 'Request Rework' : 'Start Rework'}</DialogTitle>
                <DialogDescription>{dialogType === 'rework_requested' ? 'Describe what needs to be fixed.' : 'Confirm you are starting the rework.'}</DialogDescription>
              </DialogHeader>
              {dialogType === 'rework_requested' && (
                <div className="py-2"><Label>Reason *</Label><Textarea rows={3} value={formData.reworkReason} onChange={e => setFormData(p => ({ ...p, reworkReason: e.target.value }))} placeholder="What needs to be reworked?" /></div>
              )}
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button variant={dialogType === 'rework_requested' ? 'destructive' : 'default'} onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : dialogType === 'rework_requested' ? 'Request Rework' : 'Start Rework'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* APPROVE INVOICE DIALOG */}
        {dialogType === 'invoice_approved' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Approve Invoice</DialogTitle><DialogDescription>Review and approve the draft invoice.</DialogDescription></DialogHeader>
              <div className="py-2 text-sm text-gray-600">Once approved, the invoice can be sent to the customer.</div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* SEND INVOICE DIALOG */}
        {dialogType === 'invoice_sent' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Send Invoice to Customer</DialogTitle><DialogDescription>Choose how to deliver the invoice.</DialogDescription></DialogHeader>
              <div className="py-2">
                <Label>Send Via *</Label>
                <Select value={formData.sentVia} onValueChange={v => setFormData(p => ({ ...p, sentVia: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="portal">Customer Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invoice'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* RECORD PAYMENT DIALOG */}
        {dialogType === 'invoice_paid' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Record the payment received from the customer.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Payment Method *</Label><Select value={formData.paymentMethod} onValueChange={v => setFormData(p => ({ ...p, paymentMethod: v }))}><SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger><SelectContent><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                <div><Label>Payment Reference</Label><Input value={formData.paymentRef} onChange={e => setFormData(p => ({ ...p, paymentRef: e.target.value }))} placeholder="Transaction ID / Reference" /></div>
                <div><Label>Payment Date</Label><Input type="date" value={formData.paidAt ? formData.paidAt.split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, paidAt: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* CLOSE DIALOG */}
        {dialogType === 'complaint_closed' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Close Complaint</DialogTitle><DialogDescription>Are you sure you want to close this complaint? This action locks the work order and archives everything.</DialogDescription></DialogHeader>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button variant="destructive" onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Close Complaint'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* STATUS OVERRIDE DIALOG */}
        {dialogType === 'status_override' && (
          <Dialog open onOpenChange={() => setDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /> Override Status</DialogTitle><DialogDescription>Force-transition to any status. This will be audited.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Target Status *</Label><Select onValueChange={v => setDialogData(p => ({ ...p, targetStatus: v }))}><SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger><SelectContent>{[...MAIN_FLOW, 'REWORK_REQUIRED'].map(s => <SelectItem key={s} value={s}>{STEP_LABELS[s] || s}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Notes</Label><Textarea rows={2} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Reason for override..." /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button><Button variant="destructive" onClick={handleSubmitAction} disabled={transitioning}>{transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Override'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}