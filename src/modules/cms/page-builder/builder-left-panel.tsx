'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePageBuilderStore } from '@/modules/cms/page-builder/store';
import { WIDGET_DEFINITIONS, type WidgetType, type SectionType } from '@/modules/cms/page-builder/types';
import { cn } from '@/core/utils/utils';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Separator } from '@/shared/ui/separator';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/shared/ui/tooltip';
import {
  Search, Plus, GripVertical, Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown, Copy, Trash2, LayoutTemplate,
  Monitor, Smartphone, Tablet, Wrench, Briefcase, HardHat,
  Shield, Award, Users, MessageSquare, BarChart3, MapPin,
  Footprints, Star, Grid3X3, Image as ImageIcon, Type, FileText, Video,
  Minus, Code, Mail, Clock, HelpCircle, Quote, Hash,
  MousePointerClick, Square, QrCode, GalleryHorizontal,
} from 'lucide-react';

// ============ WIDGET CATEGORY ICONS ============
const catIcons: Record<string, React.ReactNode> = {
  basic: <Type className="h-4 w-4" />,
  content: <FileText className="h-4 w-4" />,
  media: <ImageIcon className="h-4 w-4" />,
  interactive: <MousePointerClick className="h-4 w-4" />,
  advanced: <Code className="h-4 w-4" />,
};

const widgetIconMap: Record<string, React.ReactNode> = {
  Type: <Type className="h-5 w-5" />,
  AlignLeft: <FileText className="h-5 w-5" />,
  MousePointerClick: <MousePointerClick className="h-5 w-5" />,
  Image: <ImageIcon className="h-5 w-5" />,
  Video: <Video className="h-5 w-5" />,
  Minus: <Minus className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  Square: <Square className="h-5 w-5" />,
  Hash: <Hash className="h-5 w-5" />,
  HelpCircle: <HelpCircle className="h-5 w-5" />,
  Grid3X3: <Grid3X3 className="h-5 w-5" />,
  Quote: <Quote className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Wrench: <Wrench className="h-5 w-5" />,
  Mail: <Mail className="h-5 w-5" />,
  MapPin: <MapPin className="h-5 w-5" />,
  GalleryHorizontal: <GalleryHorizontal className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  Code: <Code className="h-5 w-5" />,
  QrCode: <QrCode className="h-5 w-5" />,
};

// ============ SECTION TYPE ICONS ============
const sectionTypes: { type: SectionType; label: string; icon: React.ReactNode }[] = [
  { type: 'hero', label: 'Hero', icon: <Monitor className="h-4 w-4" /> },
  { type: 'about', label: 'About', icon: <Briefcase className="h-4 w-4" /> },
  { type: 'services', label: 'Services', icon: <Wrench className="h-4 w-4" /> },
  { type: 'projects', label: 'Projects', icon: <HardHat className="h-4 w-4" /> },
  { type: 'portfolio', label: 'Portfolio', icon: <Grid3X3 className="h-4 w-4" /> },
  { type: 'achievements', label: 'Achievements', icon: <Award className="h-4 w-4" /> },
  { type: 'clients', label: 'Clients', icon: <Users className="h-4 w-4" /> },
  { type: 'testimonials', label: 'Testimonials', icon: <Quote className="h-4 w-4" /> },
  { type: 'equipment-brands', label: 'Equipment Brands', icon: <Shield className="h-4 w-4" /> },
  { type: 'statistics', label: 'Statistics', icon: <BarChart3 className="h-4 w-4" /> },
  { type: 'contact', label: 'Contact', icon: <MessageSquare className="h-4 w-4" /> },
  { type: 'footer', label: 'Footer', icon: <Footprints className="h-4 w-4" /> },
  { type: 'custom', label: 'Custom', icon: <LayoutTemplate className="h-4 w-4" /> },
];

// ============ WIDGETS TAB ============
function WidgetsTab() {
  const [search, setSearch] = useState('');
  const addWidget = usePageBuilderStore((s) => s.addWidget);
  const sections = usePageBuilderStore((s) => s.sections);
  const selectedSectionId = usePageBuilderStore((s) => s.selectedSectionId);

  const filtered = useMemo(() => {
    if (!search) return WIDGET_DEFINITIONS;
    const q = search.toLowerCase();
    return WIDGET_DEFINITIONS.filter((d) => d.label.toLowerCase().includes(q) || d.type.includes(q) || d.description.toLowerCase().includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof WIDGET_DEFINITIONS> = {};
    for (const w of filtered) {
      if (!groups[w.category]) groups[w.category] = [];
      groups[w.category].push(w);
    }
    return groups;
  }, [filtered]);

  const handleAdd = (type: WidgetType) => {
    const targetId = selectedSectionId || (sections.length > 0 ? sections[sections.length - 1].id : null);
    if (!targetId) {
      // Auto-create a section first
      const newId = usePageBuilderStore.getState().addSection('custom');
      addWidget(newId, type);
    } else {
      addWidget(targetId, type);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <Input
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 bg-gray-700/50 border-gray-600 text-white text-xs placeholder:text-gray-500 focus-visible:ring-emerald-600"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 pb-4">
        {Object.entries(grouped).map(([cat, widgets]) => (
          <div key={cat} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {catIcons[cat]}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {cat}
              </span>
              <span className="text-[10px] text-gray-600">({widgets.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {widgets.map((w) => (
                <TooltipProvider key={w.type} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleAdd(w.type)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 hover:border-emerald-600/50 transition-all group text-center"
                      >
                        <div className="text-gray-400 group-hover:text-emerald-400 transition-colors">
                          {widgetIconMap[w.icon] || <Square className="h-5 w-5" />}
                        </div>
                        <span className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors leading-tight">
                          {w.label}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700 max-w-[200px]">
                      <p className="font-medium text-xs">{w.label}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">{w.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

// ============ SECTIONS TAB ============
function SectionsTab() {
  const {
    sections, selectedSectionId, selectedWidgetId,
    selectSection, selectWidget,
    addSection, removeSection, duplicateSection, moveSection, updateSection,
  } = usePageBuilderStore();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700/50">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Add Section</p>
        <div className="grid grid-cols-3 gap-1">
          {sectionTypes.map((s) => (
            <TooltipProvider key={s.type} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { addSection(s.type); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-md bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 hover:border-emerald-600/50 transition-all"
                  >
                    <div className="text-gray-400 hover:text-emerald-400">{s.icon}</div>
                    <span className="text-[9px] text-gray-400 leading-tight text-center">{s.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">{s.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Page Sections</p>
      </div>

      <ScrollArea className="flex-1 px-3 pb-4">
        {sections.length === 0 ? (
          <div className="text-center py-8">
            <LayoutTemplate className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No sections yet</p>
            <p className="text-[10px] text-gray-600 mt-1">Add a section above or click a widget to add</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                onClick={() => { selectSection(sec.id); selectWidget(null); }}
                className={cn(
                  'group rounded-lg border transition-all cursor-pointer',
                  selectedSectionId === sec.id
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                )}
              >
                <div className="flex items-center gap-1.5 p-2">
                  <GripVertical className="h-3 w-3 text-gray-600 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200 truncate">{sec.label || sec.type}</p>
                    <p className="text-[10px] text-gray-500">{sec.widgets.length} widget{sec.widgets.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateSection(sec.id, { hidden: !sec.hidden }); }}
                      className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    >
                      {sec.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (idx > 0) moveSection(idx, idx - 1); }}
                      className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30"
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (idx < sections.length - 1) moveSection(idx, idx + 1); }}
                      className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30"
                      disabled={idx === sections.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateSection(sec.id); }}
                      className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this section?')) removeSection(sec.id); }}
                      className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============ TEMPLATES TAB ============
function TemplatesTab() {
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; category: string; description?: string; isSystem: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const addSection = usePageBuilderStore((s) => s.addSection);

  useEffect(() => {
    fetch('/api/cms/builder/templates')
      .then((r) => r.json())
      .then((d) => { setTemplates(d.templates || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUseTemplate = async (templateId: string) => {
    try {
      const res = await fetch('/api/cms/builder/templates', {
        method: 'GET',
      });
      const data = await res.json();
      const template = (data.templates || []).find((t: { id: string }) => t.id === templateId);
      if (template?.pageData) {
        const pageData = typeof template.pageData === 'string' ? JSON.parse(template.pageData) : template.pageData;
        if (pageData.sections) {
          const store = usePageBuilderStore.getState();
          for (const section of pageData.sections) {
            store.addSection(section.type || 'custom');
          }
        }
      }
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-gray-800/30 animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <LayoutTemplate className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No templates available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleUseTemplate(t.id)}
                className="group p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 hover:border-emerald-600/50 transition-all text-left"
              >
                <div className="h-16 rounded bg-gradient-to-br from-emerald-900/30 to-gray-800 mb-2 flex items-center justify-center">
                  <LayoutTemplate className="h-6 w-6 text-emerald-600/50 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-xs font-medium text-gray-200 truncate">{t.name}</p>
                <p className="text-[10px] text-gray-500 capitalize">{t.category}</p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============ LEFT PANEL ============
export function LeftPanel() {
  const leftPanelOpen = usePageBuilderStore((s) => s.leftPanelOpen);
  const leftPanelTab = usePageBuilderStore((s) => s.leftPanelTab);
  const setLeftPanelTab = usePageBuilderStore((s) => s.setLeftPanelTab);

  if (!leftPanelOpen) return null;

  return (
    <div className="w-[280px] bg-gray-900 border-r border-gray-700 flex flex-col shrink-0">
      <Tabs value={leftPanelTab} onValueChange={(v) => setLeftPanelTab(v as 'widgets' | 'sections' | 'templates')} className="flex flex-col h-full">
        <TabsList className="bg-gray-800 mx-2 mt-2 mb-0 h-9 p-0.5">
          <TabsTrigger value="widgets" className="text-[11px] h-7 data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400 px-3">Widgets</TabsTrigger>
          <TabsTrigger value="sections" className="text-[11px] h-7 data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400 px-3">Sections</TabsTrigger>
          <TabsTrigger value="templates" className="text-[11px] h-7 data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400 px-3">Templates</TabsTrigger>
        </TabsList>
        <Separator className="bg-gray-700/50 mt-1" />
        <TabsContent value="widgets" className="flex-1 mt-0 overflow-hidden">
          <WidgetsTab />
        </TabsContent>
        <TabsContent value="sections" className="flex-1 mt-0 overflow-hidden">
          <SectionsTab />
        </TabsContent>
        <TabsContent value="templates" className="flex-1 mt-0 overflow-hidden">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}