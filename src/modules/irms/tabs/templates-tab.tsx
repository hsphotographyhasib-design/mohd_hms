'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  Loader2,
  Inbox,
  LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/app-shell/store';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import { formatDate } from './shared';
import type { InspectionTemplate, ChecklistItem } from '../lib';

const TEMPLATE_CATEGORIES = [
  'Electrical',
  'Mechanical',
  'Plumbing',
  'HVAC',
  'Fire Protection',
  'Civil',
  'Structural',
  'Safety',
  'General',
  'Quality Control',
];

const CHECKLIST_TYPES = [
  { value: 'pass_fail', label: 'Pass / Fail' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'text', label: 'Text' },
  { value: 'photo', label: 'Photo' },
  { value: 'numeric', label: 'Numeric' },
];

interface TemplateForm {
  name: string;
  category: string;
  description: string;
  items: ChecklistItem[];
}

function emptyForm(): TemplateForm {
  return { name: '', category: 'General', description: '', items: [] };
}

export default function TemplatesTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canManage = role ? canPerformAction(role, 'inspection', 'manage_templates') : false;

  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/irms/templates', { headers: h });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : data.data ?? data.items ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (template: InspectionTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      category: template.category,
      description: template.description ?? '',
      items: [], // Would need to load checklist items
    });
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const url = editingId ? `/api/irms/templates/${editingId}` : '/api/irms/templates';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: h,
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          description: form.description,
          items: form.items,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        loadTemplates();
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  }, [form, editingId, loadTemplates]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/irms/templates/${id}`, { method: 'DELETE', headers: h });
      loadTemplates();
    } catch {
      // Silent fail
    }
  }, [loadTemplates]);

  // Checklist item management
  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { question: '', type: 'pass_fail', required: false, helpText: '' }],
    }));
  };

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }));
  };

  const removeItem = (index: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  // No permission to manage templates
  if (!canManage) {
    return (
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <LayoutTemplate className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">Access Restricted</p>
          <p className="text-xs mt-1">Only administrators can manage inspection templates</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Template' : 'Create Template'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update the inspection template details.' : 'Define a new inspection template with checklist items.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="tpl-name">Template Name *</Label>
                  <Input
                    id="tpl-name"
                    placeholder="e.g. Monthly HVAC Checklist"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tpl-desc">Description</Label>
                <Textarea
                  id="tpl-desc"
                  placeholder="Describe what this template is for..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Checklist Items Builder */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Checklist Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                    <Plus className="h-3 w-3" />
                    Add Item
                  </Button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No checklist items yet. Click &quot;Add Item&quot; to start building your template.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                        <GripVertical className="h-4 w-4 text-gray-400 mt-2 shrink-0" />
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_120px_auto_auto] gap-2 items-start">
                          <Input
                            placeholder="Question..."
                            value={item.question}
                            onChange={(e) => updateItem(idx, { question: e.target.value })}
                            className="h-8 text-sm"
                          />
                          <Select
                            value={item.type}
                            onValueChange={(v) => updateItem(idx, { type: v as ChecklistItem['type'] })}
                          >
                            <SelectTrigger size="sm" className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHECKLIST_TYPES.map((ct) => (
                                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1.5 pt-1">
                            <Switch
                              checked={item.required}
                              onCheckedChange={(v) => updateItem(idx, { required: v })}
                              className="scale-75"
                            />
                            <span className="text-[10px] text-gray-500">Req</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeItem(idx)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <Inbox className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No templates yet</p>
          <p className="text-xs mt-1">Create your first inspection template to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{tpl.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        {tpl.category}
                      </Badge>
                      <span className="text-xs text-gray-500">{tpl.itemCount} items</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tpl)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(tpl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {tpl.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{tpl.description}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-3">
                  Created {formatDate(tpl.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}