'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Phone,
  FileText,
  Wrench,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  Layers,
  ImageIcon,
  StickyNote,
  Link as LinkIcon,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';

// ============ HELPERS ============
function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function generateWoRef(createdAt: string): string {
  const d = new Date(createdAt);
  const year = d.getFullYear();
  const dayOfYear = Math.ceil(
    (d.getTime() - new Date(year, 0, 1).getTime()) / 86400000
  );
  return `WO-${year}-${String(dayOfYear).padStart(3, '0')}`;
}

const WO_STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

const WO_STATUS_ORDER = ['DRAFT', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'];

function getWoStepStatus(stepKey: string, woStatus: string): 'completed' | 'current' | 'pending' {
  const stepIdx = WO_STEPS.findIndex(s => s.key === stepKey);
  const currentIdx = WO_STATUS_ORDER.indexOf(woStatus);
  // Treat CLOSED/ACCEPTED as same level or higher
  const effectiveIdx = woStatus === 'CLOSED' || woStatus === 'CANCELLED' ? WO_STATUS_ORDER.length : currentIdx;
  if (stepIdx < effectiveIdx) return 'completed';
  if (stepIdx === effectiveIdx || (effectiveIdx < 0 && stepIdx === 0)) return 'current';
  return 'pending';
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-300',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-300',
  ACCEPTED: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  IN_PROGRESS: 'bg-orange-100 text-orange-700 border-orange-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  CLOSED: 'bg-zinc-100 text-zinc-500 border-zinc-300',
  CANCELLED: 'bg-rose-100 text-rose-600 border-rose-300',
};

const PRIORITY_STYLES: Record<string, string> = {
  emergency: 'bg-rose-100 text-rose-700 border-rose-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  low: 'bg-gray-100 text-gray-600 border-gray-300',
};

function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

function parseMaterials(materials?: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (!materials || !Array.isArray(materials)) return [];
  return materials;
}

// ============ MAIN COMPONENT ============
export function MobileWorkOrderDetail() {
  const { viewParams, setView } = useAppStore();
  const workOrderId = viewParams?.id as string;

  const [workOrder, setWorkOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkOrder = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Work order not found');
      const data = await res.json();
      setWorkOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3 pb-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // ============ ERROR STATE ============
  if (error || !workOrder) {
    return (
      <div className="space-y-4 pb-4">
        <button
          onClick={() => setView('work-orders')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-5" />
          <span>Back to Work Orders</span>
        </button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center text-sm text-red-600">
            {error || 'Work order not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ DATA ============
  const status = (workOrder.status as string) || 'DRAFT';
  const title = (workOrder.title as string) || '';
  const description = (workOrder.description as string) || '';
  const priority = (workOrder.priority as string) || 'medium';
  const type = (workOrder.type as string) || 'corrective';
  const createdAt = (workOrder.createdAt as string) || '';
  const scheduledDate = (workOrder.scheduledDate as string) || '';
  const startedAt = (workOrder.startedAt as string) || '';
  const completedAt = (workOrder.completedAt as string) || '';
  const notes = (workOrder.notes as string) || '';
  const assignedToName = (workOrder.assignedToName as string) || '';
  const creatorName = (workOrder.creatorName as string) || '';
  const equipmentName = (workOrder.equipmentName as string) || '';
  const complaintId = (workOrder.complaintId as string) || '';
  const totalCost = workOrder.totalCost as number | null;
  const laborHours = workOrder.laborHours as number | null;
  const photos = parsePhotos(workOrder.photos as string | null);
  const materials = parseMaterials(workOrder.materials as Array<Record<string, unknown>>);
  const refNumber = generateWoRef(createdAt);

  return (
    <div className="space-y-5 pb-4">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 pb-1">
        <button
          onClick={() => setView('work-orders')}
          className="flex size-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Back to work orders"
        >
          <ArrowLeft className="size-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Work Order Details</h1>
      </div>

      {/* ─── Status & Priority Badges ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 flex-wrap"
      >
        <Badge
          variant="outline"
          className={cn(
            'px-3 py-1.5 text-xs font-semibold border',
            STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.DRAFT
          )}
        >
          {statusLabel(status)}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            'px-3 py-1.5 text-xs font-semibold border',
            PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium
          )}
        >
          {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium border-gray-200 text-gray-500">
          {type.charAt(0).toUpperCase() + type.slice(1)}
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
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Work Order Ref</span>
              <span className="text-sm font-bold text-emerald-700">{refNumber}</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{title}</h2>
            <div className="space-y-2">
              {complaintId && (
                <button
                  onClick={() => setView('complaint-detail', { id: complaintId })}
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 w-full text-left"
                >
                  <LinkIcon className="size-4 shrink-0" />
                  <span className="truncate">Linked Complaint: {complaintId.slice(0, 8)}...</span>
                </button>
              )}
              {equipmentName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Layers className="size-4 text-gray-400 shrink-0" />
                  <span className="truncate">{equipmentName}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="size-4 text-gray-400 shrink-0" />
                <span>{createdAt ? format(new Date(createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
              </div>
              {scheduledDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="size-4 text-gray-400 shrink-0" />
                  <span>Scheduled: {format(new Date(scheduledDate), 'MMM d, yyyy')}</span>
                </div>
              )}
              {laborHours != null && laborHours > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="size-4 text-gray-400 shrink-0" />
                  <span>Labor: {laborHours}h</span>
                </div>
              )}
              {totalCost != null && totalCost > 0 && (
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <span>Total Cost: B$ {totalCost.toFixed(2)}</span>
                </div>
              )}
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

      {/* ─── Technician Info ─── */}
      {(assignedToName || creatorName) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Team</h3>
              {assignedToName && (
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      {assignedToName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{assignedToName}</p>
                    <p className="text-xs text-gray-500">Assigned Technician</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 text-emerald-600"
                    aria-label="Contact technician"
                    onClick={() => toast.info('Contacting technician...')}
                  >
                    <Phone className="size-4" />
                  </Button>
                </div>
              )}
              {creatorName && (
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-semibold">
                      {creatorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{creatorName}</p>
                    <p className="text-xs text-gray-500">Created By</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Timeline ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Progress</h3>
            <div className="relative pl-8">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
              {WO_STEPS.map((step) => {
                const stepState = getWoStepStatus(step.key, status);
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
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isCompleted ? 'text-emerald-700' : isCurrent ? 'text-gray-900' : 'text-gray-400'
                        )}
                      >
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

      {/* ─── Materials ─── */}
      {materials.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Materials Used ({materials.length})
              </h3>
              <div className="space-y-2">
                {materials.map((mat) => (
                  <div key={mat.id as string} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1">{mat.itemName as string || 'Material'}</span>
                    <span className="text-gray-500 shrink-0 ml-2">
                      {mat.quantity as number}x — B$ {((mat.totalCost as number) || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Notes ─── */}
      {notes && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="size-3.5 text-gray-400" />
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{notes}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Attachments ─── */}
      {photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Attachments</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 size-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                  >
                    {url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="flex items-center justify-center size-full text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center size-full gap-1 p-1">
                        <FileText className="size-5 text-gray-400" />
                        <span className="text-[9px] text-gray-400 truncate max-w-[60px]">
                          {url.split('/').pop() || 'File'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Action Buttons ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="space-y-2"
      >
        {assignedToName && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
            onClick={() => toast.info('Contacting technician...')}
          >
            <Phone className="size-4 mr-2" />
            Contact Technician
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => {
            // Scroll to timeline section
            document.querySelector('[data-timeline]')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Wrench className="size-4 mr-2" />
          View Timeline
        </Button>
      </motion.div>
    </div>
  );
}