'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Phone,
  MessageCircle,
  FileText,
  Wrench,
  MapPin,
  Calendar,
  Building2,
  Layers,
  ImageIcon,
  MessageSquare,
  Loader2,
  Check,
  X,
  Clock,
  Play,
  Ban,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/shared/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';

// ============ HELPERS ============
function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function generateComplaintRef(createdAt: string): string {
  const d = new Date(createdAt);
  const year = d.getFullYear();
  const dayOfYear = Math.ceil(
    (d.getTime() - new Date(year, 0, 1).getTime()) / 86400000
  );
  return `CMP-${year}-${String(dayOfYear).padStart(3, '0')}`;
}

const STATUS_STEPS = [
  { key: 'NEW', label: 'Complaint Created' },
  { key: 'ASSIGNED', label: 'Technician Assigned' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'WORK_ORDER_CREATED', label: 'Work Order' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'WAITING_CLIENT_CONFIRMATION', label: 'Pending Review' },
  { key: 'CLIENT_CONFIRMED', label: 'Client Confirmed' },
  { key: 'REWORK_REQUIRED', label: 'Rework Required' },
  { key: 'DRAFT_INVOICE', label: 'Draft Invoice' },
  { key: 'INVOICE_APPROVED', label: 'Invoice Approved' },
  { key: 'INVOICE_SENT', label: 'Invoice Sent' },
  { key: 'PAID', label: 'Paid' },
  { key: 'CLOSED', label: 'Closed' },
] as const;

const STATUS_ORDER = ['NEW', 'ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS', 'PAUSED', 'WAITING_CLIENT_CONFIRMATION', 'CLIENT_CONFIRMED', 'REWORK_REQUIRED', 'DRAFT_INVOICE', 'INVOICE_APPROVED', 'INVOICE_SENT', 'PAID', 'CLOSED'];

function getStepStatus(stepKey: string, complaintStatus: string): 'completed' | 'current' | 'pending' {
  const stepIdx = STATUS_STEPS.findIndex(s => s.key === stepKey);
  const currentIdx = STATUS_ORDER.indexOf(complaintStatus);
  if (stepIdx < 0) return 'pending';
  if (currentIdx < 0) return 'pending';
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700 border-slate-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-300',
  ACCEPTED: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  WORK_ORDER_CREATED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-300',
  WAITING_CLIENT_CONFIRMATION: 'bg-orange-100 text-orange-700 border-orange-300',
  CLIENT_CONFIRMED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  DRAFT_INVOICE: 'bg-violet-100 text-violet-700 border-violet-300',
  INVOICE_APPROVED: 'bg-purple-100 text-purple-700 border-purple-300',
  INVOICE_SENT: 'bg-sky-100 text-sky-700 border-sky-300',
  PAID: 'bg-green-100 text-green-700 border-green-300',
  CLOSED: 'bg-zinc-100 text-zinc-500 border-zinc-300',
  REWORK_REQUIRED: 'bg-rose-100 text-rose-700 border-rose-300',
};

const REJECT_REASONS = [
  'Sick Leave',
  'On Another Job',
  'Wrong Assignment',
  'No Required Skills',
  'No Spare Parts Available',
  'Emergency',
  'Other',
];

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePhotos(photos?: string | null): string[] {
  if (!photos) return [];
  try {
    const parsed = JSON.parse(photos);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============ ACTION BUTTON CONFIG ============
interface WorkflowAction {
  action: string;
  targetStatus: string;
  label: string;
  icon: string;
  color: string;
  requiredFields?: string[];
  isAutomatic?: boolean;
}

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  accepted: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', icon: <CheckCircle2 className="size-4" /> },
  assignment_rejected: { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-600', icon: <Ban className="size-4" /> },
  work_started: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600', icon: <Play className="size-4" /> },
  work_completed: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', icon: <CheckCircle2 className="size-4" /> },
  client_confirmed: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', icon: <CheckCircle2 className="size-4" /> },
  rework_requested: { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-600', icon: <AlertTriangle className="size-4" /> },
  rework_started: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600', icon: <Play className="size-4" /> },
  invoice_approved: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600', icon: <CheckCircle2 className="size-4" /> },
  invoice_sent: { bg: 'bg-sky-600', text: 'text-white', border: 'border-sky-600', icon: <FileText className="size-4" /> },
  invoice_paid: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-600', icon: <CheckCircle2 className="size-4" /> },
  complaint_closed: { bg: 'bg-zinc-600', text: 'text-white', border: 'border-zinc-600', icon: <CheckCircle2 className="size-4" /> },
  assigned: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-600', icon: <Layers className="size-4" /> },
  status_override: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600', icon: <AlertTriangle className="size-4" /> },
};

// ============ MAIN COMPONENT ============
export function MobileComplaintDetail() {
  const { viewParams, setView } = useAppStore();
  const { user } = useAuthStore();
  const complaintId = viewParams?.id as string;

  const [complaint, setComplaint] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workflow state
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [materials, setMaterials] = useState<Array<{ name: string; qty: string; unit: string; cost: string }>>([]);

  // ============ FETCH ============
  const fetchWorkflow = useCallback(async () => {
    if (!complaintId) return;
    try {
      const res = await fetch(`/api/complaints/${complaintId}/workflow`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setActions(data.availableActions || []);
      if (data.complaint) {
        setComplaint(prev => prev ? { ...prev, ...data.complaint } : prev);
      }
    } catch {
      // Silent — workflow fetch failure shouldn't break the page
    }
  }, [complaintId]);

  const fetchComplaint = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('You do not have access to this complaint');
        throw new Error('Complaint not found');
      }
      const data = await res.json();
      setComplaint(data);
      await fetchWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  }, [complaintId, fetchWorkflow]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  // ============ TRANSITION ============
  const executeTransition = async (action: string, body: Record<string, unknown> = {}) => {
    if (!complaintId || transitioning) return;
    setTransitioning(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      toast.success(data.message || 'Action completed');
      setDialogType(null);
      setFormData({});
      setMaterials([{ name: '', qty: '1', unit: 'pcs', cost: '0' }]);
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
    if (action.action === 'work_completed') {
      setMaterials([{ name: '', qty: '1', unit: 'pcs', cost: '0' }]);
    }
  };

  const handleSubmitAction = () => {
    if (!dialogType) return;
    switch (dialogType) {
      case 'accepted':
        executeTransition('accept', { eta: formData.eta });
        break;
      case 'assignment_rejected':
        if (!formData.rejectionReason) { toast.error('Please provide a rejection reason'); return; }
        executeTransition('reject', { rejectionReason: formData.rejectionReason });
        break;
      case 'work_started':
        executeTransition('start');
        break;
      case 'work_completed':
        if (!formData.remarks) { toast.error('Please provide work remarks'); return; }
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
        if (!formData.reworkReason) { toast.error('Please provide a reason for rework'); return; }
        executeTransition('client_reject', { reworkReason: formData.reworkReason });
        break;
      case 'rework_started':
        executeTransition('rework');
        break;
      case 'invoice_approved':
        executeTransition('approve_invoice');
        break;
      case 'invoice_sent':
        if (!formData.sentVia) { toast.error('Please select a send method'); return; }
        executeTransition('send_invoice', { sentVia: formData.sentVia });
        break;
      case 'invoice_paid':
        if (!formData.paymentMethod) { toast.error('Please select a payment method'); return; }
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
        if (!formData.targetStatus) { toast.error('Please select a target status'); return; }
        executeTransition('override', { targetStatus: formData.targetStatus, notes: formData.notes });
        break;
      default:
        toast.info('This action opens a desktop-only dialog');
        setDialogType(null);
    }
  };

  const addMaterial = () => setMaterials(p => [...p, { name: '', qty: '1', unit: 'pcs', cost: '0' }]);
  const removeMaterial = (i: number) => setMaterials(p => p.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: string, value: string) => {
    setMaterials(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3 pb-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // ============ ERROR STATE ============
  if (error || !complaint) {
    return (
      <div className="space-y-4 pb-4">
        <button
          onClick={() => setView('complaints')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-5" />
          <span>Back to Complaints</span>
        </button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center text-sm text-red-600">
            {error || 'Complaint not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ DATA ============
  const status = (complaint.status as string) || 'NEW';
  const title = (complaint.title as string) || '';
  const description = (complaint.description as string) || '';
  const createdAt = (complaint.createdAt as string) || '';
  const customerName = (complaint.customerName as string) || '';
  const equipmentName = (complaint.equipmentName as string) || '';
  const assignedToName = (complaint.assignedToName as string) || '';
  const category = (complaint.category as string) || '';
  const priority = (complaint.priority as string) || 'medium';
  const photos = parsePhotos(complaint.photos as string | null);
  const refNumber = generateComplaintRef(createdAt);
  const workOrders = (complaint.workOrders as Array<Record<string, unknown>>) || [];

  // Filter to show only non-automatic actions (hide reassigned — it opens a desktop-only panel)
  const visibleActions = actions.filter(a => !a.isAutomatic && a.action !== 'reassigned');

  return (
    <div className="space-y-5 pb-4">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 pb-1">
        <button
          onClick={() => setView('complaints')}
          className="flex size-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Back to complaints"
        >
          <ArrowLeft className="size-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Complaint Details</h1>
      </div>

      {/* ─── Status Badge + Priority ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
      >
        <Badge
          variant="outline"
          className={cn(
            'px-3 py-1.5 text-xs font-semibold border',
            STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.NEW
          )}
        >
          {statusLabel(status)}
        </Badge>
        <Badge variant="outline" className={cn(
          'px-2.5 py-1 text-[10px] font-medium border capitalize',
          priority === 'critical' ? 'bg-rose-100 text-rose-700 border-rose-300' :
          priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-300' :
          priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-300' :
          'bg-gray-100 text-gray-600 border-gray-300'
        )}>
          {priority}
        </Badge>
      </motion.div>

      {/* ─── Info Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Complaint Ref</span>
              <span className="text-sm font-bold text-emerald-700">{refNumber}</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{title}</h2>
            <div className="space-y-2">
              {customerName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="size-4 text-gray-400 shrink-0" />
                  <span>{customerName}</span>
                </div>
              )}
              {equipmentName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Layers className="size-4 text-gray-400 shrink-0" />
                  <span>{equipmentName}</span>
                </div>
              )}
              {category && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="size-4 text-gray-400 shrink-0" />
                  <span>{category}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="size-4 text-gray-400 shrink-0" />
                <span>{createdAt ? format(new Date(createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Description ─── */}
      {description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Status Timeline ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Status Timeline</h3>
            <div className="relative pl-8">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
              {STATUS_STEPS.map((step) => {
                const stepState = getStepStatus(step.key, status);
                const isCompleted = stepState === 'completed';
                const isCurrent = stepState === 'current';
                return (
                  <div key={step.key} className="relative pb-5 last:pb-0">
                    <div
                      className={cn(
                        'absolute -left-8 top-0.5 flex size-6 items-center justify-center rounded-full border-2',
                        isCompleted && 'border-emerald-500 bg-emerald-500',
                        isCurrent && 'border-emerald-500 bg-white',
                        !isCompleted && !isCurrent && 'border-gray-300 bg-white'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-4 text-white" />
                      ) : isCurrent ? (
                        <div className="size-2 rounded-full bg-emerald-500" />
                      ) : (
                        <Circle className="size-3 text-gray-300" />
                      )}
                    </div>
                    <div className="pt-0">
                      <p className={cn('text-sm font-medium', isCompleted ? 'text-emerald-700' : isCurrent ? 'text-gray-900' : 'text-gray-400')}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Assigned Technician Card ─── */}
      {assignedToName && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Assigned Technician</h3>
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {assignedToName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{assignedToName}</p>
                  <p className="text-xs text-gray-500">Technician</p>
                </div>
                <Button size="icon" variant="ghost" className="size-9 text-emerald-600" aria-label="Call technician" onClick={() => toast.info('Calling technician...')}>
                  <Phone className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Attachments ─── */}
      {photos.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }}>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Attachments</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, idx) => (
                  <div key={idx} className="shrink-0 size-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                      <img src={url} alt={`Attachment ${idx + 1}`} className="size-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="flex flex-col items-center justify-center size-full gap-1 p-1">
                        <FileText className="size-5 text-gray-400" />
                        <span className="text-[9px] text-gray-400 truncate max-w-[60px]">{url.split('/').pop() || 'File'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Linked Work Orders ─── */}
      {workOrders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.28 }}>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Work Orders ({workOrders.length})</h3>
              <div className="space-y-2">
                {workOrders.map((wo) => (
                  <button key={wo.id as string} onClick={() => setView('work-order-detail', { id: wo.id as string })} className="w-full flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left active:bg-gray-100 transition-colors">
                    <Wrench className="size-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{wo.title as string}</p>
                      <p className="text-xs text-gray-500">{statusLabel(wo.status as string)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          WORKFLOW ACTION BUTTONS — The core addition
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="space-y-3"
      >
        {/* ─── Primary Workflow Actions ─── */}
        {visibleActions.length > 0 && (
          <Card className="border-dashed border-2 border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Play className="size-4 text-emerald-600" />
                <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Available Actions</h3>
              </div>

              {/* Two-column grid for action buttons */}
              <div className="grid grid-cols-1 gap-2">
                {visibleActions.map((action, i) => {
                  const style = ACTION_STYLES[action.action] || ACTION_STYLES.assigned;
                  return (
                    <Button
                      key={i}
                      className={cn(
                        'w-full justify-start gap-2.5 h-11 font-medium text-sm',
                        style.bg, style.text
                      )}
                      onClick={() => openDialog(action)}
                      disabled={transitioning}
                    >
                      {style.icon}
                      {action.label}
                      {transitioning && <Loader2 className="size-3.5 animate-spin ml-auto" />}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Secondary Actions (always visible) ─── */}
        <div className="space-y-2">
          {assignedToName && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full" onClick={() => toast.info('Calling technician...')}>
                <Phone className="size-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 w-full" onClick={() => toast.info('Opening WhatsApp...')}>
                <MessageSquare className="size-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          )}
          {workOrders.length > 0 && (
            <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setView('work-order-detail', { id: workOrders[0].id as string })}>
              <FileText className="size-4 mr-2" />
              View Work Order
            </Button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          WORKFLOW DIALOGS
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {/* ─── ACCEPT DIALOG ─── */}
        {dialogType === 'accepted' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  Accept Complaint
                </DialogTitle>
                <DialogDescription>Confirm you will handle this complaint. You can optionally provide an ETA.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-sm">Estimated Time of Arrival</Label>
                  <Input
                    placeholder="e.g., 30 minutes, 1 hour"
                    value={formData.eta || ''}
                    onChange={e => setFormData(p => ({ ...p, eta: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitAction} disabled={transitioning}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4 mr-1.5" />Accept Complaint</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── REJECT DIALOG ─── */}
        {dialogType === 'assignment_rejected' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-rose-100 flex items-center justify-center">
                    <Ban className="size-4 text-rose-600" />
                  </div>
                  Reject Complaint
                </DialogTitle>
                <DialogDescription>Provide a reason for rejecting this assignment.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-sm">Quick Select Reason</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {REJECT_REASONS.map(reason => (
                      <button
                        key={reason}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-full border transition-colors',
                          formData.rejectionReason === reason
                            ? 'bg-rose-100 border-rose-300 text-rose-700 font-medium'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        )}
                        onClick={() => setFormData(p => ({ ...p, rejectionReason: reason }))}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Additional Details (optional)</Label>
                  <Textarea
                    rows={2}
                    value={formData.rejectionDetails || ''}
                    onChange={e => setFormData(p => ({ ...p, rejectionDetails: e.target.value }))}
                    placeholder="Any additional context..."
                    className="mt-1.5"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleSubmitAction} disabled={transitioning || !formData.rejectionReason}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : <><X className="size-4 mr-1.5" />Reject Assignment</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── START WORK DIALOG ─── */}
        {dialogType === 'work_started' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Play className="size-4 text-amber-600" />
                  </div>
                  Start Work
                </DialogTitle>
                <DialogDescription>Confirm you are starting work on this complaint. The customer will be notified.</DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <Clock className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Work timer will start</p>
                    <p className="text-amber-600 mt-0.5">The start time will be recorded and the customer will receive a notification.</p>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSubmitAction} disabled={transitioning}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : <><Play className="size-4 mr-1.5" />Start Work</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── COMPLETE WORK DIALOG ─── */}
        {dialogType === 'work_completed' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  Complete Work
                </DialogTitle>
                <DialogDescription>Fill in the work details, costs, and materials used.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-sm">Completion Notes / Checklist *</Label>
                  <Textarea
                    rows={3}
                    value={formData.checklistData || ''}
                    onChange={e => setFormData(p => ({ ...p, checklistData: e.target.value }))}
                    placeholder="List completed tasks and inspection results..."
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Labor Hours</Label>
                    <Input type="number" step="0.5" min="0" placeholder="0" value={formData.laborHours || ''} onChange={e => setFormData(p => ({ ...p, laborHours: e.target.value }))} className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-sm">Labor Cost ($)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={formData.laborCost || ''} onChange={e => setFormData(p => ({ ...p, laborCost: e.target.value }))} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Material Cost ($)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={formData.materialCost || ''} onChange={e => setFormData(p => ({ ...p, materialCost: e.target.value }))} className="mt-1.5" />
                </div>

                {/* Materials Used */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Materials Used</Label>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addMaterial}>
                      <Plus className="size-3 mr-1" />Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {materials.map((m, i) => (
                      <div key={i} className="flex gap-1.5 items-center">
                        <Input className="flex-1 h-8 text-xs" placeholder="Item" value={m.name} onChange={e => updateMaterial(i, 'name', e.target.value)} />
                        <Input className="w-12 h-8 text-xs text-center" placeholder="Qty" value={m.qty} onChange={e => updateMaterial(i, 'qty', e.target.value)} />
                        <Input className="w-14 h-8 text-xs text-center" placeholder="Cost" value={m.cost} onChange={e => updateMaterial(i, 'cost', e.target.value)} />
                        <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={() => removeMaterial(i)}>
                          <Trash2 className="size-3 text-rose-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Remarks *</Label>
                  <Textarea
                    rows={2}
                    value={formData.remarks || ''}
                    onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                    placeholder="Additional remarks..."
                    className="mt-1.5"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitAction} disabled={transitioning}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4 mr-1.5" />Complete Work</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── CLIENT CONFIRM DIALOG ─── */}
        {dialogType === 'client_confirmed' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  Confirm Completion
                </DialogTitle>
                <DialogDescription>Confirm that the work has been completed to your satisfaction.</DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-emerald-800">
                    <p className="font-medium">This will confirm the service is complete</p>
                    <p className="text-emerald-600 mt-0.5">An invoice will be generated automatically.</p>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitAction} disabled={transitioning}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : 'Confirm'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── REWORK REQUEST DIALOG ─── */}
        {dialogType === 'rework_requested' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertTriangle className="size-4 text-rose-600" />
                  </div>
                  Request Rework
                </DialogTitle>
                <DialogDescription>Describe what needs to be fixed or redone.</DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Textarea rows={3} value={formData.reworkReason || ''} onChange={e => setFormData(p => ({ ...p, reworkReason: e.target.value }))} placeholder="What needs to be reworked?" />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleSubmitAction} disabled={transitioning || !formData.reworkReason}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : 'Request Rework'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── REWORK START DIALOG ─── */}
        {dialogType === 'rework_started' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Start Rework</DialogTitle>
                <DialogDescription>Confirm you are starting the rework on this complaint.</DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSubmitAction} disabled={transitioning}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : <><Play className="size-4 mr-1.5" />Start Rework</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── APPROVE INVOICE DIALOG ─── */}
        {dialogType === 'invoice_approved' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Approve Invoice</DialogTitle><DialogDescription>Approve the draft invoice for this complaint.</DialogDescription></DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSubmitAction} disabled={transitioning}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : 'Approve'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── SEND INVOICE DIALOG ─── */}
        {dialogType === 'invoice_sent' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Send Invoice</DialogTitle><DialogDescription>Choose how to send the invoice to the customer.</DialogDescription></DialogHeader>
              <div className="py-2 space-y-2">
                {['email', 'whatsapp', 'portal', 'manual'].map(method => (
                  <button
                    key={method}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                      formData.sentVia === method
                        ? 'border-sky-400 bg-sky-50 text-sky-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                    onClick={() => setFormData(p => ({ ...p, sentVia: method }))}
                  >
                    {method === 'email' && <FileText className="size-4" />}
                    {method === 'whatsapp' && <MessageSquare className="size-4" />}
                    {method === 'portal' && <Layers className="size-4" />}
                    {method === 'manual' && <Package className="size-4" />}
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-sky-600 hover:bg-sky-700" onClick={handleSubmitAction} disabled={transitioning || !formData.sentVia}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : 'Send Invoice'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── RECORD PAYMENT DIALOG ─── */}
        {dialogType === 'invoice_paid' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Record the payment for this invoice.</DialogDescription></DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label className="text-sm">Payment Method</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['cash', 'bank_transfer', 'cheque', 'online'].map(method => (
                      <button
                        key={method}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-full border transition-colors',
                          formData.paymentMethod === method
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700 font-medium'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        )}
                        onClick={() => setFormData(p => ({ ...p, paymentMethod: method }))}
                      >
                        {method.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Reference Number</Label>
                  <Input placeholder="e.g., TXN-12345" value={formData.paymentRef || ''} onChange={e => setFormData(p => ({ ...p, paymentRef: e.target.value }))} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmitAction} disabled={transitioning || !formData.paymentMethod}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : 'Record Payment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── CLOSE COMPLAINT DIALOG ─── */}
        {dialogType === 'complaint_closed' && (
          <Dialog open onOpenChange={(open) => { if (!open) setDialogType(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Close Complaint</DialogTitle><DialogDescription>Are you sure you want to close this complaint? This action cannot be undone.</DialogDescription></DialogHeader>
              <div className="py-2">
                <div className="rounded-lg bg-zinc-100 border border-zinc-200 p-3 flex items-start gap-2">
                  <AlertTriangle className="size-4 text-zinc-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-600">This complaint will be permanently closed and archived.</p>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogType(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleSubmitAction} disabled={transitioning}>
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> : 'Close Complaint'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}