'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Users,
  Eye,
  Pencil,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIrmStore, REPORT_STATUSES, PRIORITIES, type IrmProject, type IrmReport } from '@/modules/irms/lib';
import { toast } from 'sonner';

export default function ProjectDetailView() {
  const [project, setProject] = useState<IrmProject | null>(null);
  const [reports, setReports] = useState<IrmReport[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedProjectId = useIrmStore((s) => s.selectedProjectId);
  const setView = useIrmStore((s) => s.setView);
  const setSelectedReportId = useIrmStore((s) => s.setSelectedReportId);

  const fetchData = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [projRes, repRes] = await Promise.all([
        fetch(`/api/irms/projects/${selectedProjectId}`),
        fetch(`/api/irms/reports?projectId=${selectedProjectId}`),
      ]);
      if (projRes.ok) {
        const pj = await projRes.json();
        setProject(pj);
      }
      if (repRes.ok) {
        const rp = await repRes.json();
        setReports(Array.isArray(rp) ? rp : rp.data || []);
      }
    } catch {
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    const s = REPORT_STATUSES.find((r) => r.value === status);
    return s ? (
      <Badge variant="secondary" className={`${s.color} text-xs`}>
        {s.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find((r) => r.value === priority);
    return p ? (
      <Badge variant="secondary" className={`${p.color} text-xs`}>
        {p.label}
      </Badge>
    ) : null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Project not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setView('projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.number && (
            <p className="text-sm text-muted-foreground">{project.number}</p>
          )}
        </div>
      </div>

      {/* Project Info Card */}
      <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
        <CardHeader>
          <CardTitle className="text-base">Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {project.customer && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Customer</p>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.customer}
                </div>
              </div>
            )}
            {project.location && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Location</p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.location}
                </div>
              </div>
            )}
            {project.startDate && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Start Date</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(project.startDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {project.completionDate && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Completion Date</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(project.completionDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {project.consultant && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Consultant</p>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.consultant}
                </div>
              </div>
            )}
            {project.contractor && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Contractor</p>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.contractor}
                </div>
              </div>
            )}
            {project.supervisor && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Supervisor</p>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.supervisor}
                </div>
              </div>
            )}
            {project.value != null && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Value</p>
                <p className="font-medium">
                  ${project.value.toLocaleString()}
                </p>
              </div>
            )}
            {project.contractNumber && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Contract Number</p>
                <p>{project.contractNumber}</p>
              </div>
            )}
            {project.tenderNumber && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Tender Number</p>
                <p>{project.tenderNumber}</p>
              </div>
            )}
          </div>
          {project.description && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No reports for this project yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-center">Photos</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.number}</TableCell>
                      <TableCell>
                        {new Date(r.inspectionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell>{getPriorityBadge(r.priority)}</TableCell>
                      <TableCell className="text-center">
                        {r._count?.photos || r.photos?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedReportId(r.id);
                              setView('report-view');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedReportId(r.id);
                              setView('report-builder');
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}