'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MapPin, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useIrmStore, type IrmProject } from '@/modules/irms/lib';
import { toast } from 'sonner';

const STATUS_FILTERS = ['All', 'Active', 'Completed', 'On Hold'];

const statusColorMap: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'on-hold': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function ProjectsView() {
  const [projects, setProjects] = useState<IrmProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const setView = useIrmStore((s) => s.setView);
  const setSelectedProjectId = useIrmStore((s) => s.setSelectedProjectId);
  const storeSetProjects = useIrmStore((s) => s.setProjects);

  const [form, setForm] = useState({
    name: '',
    number: '',
    contractNumber: '',
    tenderNumber: '',
    customer: '',
    location: '',
    value: '',
    startDate: '',
    completionDate: '',
    consultant: '',
    contractor: '',
    supervisor: '',
    description: '',
    status: 'active',
  });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/irms/projects');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setProjects(Array.isArray(json) ? json : json.data || []);
      storeSetProjects(Array.isArray(json) ? json : json.data || []);
    } catch {
      toast.error('Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [storeSetProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.number?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'All' ||
      p.status.toLowerCase() === statusFilter.toLowerCase().replace(' ', '-');
    return matchSearch && matchStatus;
  });

  const handleCardClick = (id: string) => {
    setSelectedProjectId(id);
    setView('project-detail');
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/irms/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          value: form.value ? parseFloat(form.value) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Project created');
      setDialogOpen(false);
      setForm({
        name: '',
        number: '',
        contractNumber: '',
        tenderNumber: '',
        customer: '',
        location: '',
        value: '',
        startDate: '',
        completionDate: '',
        consultant: '',
        contractor: '',
        supervisor: '',
        description: '',
        status: 'active',
      });
      fetchProjects();
    } catch {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm">Manage inspection projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="sm:col-span-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Project name"
                />
              </div>
              <div>
                <Label>Project Number</Label>
                <Input
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="PRJ-001"
                />
              </div>
              <div>
                <Label>Contract Number</Label>
                <Input
                  value={form.contractNumber}
                  onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Tender Number</Label>
                <Input
                  value={form.tenderNumber}
                  onChange={(e) => setForm({ ...form, tenderNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Customer</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Completion Date</Label>
                <Input
                  type="date"
                  value={form.completionDate}
                  onChange={(e) => setForm({ ...form, completionDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Consultant</Label>
                <Input
                  value={form.consultant}
                  onChange={(e) => setForm({ ...form, consultant: e.target.value })}
                />
              </div>
              <div>
                <Label>Contractor</Label>
                <Input
                  value={form.contractor}
                  onChange={(e) => setForm({ ...form, contractor: e.target.value })}
                />
              </div>
              <div>
                <Label>Supervisor</Label>
                <Input
                  value={form.supervisor}
                  onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className={
                statusFilter === s
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : ''
              }
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="hover:-translate-y-0.5 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50"
              onClick={() => handleCardClick(project.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                    {project.number && (
                      <p className="text-xs text-muted-foreground">{project.number}</p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${statusColorMap[project.status] || ''} shrink-0 text-xs`}
                  >
                    {project.status}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  {project.customer && (
                    <div className="flex items-center gap-1 truncate">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {project.customer}
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {project.location}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {project._count?.reports || 0} reports
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}