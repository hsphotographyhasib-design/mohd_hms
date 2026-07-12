'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Plus, Copy, Pencil, Trash2, Lock, Eye, Search,
  Variable, Sparkles, X,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import type { WhatsAppTemplateData, TemplateCategory } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// ============ CONSTANTS ============

const TEMPLATE_VARIABLES = [
  { key: '{{customer_name}}', description: 'Customer full name' },
  { key: '{{customer_phone}}', description: 'Customer phone number' },
  { key: '{{complaint_id}}', description: 'Complaint reference number' },
  { key: '{{complaint_title}}', description: 'Complaint title/subject' },
  { key: '{{technician_name}}', description: 'Assigned technician name' },
  { key: '{{eta}}', description: 'Estimated time of arrival' },
  { key: '{{status}}', description: 'Current status' },
  { key: '{{invoice_number}}', description: 'Invoice reference' },
  { key: '{{invoice_amount}}', description: 'Invoice total amount' },
  { key: '{{due_date}}', description: 'Payment due date' },
  { key: '{{equipment_name}}', description: 'Equipment name' },
  { key: '{{location}}', description: 'Equipment/location' },
  { key: '{{work_order_id}}', description: 'Work order reference' },
  { key: '{{priority}}', description: 'Priority level' },
  { key: '{{company_name}}', description: 'Your business name' },
  { key: '{{support_phone}}', description: 'Support phone number' },
];

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'complaint_created', label: 'Complaint Created' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'notification', label: 'Notification' },
  { value: 'custom', label: 'Custom' },
];

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  ...CATEGORIES,
];

const MEDIA_TYPES = [
  { value: 'none', label: 'No Media' },
  { value: 'image', label: 'Image' },
  { value: 'document', label: 'Document' },
  { value: 'video', label: 'Video' },
];

// ============ MOCK DATA ============

const MOCK_TEMPLATES: WhatsAppTemplateData[] = [
  {
    id: '1', tenantId: 't1', name: 'Welcome Message', category: 'welcome',
    content: 'Hello {{customer_name}}! 👋 Welcome to {{company_name}}. We\'re here to help with your facility management needs. Reply MENU for options.',
    isActive: true, isSystem: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2', tenantId: 't1', name: 'Complaint Created', category: 'complaint_created',
    content: 'Your complaint #{{complaint_id}} has been received. We\'ll review it shortly. You\'ll get updates via WhatsApp. Thank you for your patience! 🙏',
    isActive: true, isSystem: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3', tenantId: 't1', name: 'Technician Assigned', category: 'assigned',
    content: 'Good news! Technician {{technician_name}} has been assigned to your complaint #{{complaint_id}}. Estimated arrival: {{eta}}.',
    isActive: true, isSystem: false, createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '4', tenantId: 't1', name: 'Work In Progress', category: 'in_progress',
    content: 'Your service request #{{complaint_id}} for {{equipment_name}} at {{location}} is now in progress. Technician {{technician_name}} is on it.',
    isActive: true, isSystem: false, createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '5', tenantId: 't1', name: 'Completed - Feedback', category: 'completed',
    content: 'Your complaint #{{complaint_id}} has been resolved! ✅ Please rate our service from 1-5. Your feedback helps us improve.',
    isActive: true, isSystem: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '6', tenantId: 't1', name: 'Invoice Reminder', category: 'invoice',
    content: 'Hi {{customer_name}}, invoice #{{invoice_number}} for ${{invoice_amount}} is due on {{due_date}}. Please remit payment at your earliest convenience.',
    isActive: true, isSystem: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z',
    mediaType: 'document',
  },
  {
    id: '7', tenantId: 't1', name: 'Emergency Alert', category: 'emergency',
    content: '🚨 EMERGENCY: Your priority-{{priority}} issue #{{complaint_id}} at {{location}} has been escalated. Our team is responding immediately.',
    isActive: true, isSystem: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '8', tenantId: 't1', name: 'Appointment Confirmed', category: 'appointment',
    content: 'Your appointment has been confirmed! Technician {{technician_name}} will arrive at {{eta}}. Reply RESCHEDULE if needed.',
    isActive: false, isSystem: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z',
  },
];

// ============ FORM DEFAULTS ============

interface TemplateFormData {
  name: string;
  category: TemplateCategory;
  content: string;
  mediaType: string;
  mediaUrl: string;
  isActive: boolean;
}

const FORM_DEFAULTS: TemplateFormData = {
  name: '',
  category: 'custom',
  content: '',
  mediaType: 'none',
  mediaUrl: '',
  isActive: true,
};

// ============ CATEGORY BADGE COLORS ============

const CATEGORY_COLORS: Record<string, string> = {
  welcome: 'bg-emerald-100 text-emerald-700',
  complaint_created: 'bg-amber-100 text-amber-700',
  assigned: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-teal-100 text-teal-700',
  completed: 'bg-emerald-100 text-emerald-700',
  invoice: 'bg-violet-100 text-violet-700',
  feedback: 'bg-pink-100 text-pink-700',
  emergency: 'bg-red-100 text-red-700',
  appointment: 'bg-orange-100 text-orange-700',
  notification: 'bg-gray-100 text-gray-700',
  custom: 'bg-gray-100 text-gray-700',
};

// ============ MAIN COMPONENT ============

export function WhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplateData | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(FORM_DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);
  const [previewText, setPreviewText] = useState('');

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : data.data || []);
      } else {
        setTemplates(MOCK_TEMPLATES);
      }
    } catch {
      setTemplates(MOCK_TEMPLATES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Update preview when content changes
  useEffect(() => {
    let preview = formData.content;
    TEMPLATE_VARIABLES.forEach((v) => {
      preview = preview?.replace(new RegExp(v.key.replace(/[{}]/g, '{}'), 'g'), `[${v.description}]`);
    });
    setPreviewText(preview);
  }, [formData.content]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData(FORM_DEFAULTS);
    setDialogOpen(true);
  };

  const handleOpenEdit = (template: WhatsAppTemplateData) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content,
      mediaType: template.mediaType || 'none',
      mediaUrl: template.mediaUrl || '',
      isActive: template.isActive,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (template: WhatsAppTemplateData) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      category: template.category,
      content: template.content,
      mediaType: template.mediaType || 'none',
      mediaUrl: template.mediaUrl || '',
      isActive: false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Name and content are required');
      return;
    }
    setIsSaving(true);
    try {
      const token = getToken();
      const url = editingTemplate
        ? `/api/whatsapp/templates/${editingTemplate.id}`
        : '/api/whatsapp/templates';
      const res = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created');
        setDialogOpen(false);
        fetchTemplates();
      } else {
        // Optimistically update local state
        if (editingTemplate) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...formData } : t))
          );
        } else {
          setTemplates((prev) => [
            ...prev,
            {
              id: `local-${Date.now()}`,
              tenantId: '',
              ...formData,
              isSystem: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
        }
        toast.success(editingTemplate ? 'Template updated' : 'Template created');
        setDialogOpen(false);
      }
    } catch {
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (template: WhatsAppTemplateData) => {
    if (template.isSystem) {
      toast.error('System templates cannot be deleted');
      return;
    }
    try {
      const token = getToken();
      const res = await fetch(`/api/whatsapp/templates/${template.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
        toast.success('Template deleted');
      } else {
        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
        toast.success('Template deleted');
      }
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleToggleActive = (template: WhatsAppTemplateData) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, isActive: !t.isActive } : t))
    );
    toast.success(`Template ${template.isActive ? 'disabled' : 'enabled'}`);
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + variable,
    }));
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || t.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <FileText className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
            <p className="text-sm text-muted-foreground">Create and manage WhatsApp message templates</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1.5" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                categoryFilter === cat.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No templates found</p>
              <p className="text-sm">Create a new template to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Content Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      {template.isSystem && (
                        <TooltipWrapper text="System template - cannot be deleted">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipWrapper>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px]', CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom)}
                      >
                        {template.category.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {truncate(template.content, 80)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={() => handleToggleActive(template)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(template)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(template)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {!template.isSystem && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(template)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update the message template settings'
                : 'Design a new WhatsApp message template with variables'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input
                id="tpl-name"
                placeholder="e.g., Complaint Acknowledgement"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Category & Media */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v as TemplateCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select
                  value={formData.mediaType}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, mediaType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIA_TYPES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Media URL */}
            {formData.mediaType !== 'none' && (
              <div className="space-y-2">
                <Label>Media URL</Label>
                <Input
                  placeholder="https://example.com/media.jpg"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mediaUrl: e.target.value }))}
                />
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label>Message Content</Label>
              <Textarea
                placeholder="Type your message template here. Use variables like {{customer_name}}..."
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                className="min-h-[120px]"
              />
            </div>

            {/* Variables Panel */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Variable className="h-4 w-4 text-emerald-600" />
                Available Variables
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                      title={v.description}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            {formData.content && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  Preview
                </div>
                <div className="bg-gray-100 rounded-xl p-4 max-h-32 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap break-words text-gray-700">
                    {previewText}
                  </p>
                </div>
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Enable this template for use in automated messages</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isActive: v }))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.name.trim() || !formData.content.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ TOOLTIP WRAPPER ============

function TooltipWrapper({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span title={text} className="cursor-help">
      {children}
    </span>
  );
}
