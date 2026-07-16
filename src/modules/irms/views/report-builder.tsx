'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  Upload,
  Trash2,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIrmStore, DEPARTMENTS, WORK_CATEGORIES, INSPECTION_TYPES, PRIORITIES, WORKFLOW_STEPS, PHOTO_CATEGORIES, type IrmReport, type IrmProject, type IrmUser, type IrmPhoto } from '@/modules/irms/lib';
import { toast } from 'sonner';

/* ─── AI Button ─── */
function AiButton({ action, field: _field, reportId, onResult }: { action: string; field: string; reportId?: string; onResult: (val: string) => void }) { // eslint-disable-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/irms/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reportId }),
      });
      if (!res.ok) throw new Error('AI generation failed');
      const json = await res.json();
      onResult(json.text || json.result || '');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="ml-2 shrink-0"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
      AI
    </Button>
  );
}

/* ─── Signature Pad ─── */
function SignaturePad({ label, value, onChange }: { label: string; value?: string | null; onChange: (_dataUrl: string | null) => void }) { // eslint-disable-line no-unused-vars
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawing.current = false;
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
    toast.success(`${label} signature saved`);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full max-w-[400px] h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair bg-gray-50 dark:bg-gray-800 touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={save}>
          <Check className="h-3 w-3 mr-1" />
          Sign
        </Button>
      </div>
    </div>
  );
}

export default function ReportBuilderView() {
  const selectedReportId = useIrmStore((s) => s.selectedReportId);
  const setView = useIrmStore((s) => s.setView);
  const hasPermission = useIrmStore((s) => s.hasPermission);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<IrmProject[]>([]);
  const [users, setUsers] = useState<IrmUser[]>([]);
  const [photos, setPhotos] = useState<IrmPhoto[]>([]);
  const [approvals, setApprovals] = useState<IrmReport['approvals']>([]);

  const [form, setForm] = useState({
    projectId: '',
    inspectorId: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    department: '',
    workCategory: '',
    inspectionType: '',
    priority: 'medium',
    site: '',
    building: '',
    floor: '',
    room: '',
    equipment: '',
    assetId: '',
    jobOrderNumber: '',
    workOrderNumber: '',
    taskDescription: '',
    workScope: '',
    inspectionNotes: '',
    correctiveActions: '',
    recommendation: '',
    observation: '',
    safetyNotes: '',
    rootCause: '',
    materialsUsed: '',
    labourHours: '',
    completionPct: 0,
    // Signatures
    inspectorSign: null as string | null,
    supervisorSign: null as string | null,
    clientSign: null as string | null,
    managerSign: null as string | null,
  });

  const [approvalComment, setApprovalComment] = useState('');

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Fetch lookups
  useEffect(() => {
    Promise.all([
      fetch('/api/irms/projects').then((r) => r.json().catch(() => [])),
      fetch('/api/irms/users').then((r) => r.json().catch(() => [])),
    ]).then(([pj, us]) => {
      setProjects(Array.isArray(pj) ? pj : pj.data || []);
      setUsers(Array.isArray(us) ? us : us.data || []);
    });
  }, []);

  // Fetch existing report
  useEffect(() => {
    if (!selectedReportId) return;
    setLoading(true);
    fetch(`/api/irms/reports/${selectedReportId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((r: IrmReport) => {
        setForm({
          projectId: r.projectId,
          inspectorId: r.inspectorId,
          inspectionDate: r.inspectionDate?.split('T')[0] || '',
          department: r.department || '',
          workCategory: r.workCategory || '',
          inspectionType: r.inspectionType || '',
          priority: r.priority || 'medium',
          site: r.site || '',
          building: r.building || '',
          floor: r.floor || '',
          room: r.room || '',
          equipment: r.equipment || '',
          assetId: r.assetId || '',
          jobOrderNumber: r.jobOrderNumber || '',
          workOrderNumber: r.workOrderNumber || '',
          taskDescription: r.taskDescription || '',
          workScope: r.workScope || '',
          inspectionNotes: r.inspectionNotes || '',
          correctiveActions: r.correctiveActions || '',
          recommendation: r.recommendation || '',
          observation: r.observation || '',
          safetyNotes: r.safetyNotes || '',
          rootCause: r.rootCause || '',
          materialsUsed: r.materialsUsed || '',
          labourHours: r.labourHours?.toString() || '',
          completionPct: r.completionPct || 0,
          inspectorSign: r.inspectorSign ?? null,
          supervisorSign: r.supervisorSign ?? null,
          clientSign: r.clientSign ?? null,
          managerSign: r.managerSign ?? null,
        });
        setPhotos(r.photos || []);
        setApprovals(r.approvals || []);
      })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [selectedReportId]);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        labourHours: form.labourHours ? parseFloat(form.labourHours) : null,
        status: 'draft',
      };
      const res = selectedReportId
        ? await fetch(`/api/irms/reports/${selectedReportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/irms/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error();
      toast.success('Draft saved');
    } catch {
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        labourHours: form.labourHours ? parseFloat(form.labourHours) : null,
        status: 'submitted',
      };
      const res = selectedReportId
        ? await fetch(`/api/irms/reports/${selectedReportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/irms/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error();
      toast.success('Report submitted');
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async () => {
    if (!selectedReportId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/irms/reports/${selectedReportId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', comment: approvalComment }),
      });
      if (!res.ok) throw new Error();
      toast.success('Report advanced');
      // Reload
      const r = await fetch(`/api/irms/reports/${selectedReportId}`);
      if (r.ok) {
        const data = await r.json();
        setApprovals(data.approvals || []);
      }
    } catch {
      toast.error('Failed to advance report');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReportId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/irms/reports/${selectedReportId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', comment: approvalComment }),
      });
      if (!res.ok) throw new Error();
      toast.success('Report rejected');
    } catch {
      toast.error('Failed to reject report');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedReportId) return;
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    try {
      const res = await fetch(`/api/irms/reports/${selectedReportId}/photos/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPhotos((prev) => [...prev, ...(Array.isArray(json) ? json : json.photos || [])]);
      toast.success('Photos uploaded');
    } catch {
      toast.error('Failed to upload photos');
    }
    e.target.value = '';
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedReportId) return;
    try {
      await fetch(`/api/irms/reports/${selectedReportId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      toast.error('Failed to delete photo');
    }
  };

  // Determine current workflow step index
  const currentStepIndex = (() => {
    if (!selectedReportId) return 0;
    const stepKeys = WORKFLOW_STEPS.map((s) => s.key);
    // find from approvals or assume based on latest approval status
    if (approvals && approvals.length > 0) {
      const last = approvals[approvals.length - 1];
      const idx = stepKeys.indexOf(last.step as typeof stepKeys[number]);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {selectedReportId ? 'Edit Report' : 'New Report'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedReportId ? `Report ID: ${selectedReportId}` : 'Fill in the details below'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={submitReport} disabled={saving}>
            <Send className="h-4 w-4 mr-2" />
            {saving ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="work">Work Details</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Details ─── */}
        <TabsContent value="details">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Project *</Label>
                  <Select value={form.projectId} onValueChange={(v) => updateField('projectId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Inspector *</Label>
                  <Select value={form.inspectorId} onValueChange={(v) => updateField('inspectorId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Inspection Date</Label>
                  <Input
                    type="date"
                    value={form.inspectionDate}
                    onChange={(e) => updateField('inspectionDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => updateField('department', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Work Category</Label>
                  <Select value={form.workCategory} onValueChange={(v) => updateField('workCategory', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Inspection Type</Label>
                  <Select value={form.inspectionType} onValueChange={(v) => updateField('inspectionType', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => updateField('priority', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Site</Label>
                  <Input value={form.site} onChange={(e) => updateField('site', e.target.value)} />
                </div>
                <div>
                  <Label>Building</Label>
                  <Input value={form.building} onChange={(e) => updateField('building', e.target.value)} />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Input value={form.floor} onChange={(e) => updateField('floor', e.target.value)} />
                </div>
                <div>
                  <Label>Room</Label>
                  <Input value={form.room} onChange={(e) => updateField('room', e.target.value)} />
                </div>
                <div>
                  <Label>Equipment</Label>
                  <Input value={form.equipment} onChange={(e) => updateField('equipment', e.target.value)} />
                </div>
                <div>
                  <Label>Asset ID</Label>
                  <Input value={form.assetId} onChange={(e) => updateField('assetId', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Work Details ─── */}
        <TabsContent value="work">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Job Order Number</Label>
                  <Input
                    value={form.jobOrderNumber}
                    onChange={(e) => updateField('jobOrderNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Work Order Number</Label>
                  <Input
                    value={form.workOrderNumber}
                    onChange={(e) => updateField('workOrderNumber', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Task Description</Label>
                <Textarea
                  rows={3}
                  value={form.taskDescription}
                  onChange={(e) => updateField('taskDescription', e.target.value)}
                />
              </div>

              <div>
                <Label>Work Scope</Label>
                <Textarea
                  rows={3}
                  value={form.workScope}
                  onChange={(e) => updateField('workScope', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label className="mb-0">Inspection Notes</Label>
                  <AiButton
                    action="remarks"
                    field="inspectionNotes"
                    reportId={selectedReportId || undefined}
                    onResult={(v) => updateField('inspectionNotes', v)}
                  />
                </div>
                <Textarea
                  rows={3}
                  value={form.inspectionNotes}
                  onChange={(e) => updateField('inspectionNotes', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label className="mb-0">Corrective Actions</Label>
                  <AiButton
                    action="corrective"
                    field="correctiveActions"
                    reportId={selectedReportId || undefined}
                    onResult={(v) => updateField('correctiveActions', v)}
                  />
                </div>
                <Textarea
                  rows={3}
                  value={form.correctiveActions}
                  onChange={(e) => updateField('correctiveActions', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label className="mb-0">Root Cause</Label>
                  <AiButton
                    action="rootcause"
                    field="rootCause"
                    reportId={selectedReportId || undefined}
                    onResult={(v) => updateField('rootCause', v)}
                  />
                </div>
                <Textarea
                  rows={2}
                  value={form.rootCause}
                  onChange={(e) => updateField('rootCause', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label className="mb-0">Recommendation</Label>
                  <AiButton
                    action="recommendation"
                    field="recommendation"
                    reportId={selectedReportId || undefined}
                    onResult={(v) => updateField('recommendation', v)}
                  />
                </div>
                <Textarea
                  rows={2}
                  value={form.recommendation}
                  onChange={(e) => updateField('recommendation', e.target.value)}
                />
              </div>

              <div>
                <Label>Observation</Label>
                <Textarea
                  rows={2}
                  value={form.observation}
                  onChange={(e) => updateField('observation', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label className="mb-0">Safety Notes</Label>
                  <AiButton
                    action="safety"
                    field="safetyNotes"
                    reportId={selectedReportId || undefined}
                    onResult={(v) => updateField('safetyNotes', v)}
                  />
                </div>
                <Textarea
                  rows={2}
                  value={form.safetyNotes}
                  onChange={(e) => updateField('safetyNotes', e.target.value)}
                />
              </div>

              <div>
                <Label>Materials Used</Label>
                <Textarea
                  rows={2}
                  value={form.materialsUsed}
                  onChange={(e) => updateField('materialsUsed', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Labour Hours</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.labourHours}
                    onChange={(e) => updateField('labourHours', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Completion: {form.completionPct}%</Label>
                  <Slider
                    value={[form.completionPct]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => updateField('completionPct', v)}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Photos ─── */}
        <TabsContent value="photos">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Photos ({photos.length})</h3>
                {selectedReportId && (
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <Button className="bg-green-600 hover:bg-green-700" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photos
                      </span>
                    </Button>
                  </label>
                )}
              </div>

              {photos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Upload className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No photos uploaded yet</p>
                  <p className="text-xs">Click "Upload Photos" to add images</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {photos.map((photo) => {
                    const cat = PHOTO_CATEGORIES.find((c) => c.key === photo.type);
                    return (
                      <div
                        key={photo.id}
                        className="relative group rounded-lg overflow-hidden border bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="aspect-square">
                          <img
                            src={photo.thumbnail || photo.data}
                            alt={photo.caption || photo.photoNumber || ''}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-1 left-1 flex gap-1">
                          {photo.photoNumber && (
                            <Badge variant="secondary" className="text-[10px] px-1">
                              {photo.photoNumber}
                            </Badge>
                          )}
                          {cat && (
                            <span
                              className="h-3 w-3 rounded-full inline-block"
                              style={{ backgroundColor: cat.color }}
                            />
                          )}
                        </div>
                        {photo.caption && (
                          <div className="p-1 text-[10px] truncate text-muted-foreground">
                            {photo.caption}
                          </div>
                        )}
                        {selectedReportId && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 4: Signatures ─── */}
        <TabsContent value="signatures">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SignaturePad
                  label="Inspector"
                  value={form.inspectorSign}
                  onChange={(v) => updateField('inspectorSign', v)}
                />
                <SignaturePad
                  label="Supervisor"
                  value={form.supervisorSign}
                  onChange={(v) => updateField('supervisorSign', v)}
                />
                <SignaturePad
                  label="Manager"
                  value={form.managerSign}
                  onChange={(v) => updateField('managerSign', v)}
                />
                <SignaturePad
                  label="Client"
                  value={form.clientSign}
                  onChange={(v) => updateField('clientSign', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 5: Approval ─── */}
        <TabsContent value="approval">
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardContent className="p-6 space-y-6">
              {/* Workflow Stepper */}
              <div>
                <h3 className="font-semibold mb-4">Approval Workflow</h3>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const isCompleted = i < currentStepIndex;
                    const isCurrent = i === currentStepIndex;
                    return (
                      <React.Fragment key={step.key}>
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                            isCompleted
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : isCurrent
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                          }`}
                        >
                          {isCompleted && <Check className="h-3 w-3" />}
                          {step.label}
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div
                            className={`h-px w-4 shrink-0 ${
                              i < currentStepIndex ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Advance / Reject */}
              {selectedReportId && hasPermission('approve') && (
                <>
                  <Separator />
                  <div>
                    <Label>Comment</Label>
                    <Textarea
                      rows={3}
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Add approval comment..."
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleAdvance}
                        disabled={saving}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Advance
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Audit Trail */}
              {approvals && approvals.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Audit Trail</h3>
                    <div className="space-y-2">
                      {approvals.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                        >
                          <div>
                            <span className="font-medium">{a.step.replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground ml-2">
                              by {a.user?.name || 'Unknown'}
                            </span>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="secondary"
                              className={
                                a.status === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : a.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : ''
                              }
                            >
                              {a.status}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(a.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}