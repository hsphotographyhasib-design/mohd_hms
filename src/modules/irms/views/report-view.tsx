'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  Pencil,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useIrmStore,
  REPORT_STATUSES,
  PRIORITIES,
  PDF_TEMPLATES,
  SORT_OPTIONS,
  PHOTO_CATEGORIES,
  type IrmReport,
  type IrmPhoto,
} from '@/modules/irms/lib';
import { toast } from 'sonner';

export default function ReportView() {
  const [report, setReport] = useState<IrmReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState('commercial');
  const [sort, setSort] = useState('newest');
  const [pdfLoading, setPdfLoading] = useState(false);

  const selectedReportId = useIrmStore((s) => s.selectedReportId);
  const setView = useIrmStore((s) => s.setView);
  const setSelectedReportId = useIrmStore((s) => s.setSelectedReportId);

  const fetchReport = useCallback(async () => {
    if (!selectedReportId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/irms/reports/${selectedReportId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setReport(json);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [selectedReportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const fetchPdf = useCallback(async (): Promise<Blob | null> => {
    if (!selectedReportId) return null;
    const url = `/api/irms/reports/${selectedReportId}/pdf?template=${template}&sort=${sort}`;
    /* eslint-disable no-unused-vars */
    let _lastError: Error | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.blob();
      } catch (err) {
        _lastError = err as Error;
        if (attempt < 4) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    }
    /* eslint-enable no-unused-vars */
    toast.error('PDF generation failed after 5 attempts');
    return null;
  }, [selectedReportId, template, sort]);

  const handlePreview = async () => {
    setPdfLoading(true);
    try {
      const blob = await fetchPdf();
      if (blob) {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownload = async () => {
    setPdfLoading(true);
    try {
      const blob = await fetchPdf();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report?.number || 'report'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const getStatusBadge = (s: string) => {
    const found = REPORT_STATUSES.find((r) => r.value === s);
    return found ? (
      <Badge variant="secondary" className={`${found.color}`}>
        {found.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{s}</Badge>
    );
  };

  const getPriorityBadge = (p: string) => {
    const found = PRIORITIES.find((r) => r.value === p);
    return found ? (
      <Badge variant="secondary" className={`${found.color}`}>
        {found.label}
      </Badge>
    ) : null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Report not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setView('reports')}>
          Back to Reports
        </Button>
      </div>
    );
  }

  // Group photos by category
  const photosByCategory: Record<string, IrmPhoto[]> = {};
  (report.photos || []).forEach((p) => {
    const cat = PHOTO_CATEGORIES.find((c) => c.key === p.type);
    const label = cat?.label || p.type || 'Other';
    if (!photosByCategory[label]) photosByCategory[label] = [];
    photosByCategory[label].push(p);
  });

  const infoFields = [
    { label: 'Project', value: report.project?.name || '—' },
    { label: 'Inspector', value: report.inspector?.name || '—' },
    { label: 'Date', value: new Date(report.inspectionDate).toLocaleDateString() },
    { label: 'Department', value: report.department || '—' },
    { label: 'Site', value: report.site || '—' },
    { label: 'Building', value: report.building || '—' },
    { label: 'Floor', value: report.floor || '—' },
    { label: 'Room', value: report.room || '—' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{report.number}</h1>
              {getStatusBadge(report.status)}
              {getPriorityBadge(report.priority)}
            </div>
            <p className="text-sm text-muted-foreground">
              {report.project?.name} · {new Date(report.inspectionDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => {
            setSelectedReportId(report.id);
            setView('report-builder');
          }}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Preview PDF
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleDownload} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      </div>

      {/* PDF Options */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Template:</span>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PDF_TEMPLATES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pdfLoading && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating PDF...
          </span>
        )}
      </div>

      {/* Report Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info Card */}
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Report Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {infoFields.map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="font-medium">{f.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Work Details */}
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Work Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Task Description', value: report.taskDescription },
                { label: 'Work Scope', value: report.workScope },
                { label: 'Inspection Notes', value: report.inspectionNotes },
                { label: 'Corrective Actions', value: report.correctiveActions },
                { label: 'Recommendation', value: report.recommendation },
                { label: 'Observation', value: report.observation },
                { label: 'Safety Notes', value: report.safetyNotes },
                { label: 'Root Cause', value: report.rootCause },
                { label: 'Materials Used', value: report.materialsUsed },
              ]
                .filter((f) => f.value)
                .map((f) => (
                  <div key={f.label}>
                    <p className="font-medium text-muted-foreground mb-0.5">{f.label}</p>
                    <p className="whitespace-pre-wrap">{f.value}</p>
                  </div>
                ))}
              {report.labourHours != null && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Labour Hours:</span>{' '}
                  {report.labourHours}
                </p>
              )}
              {report.completionPct > 0 && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Completion:</span>{' '}
                  {report.completionPct}%
                </p>
              )}
            </CardContent>
          </Card>

          {/* Photos Gallery */}
          {Object.keys(photosByCategory).length > 0 && (
            <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Photos</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(photosByCategory).map(([category, photos]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <h4 className="text-sm font-semibold mb-2">{category} ({photos.length})</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="aspect-square rounded-lg overflow-hidden border bg-gray-50 dark:bg-gray-800"
                        >
                          <img
                            src={photo.thumbnail || photo.data}
                            alt={photo.caption || photo.photoNumber || ''}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Signatures */}
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Signatures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Inspector', src: report.inspectorSign },
                { label: 'Supervisor', src: report.supervisorSign },
                { label: 'Manager', src: report.managerSign },
                { label: 'Client', src: report.clientSign },
              ].map((sig) => (
                <div key={sig.label}>
                  <p className="text-xs text-muted-foreground mb-1">{sig.label}</p>
                  {sig.src ? (
                    <img
                      src={sig.src}
                      alt={`${sig.label} signature`}
                      className="w-full max-h-[80px] object-contain border rounded bg-white p-1"
                    />
                  ) : (
                    <div className="h-[60px] border rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xs text-muted-foreground">
                      No signature
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Approval History */}
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Approval History</CardTitle>
            </CardHeader>
            <CardContent>
              {report.approvals && report.approvals.length > 0 ? (
                <div className="space-y-2">
                  {report.approvals.map((a) => (
                    <div
                      key={a.id}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {a.step.replace(/_/g, ' ')}
                        </span>
                        <Badge
                          variant="secondary"
                          className={
                            a.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {a.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.user?.name || 'Unknown'} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                      {a.comment && (
                        <p className="text-xs mt-1 italic">&ldquo;{a.comment}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No approvals yet</p>
              )}
            </CardContent>
          </Card>

          {/* Revision History */}
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revision History</CardTitle>
            </CardHeader>
            <CardContent>
              {report.revisions && report.revisions.length > 0 ? (
                <div className="space-y-2">
                  {report.revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">v{rev.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {rev.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{rev.note}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        by {rev.user?.name || 'Unknown'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No revisions</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}