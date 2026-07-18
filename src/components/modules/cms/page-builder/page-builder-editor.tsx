'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/store';
import { useBuilderStore, WIDGET_DEFINITIONS, generateId } from './store';
import { renderWidget } from './widgets';
import type {
  SectionNode, ColumnNode, WidgetNode, WidgetType,
  SelectionState, Breakpoint, AnyWidgetProps, WidgetDefinition,
  HeadingProps, TextProps, ButtonProps, ImageProps, VideoProps,
  SpacerProps, DividerProps, IconProps, CardProps, CounterProps,
  FaqProps, GalleryProps, TestimonialProps, TeamCardProps,
  ServiceCardProps, ContactFormProps, MapProps, CarouselProps,
  TimelineProps, HtmlBlockProps, QrCodeProps, FaqItem, TimelineItem,
} from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft, Save, Eye, Monitor, Tablet, Smartphone, Undo2, Redo2, Plus,
  Trash2, Copy, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, GripVertical,
  Settings, Layers, MousePointer, Wand2, Move, EyeOff, X,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Type,
  ImageIcon, Video, Layout, Square, Minus, Star, HelpCircle, Grid3X3,
  MapPin, Code, QrCode, Clock, MessageSquare, User, Briefcase,
  FileText, Paintbrush, Palette, Sparkles, Check, AlertCircle, Search,
  Image as ImageIconLucide, Loader2,
} from 'lucide-react';
import type { DragOverEvent } from '@dnd-kit/core';
import {
  DndContext, DragOverlay, closestCenter, useSensor, useSensors,
  PointerSensor, useDraggable, useDroppable, DragStartEvent, DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

// ============================================================================
// Constants
// ============================================================================

const BREAKPOINT_WIDTHS: Record<Breakpoint, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

const WIDGET_CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  content: 'Content',
  media: 'Media',
  interactive: 'Interactive',
  advanced: 'Advanced',
};

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'fadeInUp', label: 'Fade In Up' },
  { value: 'fadeInDown', label: 'Fade In Down' },
  { value: 'fadeInLeft', label: 'Fade In Left' },
  { value: 'fadeInRight', label: 'Fade In Right' },
  { value: 'scaleIn', label: 'Scale In' },
  { value: 'slideInLeft', label: 'Slide In Left' },
  { value: 'slideInRight', label: 'Slide In Right' },
];

// ============================================================================
// Icon Helper
// ============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  Type, Star, Minus, MousePointer, HelpCircle, Grid3X3, MapPin, Code, QrCode,
  Clock, MessageSquare, User, Briefcase, ImageIconLucide, Video, FileText,
  Settings, Layout, Square, Palette, Paintbrush, Sparkles, Check, AlertCircle,
  Plus, Eye, EyeOff, Copy, Trash2, GripVertical, Search, ChevronRight,
  ChevronDown, ChevronLeft, ChevronUp, Wand2, Move, Layers, ArrowLeft,
  Save, Monitor, Tablet, Smartphone, Undo2, Redo2, X, PanelLeftClose,
  PanelLeftOpen, PanelRightClose, PanelRightOpen, Loader2,
};

function resolveIcon(name: string, fallbackSize = 18): React.ReactNode {
  const IconComp = ICON_MAP[name] || Layout;
  return <IconComp size={fallbackSize} />;
}

// ============================================================================
// Reusable Property Field Components
// ============================================================================

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-300">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 rounded-md border border-zinc-600 overflow-hidden shrink-0">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="h-full w-full rounded-md border border-zinc-700"
            style={{ backgroundColor: value || 'transparent' }}
          />
        </div>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200"
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-300">{label}</Label>
      <Input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-300">{label}</Label>
      <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="bg-zinc-800 border-zinc-700 text-xs text-zinc-200 resize-none"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-300">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200 flex-1"
        />
        {unit && <span className="text-xs text-zinc-500 w-8 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-300">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs text-zinc-200">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs font-medium text-zinc-300">{label}</Label>
      <Switch checked={!!value} onCheckedChange={onChange} />
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-zinc-300">{label}</Label>
        <span className="text-xs text-zinc-400">{value ?? 0}{unit || ''}</span>
      </div>
      <Slider
        value={[value ?? 0]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
    </div>
  );
}

// ============================================================================
// Section Factory
// ============================================================================

function createDefaultSection(name: string, columnCount = 1): SectionNode {
  const colWidth = Math.floor(100 / columnCount);
  const remainder = 100 - colWidth * columnCount;
  const columns: ColumnNode[] = [];
  for (let i = 0; i < columnCount; i++) {
    columns.push({
      id: generateId(),
      width: colWidth + (i === 0 ? remainder : 0),
      widgets: [],
    });
  }
  return {
    id: generateId(),
    type: 'section',
    name: name || `Section ${Date.now()}`,
    props: {
      background: '',
      backgroundImage: '',
      backgroundOverlay: '',
      padding: '40px 0',
      margin: '0',
      fullWidth: false,
      maxWidth: '1200px',
      borderRadius: '0',
      boxShadow: 'none',
      border: 'none',
      hidden: false,
    },
    columns,
  };
}

// ============================================================================
// Top Toolbar
// ============================================================================

function TopToolbar({
  pageId,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeft,
  onToggleRight,
  onSave,
  onPublish,
  isSaving,
  hasUnsavedChanges,
}: {
  pageId: string;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onSave: () => void;
  onPublish: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}) {
  const {
    pageTitle, pageStatus, setPageData: _s,
    breakpoint, setBreakpoint, isPreviewMode, setIsPreviewMode,
    undo, redo, undoStack, redoStack,
    setHasUnsavedChanges,
  } = useBuilderStore();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(pageTitle);

  useEffect(() => {
    setTitleDraft(pageTitle);
  }, [pageTitle]);

  const handleTitleSave = useCallback(() => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== pageTitle) {
      setHasUnsavedChanges(true);
      // Update title in store
      useBuilderStore.setState({ pageTitle: titleDraft.trim(), hasUnsavedChanges: true });
    }
  }, [titleDraft, pageTitle, setHasUnsavedChanges]);

  return (
    <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-3 gap-2 shrink-0 z-30">
      {/* Left section */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              onClick={() => useAppStore.getState().setView('cms-page-builder-list')}
            >
              <ArrowLeft size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to Pages</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-zinc-700" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              onClick={onToggleLeft}
            >
              {leftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{leftPanelOpen ? 'Hide Panel' : 'Show Panel'}</TooltipContent>
        </Tooltip>

        {editingTitle ? (
          <Input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(pageTitle); } }}
            className="h-8 w-48 bg-zinc-800 border-zinc-600 text-sm text-zinc-200"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-sm font-medium text-zinc-200 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors truncate max-w-[200px]"
          >
            {pageTitle || 'Untitled Page'}
          </button>
        )}

        <Badge
          variant={pageStatus === 'published' ? 'default' : 'secondary'}
          className={pageStatus === 'published'
            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30 text-[10px] px-2'
            : 'bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-2'
          }
        >
          {pageStatus === 'published' ? 'Published' : 'Draft'}
        </Badge>
      </div>

      {/* Center section: undo/redo */}
      <div className="flex-1 flex items-center justify-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              <Undo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30"
              onClick={redo}
              disabled={redoStack.length === 0}
            >
              <Redo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      {/* Right section: save/publish/preview/breakpoint */}
      <div className="flex items-center gap-2">
        {/* Save status */}
        {isSaving && (
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Loader2 size={14} className="animate-spin" /> Saving...
          </span>
        )}
        {!isSaving && hasUnsavedChanges && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle size={14} /> Unsaved
          </span>
        )}
        {!isSaving && !hasUnsavedChanges && pageTitle && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Check size={14} /> Saved
          </span>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200 hover:bg-zinc-700"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save size={14} className="mr-1" /> Save Draft
        </Button>

        <Button
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
          onClick={onPublish}
          disabled={isSaving}
        >
          <Sparkles size={14} className="mr-1" /> Publish
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPreviewMode ? 'default' : 'ghost'}
              size="icon"
              className={`h-8 w-8 ${isPreviewMode ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Preview</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-zinc-700" />

        {/* Breakpoint switcher */}
        <div className="flex items-center bg-zinc-800 rounded-md p-0.5">
          {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map((bp) => (
            <Tooltip key={bp}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setBreakpoint(bp)}
                  className={`p-1.5 rounded transition-colors ${
                    breakpoint === bp
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {bp === 'desktop' && <Monitor size={16} />}
                  {bp === 'tablet' && <Tablet size={16} />}
                  {bp === 'mobile' && <Smartphone size={16} />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {BREAKPOINT_LABELS[bp]} {bp !== 'desktop' && `(${BREAKPOINT_WIDTHS[bp]})`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {breakpoint !== 'desktop' && (
          <span className="text-[10px] text-zinc-500 tabular-nums">{BREAKPOINT_WIDTHS[breakpoint]}</span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              onClick={onToggleRight}
            >
              {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{rightPanelOpen ? 'Hide Settings' : 'Show Settings'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ============================================================================
// Left Panel: Widget Panel
// ============================================================================

function DraggableWidgetCard({ def }: { def: WidgetDefinition }) {
  const { addWidget, schema, selectedElement, selectElement, clearSelection } = useBuilderStore();

  const handleAdd = useCallback(() => {
    const newWidget: WidgetNode = {
      id: generateId(),
      type: def.type,
      name: def.label,
      props: { ...def.defaultProps } as AnyWidgetProps,
    };

    // If a column is selected, add there. Otherwise, use first column of last section.
    if (selectedElement.columnId) {
      addWidget(selectedElement.sectionId!, selectedElement.columnId, newWidget);
      selectElement({ sectionId: selectedElement.sectionId!, columnId: selectedElement.columnId, widgetId: newWidget.id });
    } else if (schema.sections.length > 0) {
      const lastSection = schema.sections[schema.sections.length - 1];
      const firstCol = lastSection.columns[0];
      if (firstCol) {
        addWidget(lastSection.id, firstCol.id, newWidget);
        selectElement({ sectionId: lastSection.id, columnId: firstCol.id, widgetId: newWidget.id });
      }
    } else {
      toast.info('Add a section first, then add widgets.');
    }
  }, [def, addWidget, schema, selectedElement, selectElement]);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `widget-palette-${def.type}`,
    data: { type: 'palette-widget', widgetDef: def },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex flex-col items-center justify-center p-3 rounded-lg border border-zinc-700/50 bg-zinc-800/50 cursor-grab active:cursor-grabbing hover:border-emerald-600/50 hover:bg-zinc-800 transition-all group"
      onClick={handleAdd}
    >
      <div className="text-zinc-400 group-hover:text-emerald-400 transition-colors mb-1.5">
        {resolveIcon(def.icon, 20)}
      </div>
      <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 text-center leading-tight transition-colors">
        {def.label}
      </span>
    </div>
  );
}

function LayersTree() {
  const { schema, selectedElement, selectElement, removeSection, removeWidget } = useBuilderStore();

  return (
    <div className="space-y-1">
      {schema.sections.length === 0 && (
        <p className="text-xs text-zinc-500 text-center py-6">No sections yet</p>
      )}
      {schema.sections.map((section, sIdx) => (
        <Collapsible key={section.id} defaultOpen>
          <div
            className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer group text-xs transition-colors ${
              selectedElement.sectionId === section.id && !selectedElement.columnId && !selectedElement.widgetId
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30'
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
            onClick={() => selectElement({ sectionId: section.id, columnId: null, widgetId: null })}
          >
            <CollapsibleTrigger className="p-0 hover:bg-transparent">
              <ChevronRight size={12} className="shrink-0 transition-transform [[data-state=open]>&]:rotate-90" />
            </CollapsibleTrigger>
            <Layout size={12} className="shrink-0" />
            <span className="truncate flex-1">{section.name || `Section ${sIdx + 1}`}</span>
            {section.props.hidden && (
              <EyeOff size={10} className="text-zinc-600 shrink-0" />
            )}
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity shrink-0"
              onClick={(e) => { e.stopPropagation(); removeSection(section.id); toast.success('Section deleted'); }}
            >
              <Trash2 size={10} />
            </button>
          </div>
          <CollapsibleContent>
            {section.columns.map((col) => (
              <div key={col.id} className="ml-4">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors ${
                    selectedElement.columnId === col.id && !selectedElement.widgetId
                      ? 'bg-zinc-700 text-zinc-200 border border-zinc-600'
                      : 'hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                  onClick={() => selectElement({ sectionId: section.id, columnId: col.id, widgetId: null })}
                >
                  <Columns3Icon size={10} className="shrink-0" />
                  <span>Column {col.width}%</span>
                </div>
                {col.widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className={`flex items-center gap-1 ml-4 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors ${
                      selectedElement.widgetId === widget.id
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30'
                        : 'hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                    onClick={() => selectElement({ sectionId: section.id, columnId: col.id, widgetId: widget.id })}
                  >
                    {resolveIcon(
                      WIDGET_DEFINITIONS.find((d) => d.type === widget.type)?.icon || 'Square',
                      10
                    )}
                    <span className="truncate flex-1">{widget.name}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWidget(section.id, col.id, widget.id);
                        toast.success('Widget deleted');
                      }}
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
                {col.widgets.length === 0 && (
                  <div className="ml-4 text-[10px] text-zinc-600 px-2 py-1 italic">Empty</div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

function Columns3Icon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}


function WidgetPanel() {
  const { leftPanel, setLeftPanel } = useBuilderStore();
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const filtered = search.trim()
      ? WIDGET_DEFINITIONS.filter((d) =>
          d.label.toLowerCase().includes(search.toLowerCase()) ||
          d.category.toLowerCase().includes(search.toLowerCase())
        )
      : WIDGET_DEFINITIONS;

    const groups: Record<string, WidgetDefinition[]> = {};
    filtered.forEach((d) => {
      if (!groups[d.category]) groups[d.category] = [];
      groups[d.category].push(d);
    });
    return groups;
  }, [search]);

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <Tabs value={leftPanel} onValueChange={(v) => setLeftPanel(v as typeof leftPanel)} className="h-full flex flex-col">
        <div className="px-3 pt-3 pb-0">
          <TabsList className="w-full bg-zinc-900 h-9">
            <TabsTrigger value="widgets" className="text-xs flex-1 gap-1.5 data-[state=active]:bg-zinc-800">
              <Grid3X3 size={13} /> Widgets
            </TabsTrigger>
            <TabsTrigger value="layers" className="text-xs flex-1 gap-1.5 data-[state=active]:bg-zinc-800">
              <Layers size={13} /> Layers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="widgets" className="flex-1 overflow-hidden mt-0">
          <div className="px-3 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search widgets..."
                className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200 pl-8"
              />
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-48px)]">
            <div className="px-3 pb-4 space-y-4">
              {Object.entries(categories).map(([cat, widgets]) => (
                <Collapsible key={cat} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 hover:text-zinc-200 transition-colors">
                    <ChevronRight size={12} className="transition-transform [[data-state=open]>&]:rotate-90" />
                    {WIDGET_CATEGORY_LABELS[cat] || cat}
                    <span className="text-zinc-600 font-normal ml-auto">{widgets.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-3 gap-1.5">
                      {widgets.map((def) => (
                        <DraggableWidgetCard key={def.type} def={def} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="layers" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="px-2 py-3">
              <LayersTree />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Center Panel: Canvas Panel
// ============================================================================

function CanvasSection({
  section,
  index,
}: {
  section: SectionNode;
  index: number;
}) {
  const {
    selectedElement, selectElement, isPreviewMode, breakpoint,
    removeSection, duplicateSection, moveSection,
    updateSection,
  } = useBuilderStore();
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedElement.sectionId === section.id;

  const isMobileView = breakpoint === 'mobile';
  const isTabletView = breakpoint === 'tablet';

  const sectionStyle: React.CSSProperties = {
    background: section.props.background || undefined,
    backgroundImage: section.props.backgroundImage ? `url(${section.props.backgroundImage})` : undefined,
    padding: isMobileView
      ? (section.props.padding ? String(section.props.padding).replace(/(\d+)/g, (m) => String(Math.round(Number(m) * 0.6))) : undefined)
      : (section.props.padding || undefined),
    margin: section.props.margin || undefined,
    borderRadius: section.props.borderRadius || undefined,
    boxShadow: section.props.boxShadow || undefined,
    border: section.props.border || undefined,
    position: 'relative' as const,
    maxWidth: section.props.fullWidth || isMobileView ? '100%' : (section.props.maxWidth || '1200px'),
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: section.props.hidden ? 'none' : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const sectionDropId = `section-drop-${section.id}`;

  return (
    <div
      className={`relative group ${section.props.hidden ? 'opacity-40' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        selectElement({ sectionId: section.id, columnId: null, widgetId: null });
      }}
    >
      {/* Section hover/selected overlay */}
      {!isPreviewMode && (
        <div
          className={`absolute inset-0 z-10 pointer-events-none rounded transition-all ${
            isSelected ? 'ring-2 ring-emerald-500' : hovered ? 'ring-1 ring-dashed ring-emerald-500/50' : ''
          }`}
          style={{ border: isSelected ? undefined : hovered ? '1px dashed rgba(0,167,111,0.5)' : undefined, top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      {/* Background overlay */}
      {section.props.backgroundOverlay && (
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: section.props.backgroundOverlay }}
        />
      )}

      {/* Section toolbar */}
      {!isPreviewMode && hovered && (
        <div className="absolute -top-8 left-2 z-20 flex items-center gap-0.5 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg px-1 py-0.5">
          <span className="text-[10px] text-zinc-300 px-1.5 py-0.5 max-w-[120px] truncate font-medium">
            {section.name || `Section ${index + 1}`}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
              >
                <ChevronUp size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Move Up</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
              >
                <ChevronDown size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Move Down</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); toast.success('Section duplicated'); }}
              >
                <Copy size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Duplicate</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  updateSection(section.id, { hidden: !section.props.hidden });
                }}
              >
                {section.props.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{section.props.hidden ? 'Show' : 'Hide'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); removeSection(section.id); toast.success('Section deleted'); }}
              >
                <Trash2 size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Section content */}
      <div style={sectionStyle} className="relative z-[1]">
        <div className={
          section.props.fullWidth ? '' : (isMobileView ? 'px-3' : 'px-4')
        } style={{
          display: 'flex',
          flexDirection: isMobileView ? 'column' : 'row',
          gap: isMobileView ? '0' : (isTabletView ? '12px' : '16px'),
        }}>
          {section.columns.map((col) => (
            <CanvasColumn
              key={col.id}
              column={col}
              section={section}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CanvasColumn({
  column,
  section,
}: {
  column: ColumnNode;
  section: SectionNode;
}) {
  const { selectedElement, selectElement, isPreviewMode, breakpoint } = useBuilderStore();
  const [hovered, setHovered] = useState(false);
  const isSelectedCol = selectedElement.columnId === column.id && !selectedElement.widgetId;

  const isMobileView = breakpoint === 'mobile';
  const isTabletView = breakpoint === 'tablet';

  return (
    <div
      className={`relative min-h-[60px] transition-all ${
        isSelectedCol ? 'ring-2 ring-blue-500 rounded' : hovered ? '' : ''
      }`}
      style={{
        flex: isMobileView ? '1 1 100%' : `${column.width} 0 0`,
        maxWidth: isMobileView ? '100%' : (isTabletView ? `${column.width}%` : `${column.width}%`),
        width: isMobileView ? '100%' : undefined,
        background: column.widgets.length === 0 && !isPreviewMode ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,167,111,0.03) 5px, rgba(0,167,111,0.03) 10px)' : undefined,
        border: hovered && !isPreviewMode ? '1px dashed rgba(59,130,246,0.5)' : undefined,
        borderRadius: '4px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        selectElement({ sectionId: section.id, columnId: column.id, widgetId: null });
      }}
    >
      {/* Column width indicator */}
      {!isPreviewMode && hovered && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
          {isMobileView ? '100%' : `${column.width}%`}
        </div>
      )}

      {/* Widgets */}
      {column.widgets.map((widget) => (
        <CanvasWidget
          key={widget.id}
          widget={widget}
          section={section}
          column={column}
        />
      ))}

      {/* Empty column placeholder */}
      {column.widgets.length === 0 && !isPreviewMode && (
        <div className="flex flex-col items-center justify-center py-8 text-zinc-400 pointer-events-none">
          <Plus size={20} className="mb-1 opacity-30" />
          <span className="text-[10px] opacity-50">Drop widgets here</span>
        </div>
      )}
    </div>
  );
}

function CanvasWidget({
  widget,
  section,
  column,
}: {
  widget: WidgetNode;
  section: SectionNode;
  column: ColumnNode;
}) {
  const { selectedElement, selectElement, isPreviewMode, removeWidget, duplicateWidget, breakpoint } = useBuilderStore();
  const [hovered, setHovered] = useState(false);
  const isSelectedWidget = selectedElement.widgetId === widget.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `canvas-widget-${widget.id}`,
    data: {
      type: 'canvas-widget',
      widget,
      sectionId: section.id,
      columnId: column.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/widget cursor-pointer transition-all ${
        isSelectedWidget ? 'ring-2 ring-emerald-500 rounded' : ''
      } ${hovered && !isPreviewMode && !isSelectedWidget ? 'ring-1 ring-emerald-500/30 rounded' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        selectElement({ sectionId: section.id, columnId: column.id, widgetId: widget.id });
      }}
    >
      {/* Widget toolbar */}
      {!isPreviewMode && hovered && (
        <div className="absolute -top-7 right-0 z-20 flex items-center gap-0.5 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg px-1 py-0.5">
          <span className="text-[9px] text-zinc-400 px-1">{widget.name}</span>
          <button
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            onClick={(e) => { e.stopPropagation(); duplicateWidget(section.id, column.id, widget.id); toast.success('Widget duplicated'); }}
          >
            <Copy size={10} />
          </button>
          <button
            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
            onClick={(e) => { e.stopPropagation(); removeWidget(section.id, column.id, widget.id); toast.success('Widget deleted'); }}
          >
            <Trash2 size={10} />
          </button>
          <div {...attributes} {...listeners} className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-grab">
            <GripVertical size={10} />
          </div>
        </div>
      )}

      {/* Render the actual widget */}
      <div className={isPreviewMode ? '' : 'pointer-events-none'}>
        {renderWidget(widget, breakpoint)}
      </div>
    </div>
  );
}

function CanvasPanel() {
  const { schema, breakpoint, isPreviewMode, addSection, clearSelection, isDragging } = useBuilderStore();

  const canvasWidth = breakpoint === 'desktop' ? '100%' : BREAKPOINT_WIDTHS[breakpoint];

  const handleCanvasClick = useCallback(() => {
    if (!isPreviewMode) clearSelection();
  }, [isPreviewMode, clearSelection]);

  const handleAddSection = useCallback(() => {
    const section = createDefaultSection(`Section ${schema.sections.length + 1}`, 1);
    addSection(section);
    toast.success('Section added');
  }, [schema.sections.length, addSection]);

  return (
    <div
      className="flex-1 bg-zinc-200 overflow-auto relative"
      onClick={handleCanvasClick}
    >
      <div
        className="mx-auto bg-white min-h-full shadow-lg transition-all duration-300"
        style={{
          width: canvasWidth,
          maxWidth: '100%',
        }}
      >
        {/* Page content */}
        {schema.sections.length > 0 ? (
          <div className={`${isPreviewMode ? '' : 'py-2'}`}>
            {schema.sections.map((section, index) => (
              <CanvasSection key={section.id} section={section} index={index} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
            <Layout size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">No sections yet</p>
            <p className="text-sm mb-6">Click the + button below to add your first section</p>
          </div>
        )}

        {/* Drop zone indicator when dragging */}
        {isDragging && !isPreviewMode && (
          <div className="h-16 mx-4 my-2 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center bg-emerald-50/50">
            <span className="text-sm text-emerald-500 font-medium">Drop here to add widget</span>
          </div>
        )}

        {/* Add section button */}
        {!isPreviewMode && (
          <div className="flex justify-center py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-dashed border-zinc-400 text-zinc-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 gap-2"
                >
                  <Plus size={18} /> Add Section
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-white border-zinc-200 p-3" side="top">
                <p className="text-xs font-medium text-zinc-700 mb-2">Choose section layout</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { cols: 1, label: '1 Column', icon: '┃' },
                    { cols: 2, label: '2 Columns', icon: '┃┃' },
                    { cols: 3, label: '3 Columns', icon: '┃┃┃' },
                    { cols: 4, label: '4 Columns', icon: '┃┃┃┃' },
                    { cols: 2, label: '2:1 Split', icon: '┃┃' },
                    { cols: 3, label: '1:2 Split', icon: '┃┃┃' },
                  ].map((layout) => (
                    <button
                      key={layout.label}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                      onClick={() => {
                        const section = createDefaultSection(
                          `${layout.label} Section`,
                          layout.cols
                        );
                        addSection(section);
                        toast.success(`${layout.label} section added`);
                      }}
                    >
                      <span className="text-lg text-zinc-500 font-mono">{layout.icon}</span>
                      <span className="text-[10px] text-zinc-500">{layout.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Right Panel: Properties Panel
// ============================================================================

function AdvancedPropsSection({
  props,
  onChange,
}: {
  props: AnyWidgetProps;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 hover:text-zinc-200 transition-colors">
        <ChevronRight size={12} className="transition-transform [[data-state=open]>&]:rotate-90" />
        Advanced
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 pb-4">
          <TextField
            label="Padding"
            value={(props as unknown as Record<string, unknown>).padding as string | undefined}
            onChange={(v) => onChange('padding', v)}
            placeholder="e.g. 16px"
          />
          <TextField
            label="Margin"
            value={(props as unknown as Record<string, unknown>).margin as string | undefined}
            onChange={(v) => onChange('margin', v)}
            placeholder="e.g. 8px"
          />
          <ColorPickerField
            label="Background Color"
            value={(props as unknown as Record<string, unknown>).background as string || ''}
            onChange={(v) => onChange('background', v)}
          />
          <TextField
            label="Border Radius"
            value={(props as unknown as Record<string, unknown>).borderRadius as string | undefined}
            onChange={(v) => onChange('borderRadius', v)}
            placeholder="e.g. 8px"
          />
          <TextField
            label="Box Shadow"
            value={(props as unknown as Record<string, unknown>).boxShadow as string | undefined}
            onChange={(v) => onChange('boxShadow', v)}
            placeholder="e.g. 0 2px 8px rgba(0,0,0,0.1)"
          />
          <TextField
            label="Border"
            value={(props as unknown as Record<string, unknown>).border as string | undefined}
            onChange={(v) => onChange('border', v)}
            placeholder="e.g. 1px solid #e5e7eb"
          />
          <SliderField
            label="Opacity"
            value={(props as unknown as Record<string, unknown>).opacity as number | undefined}
            onChange={(v) => onChange('opacity', v)}
            min={0}
            max={1}
            step={0.05}
          />
          <SelectField
            label="Animation"
            value={((props as unknown as Record<string, unknown>).animation as string) || 'none'}
            onChange={(v) => onChange('animation', v)}
            options={ANIMATION_OPTIONS}
          />
          {((props as unknown as Record<string, unknown>).animation as string) && (props as unknown as Record<string, unknown>).animation !== 'none' && (
            <>
              <NumberField
                label="Duration (ms)"
                value={(props as unknown as Record<string, unknown>).animationDuration as number | undefined}
                onChange={(v) => onChange('animationDuration', v)}
                min={100}
                max={5000}
                step={100}
                unit="ms"
              />
              <NumberField
                label="Delay (ms)"
                value={(props as unknown as Record<string, unknown>).animationDelay as number | undefined}
                onChange={(v) => onChange('animationDelay', v)}
                min={0}
                max={5000}
                step={100}
                unit="ms"
              />
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Per-widget property editors

function HeadingProperties({ props, onChange }: { props: HeadingProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Text" value={props.text} onChange={(v) => onChange('text', v)} />
      <SelectField label="Tag" value={props.tag} onChange={(v) => onChange('tag', v)} options={[
        { value: 'h1', label: 'H1' }, { value: 'h2', label: 'H2' }, { value: 'h3', label: 'H3' },
        { value: 'h4', label: 'H4' }, { value: 'h5', label: 'H5' }, { value: 'h6', label: 'H6' },
      ]} />
      <NumberField label="Font Size" value={props.fontSize} onChange={(v) => onChange('fontSize', v)} min={12} max={120} unit="px" />
      <SelectField label="Font Weight" value={props.fontWeight || '700'} onChange={(v) => onChange('fontWeight', v)} options={[
        { value: '300', label: 'Light' }, { value: '400', label: 'Regular' }, { value: '500', label: 'Medium' },
        { value: '600', label: 'Semibold' }, { value: '700', label: 'Bold' }, { value: '800', label: 'Extrabold' },
      ]} />
      <ColorPickerField label="Color" value={props.color || ''} onChange={(v) => onChange('color', v)} />
      <SelectField label="Text Align" value={props.textAlign || 'left'} onChange={(v) => onChange('textAlign', v)} options={[
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
      ]} />
      <NumberField label="Line Height" value={props.lineHeight} onChange={(v) => onChange('lineHeight', v)} min={0.8} max={3} step={0.1} />
      <NumberField label="Letter Spacing" value={props.letterSpacing} onChange={(v) => onChange('letterSpacing', v)} min={-5} max={20} step={0.5} unit="px" />
      <NumberField label="Margin Bottom" value={props.marginBottom} onChange={(v) => onChange('marginBottom', v)} min={0} max={100} unit="px" />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function TextProperties({ props, onChange }: { props: TextProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextAreaField label="Content" value={props.content} onChange={(v) => onChange('content', v)} rows={5} />
      <NumberField label="Font Size" value={props.fontSize} onChange={(v) => onChange('fontSize', v)} min={10} max={48} unit="px" />
      <SelectField label="Font Weight" value={props.fontWeight || '400'} onChange={(v) => onChange('fontWeight', v)} options={[
        { value: '300', label: 'Light' }, { value: '400', label: 'Regular' }, { value: '500', label: 'Medium' },
        { value: '600', label: 'Semibold' }, { value: '700', label: 'Bold' },
      ]} />
      <ColorPickerField label="Color" value={props.color || ''} onChange={(v) => onChange('color', v)} />
      <SelectField label="Text Align" value={props.textAlign || 'left'} onChange={(v) => onChange('textAlign', v)} options={[
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
      ]} />
      <NumberField label="Line Height" value={props.lineHeight} onChange={(v) => onChange('lineHeight', v)} min={0.8} max={3} step={0.1} />
      <NumberField label="Max Width" value={props.maxWidth} onChange={(v) => onChange('maxWidth', v)} min={200} max={1400} unit="px" />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function ButtonProperties({ props, onChange }: { props: ButtonProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Text" value={props.text} onChange={(v) => onChange('text', v)} />
      <SelectField label="Variant" value={props.variant} onChange={(v) => onChange('variant', v)} options={[
        { value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' },
        { value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }, { value: 'link', label: 'Link' },
      ]} />
      <SelectField label="Size" value={props.size} onChange={(v) => onChange('size', v)} options={[
        { value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' },
      ]} />
      <TextField label="URL" value={props.url || ''} onChange={(v) => onChange('url', v)} placeholder="https://..." />
      <SwitchField label="Full Width" value={props.fullWidth} onChange={(v) => onChange('fullWidth', v)} />
      <TextField label="Border Radius" value={props.borderRadius || ''} onChange={(v) => onChange('borderRadius', v)} placeholder="e.g. 8px" />
      <TextField label="Icon (Lucide name)" value={props.icon || ''} onChange={(v) => onChange('icon', v)} placeholder="e.g. ArrowRight" />
      <SelectField label="Icon Position" value={props.iconPosition || 'left'} onChange={(v) => onChange('iconPosition', v)} options={[
        { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
      ]} />
      <SelectField label="Target" value={props.target || '_self'} onChange={(v) => onChange('target', v)} options={[
        { value: '_self', label: 'Same Window' }, { value: '_blank', label: 'New Window' },
      ]} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function ImageProperties({ props, onChange }: { props: ImageProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Image URL" value={props.src} onChange={(v) => onChange('src', v)} placeholder="https://..." />
      <TextField label="Alt Text" value={props.alt} onChange={(v) => onChange('alt', v)} />
      <NumberField label="Width" value={props.width} onChange={(v) => onChange('width', v)} min={50} max={2000} unit="px" />
      <NumberField label="Height" value={props.height} onChange={(v) => onChange('height', v)} min={50} max={2000} unit="px" />
      <SelectField label="Object Fit" value={props.objectFit || 'cover'} onChange={(v) => onChange('objectFit', v)} options={[
        { value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Fill' }, { value: 'none', label: 'None' },
      ]} />
      <TextField label="Border Radius" value={props.borderRadius || ''} onChange={(v) => onChange('borderRadius', v)} placeholder="e.g. 12px" />
      <TextField label="Shadow" value={props.shadow || ''} onChange={(v) => onChange('shadow', v)} placeholder="e.g. 0 4px 12px rgba(0,0,0,0.1)" />
      <TextField label="Link" value={props.link || ''} onChange={(v) => onChange('link', v)} placeholder="https://..." />
      <TextField label="Caption" value={props.caption || ''} onChange={(v) => onChange('caption', v)} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function VideoProperties({ props, onChange }: { props: VideoProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Video URL" value={props.url} onChange={(v) => onChange('url', v)} placeholder="YouTube/Vimeo/MP4 URL" />
      <SelectField label="Type" value={props.type} onChange={(v) => onChange('type', v)} options={[
        { value: 'youtube', label: 'YouTube' }, { value: 'vimeo', label: 'Vimeo' }, { value: 'mp4', label: 'MP4' },
      ]} />
      <SwitchField label="Autoplay" value={props.autoplay} onChange={(v) => onChange('autoplay', v)} />
      <SwitchField label="Muted" value={props.muted} onChange={(v) => onChange('muted', v)} />
      <SwitchField label="Show Controls" value={props.controls} onChange={(v) => onChange('controls', v)} />
      <TextField label="Aspect Ratio" value={props.aspectRatio || ''} onChange={(v) => onChange('aspectRatio', v)} placeholder="16/9" />
      <TextField label="Border Radius" value={props.borderRadius || ''} onChange={(v) => onChange('borderRadius', v)} placeholder="e.g. 12px" />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function SpacerProperties({ props, onChange }: { props: SpacerProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <NumberField label="Height" value={props.height} onChange={(v) => onChange('height', v)} min={8} max={500} unit="px" />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function DividerProperties({ props, onChange }: { props: DividerProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <SelectField label="Style" value={props.style} onChange={(v) => onChange('style', v)} options={[
        { value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'double', label: 'Double' },
      ]} />
      <ColorPickerField label="Color" value={props.color || ''} onChange={(v) => onChange('color', v)} />
      <NumberField label="Weight" value={props.weight} onChange={(v) => onChange('weight', v)} min={1} max={10} unit="px" />
      <NumberField label="Width" value={props.width} onChange={(v) => onChange('width', v)} min={10} max={100} unit="%" />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function IconWidgetProperties({ props, onChange }: { props: IconProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Icon Name (Lucide)" value={props.name} onChange={(v) => onChange('name', v)} placeholder="e.g. Star, Heart, Shield" />
      <NumberField label="Size" value={props.size} onChange={(v) => onChange('size', v)} min={12} max={128} unit="px" />
      <ColorPickerField label="Color" value={props.color || ''} onChange={(v) => onChange('color', v)} />
      <ColorPickerField label="Background Color" value={props.bgColor || ''} onChange={(v) => onChange('bgColor', v)} />
      <SwitchField label="Rounded" value={props.rounded} onChange={(v) => onChange('rounded', v)} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function CardProperties({ props, onChange }: { props: CardProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Title" value={props.title} onChange={(v) => onChange('title', v)} />
      <TextAreaField label="Description" value={props.description || ''} onChange={(v) => onChange('description', v)} rows={3} />
      <TextField label="Image URL" value={props.image || ''} onChange={(v) => onChange('image', v)} placeholder="https://..." />
      <TextField label="Icon (Lucide)" value={props.icon || ''} onChange={(v) => onChange('icon', v)} placeholder="e.g. Star" />
      <TextField label="Link" value={props.link || ''} onChange={(v) => onChange('link', v)} placeholder="https://..." />
      <TextField label="Link Text" value={props.linkText || ''} onChange={(v) => onChange('linkText', v)} />
      <SelectField label="Variant" value={props.variant} onChange={(v) => onChange('variant', v)} options={[
        { value: 'default', label: 'Default' }, { value: 'elevated', label: 'Elevated' },
        { value: 'outlined', label: 'Outlined' }, { value: 'glass', label: 'Glass' },
      ]} />
      <SelectField label="Text Align" value={props.textAlign || 'left'} onChange={(v) => onChange('textAlign', v)} options={[
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' },
      ]} />
      <SwitchField label="Hover Effect" value={props.hoverEffect} onChange={(v) => onChange('hoverEffect', v)} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function CounterProperties({ props, onChange }: { props: CounterProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Label" value={props.label} onChange={(v) => onChange('label', v)} />
      <NumberField label="Value" value={props.value} onChange={(v) => onChange('value', v)} min={0} max={99999} />
      <TextField label="Prefix" value={props.prefix || ''} onChange={(v) => onChange('prefix', v)} placeholder="e.g. $" />
      <TextField label="Suffix" value={props.suffix || ''} onChange={(v) => onChange('suffix', v)} placeholder="e.g. +" />
      <NumberField label="Duration" value={props.duration} onChange={(v) => onChange('duration', v)} min={500} max={10000} step={100} unit="ms" />
      <NumberField label="Font Size" value={props.fontSize} onChange={(v) => onChange('fontSize', v)} min={20} max={120} unit="px" />
      <ColorPickerField label="Color" value={props.color || ''} onChange={(v) => onChange('color', v)} />
      <SelectField label="Text Align" value={props.textAlign || 'center'} onChange={(v) => onChange('textAlign', v)} options={[
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
      ]} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function FaqProperties({ props, onChange }: { props: FaqProps; onChange: (k: string, v: unknown) => void }) {
  const updateItem = (idx: number, field: 'question' | 'answer', value: string) => {
    const items = [...props.items];
    items[idx] = { ...items[idx], [field]: value };
    onChange('items', items);
  };
  const addItem = () => {
    onChange('items', [...props.items, { question: 'New Question', answer: 'New Answer' }]);
  };
  const removeItem = (idx: number) => {
    onChange('items', props.items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-zinc-300">FAQ Items</Label>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300" onClick={addItem}>
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>
      {props.items.map((item, idx) => (
        <div key={idx} className="space-y-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Item {idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="text-zinc-500 hover:text-red-400 transition-colors"><X size={12} /></button>
          </div>
          <Input value={item.question} onChange={(e) => updateItem(idx, 'question', e.target.value)} placeholder="Question" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <Textarea value={item.answer} onChange={(e) => updateItem(idx, 'answer', e.target.value)} placeholder="Answer" rows={2} className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 resize-none" />
        </div>
      ))}
      <SwitchField label="Allow Multiple Open" value={props.allowMultiple} onChange={(v) => onChange('allowMultiple', v)} />
      <SelectField label="Style" value={props.style} onChange={(v) => onChange('style', v)} options={[
        { value: 'default', label: 'Default' }, { value: 'bordered', label: 'Bordered' }, { value: 'minimal', label: 'Minimal' },
      ]} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function GalleryProperties({ props, onChange }: { props: GalleryProps; onChange: (k: string, v: unknown) => void }) {
  const updateImage = (idx: number, field: 'src' | 'alt' | 'caption', value: string) => {
    const images = [...props.images];
    images[idx] = { ...images[idx], [field]: value };
    onChange('images', images);
  };
  const addImage = () => {
    onChange('images', [...props.images, { src: '', alt: 'New image', caption: '' }]);
  };
  const removeImage = (idx: number) => {
    onChange('images', props.images.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-zinc-300">Images</Label>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300" onClick={addImage}>
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>
      {props.images.map((img, idx) => (
        <div key={idx} className="space-y-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Image {idx + 1}</span>
            <button onClick={() => removeImage(idx)} className="text-zinc-500 hover:text-red-400 transition-colors"><X size={12} /></button>
          </div>
          <Input value={img.src} onChange={(e) => updateImage(idx, 'src', e.target.value)} placeholder="Image URL" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <Input value={img.alt} onChange={(e) => updateImage(idx, 'alt', e.target.value)} placeholder="Alt text" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <Input value={img.caption || ''} onChange={(e) => updateImage(idx, 'caption', e.target.value)} placeholder="Caption" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
        </div>
      ))}
      <NumberField label="Columns" value={props.columns || 3} onChange={(v) => onChange('columns', v)} min={1} max={6} />
      <NumberField label="Gap" value={props.gap || 16} onChange={(v) => onChange('gap', v)} min={0} max={48} unit="px" />
      <TextField label="Border Radius" value={props.borderRadius || ''} onChange={(v) => onChange('borderRadius', v)} placeholder="e.g. 8px" />
      <SwitchField label="Lightbox" value={props.lightbox} onChange={(v) => onChange('lightbox', v)} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function TestimonialProperties({ props, onChange }: { props: TestimonialProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextAreaField label="Quote" value={props.quote} onChange={(v) => onChange('quote', v)} rows={3} />
      <TextField label="Author" value={props.author} onChange={(v) => onChange('author', v)} />
      <TextField label="Role" value={props.role || ''} onChange={(v) => onChange('role', v)} />
      <TextField label="Avatar URL" value={props.avatar || ''} onChange={(v) => onChange('avatar', v)} placeholder="https://..." />
      <NumberField label="Rating" value={props.rating} onChange={(v) => onChange('rating', v)} min={0} max={5} step={1} />
      <SelectField label="Variant" value={props.variant} onChange={(v) => onChange('variant', v)} options={[
        { value: 'default', label: 'Default' }, { value: 'card', label: 'Card' }, { value: 'minimal', label: 'Minimal' },
      ]} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function TeamCardProperties({ props, onChange }: { props: TeamCardProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Name" value={props.name} onChange={(v) => onChange('name', v)} />
      <TextField label="Role" value={props.role} onChange={(v) => onChange('role', v)} />
      <TextField label="Avatar URL" value={props.avatar || ''} onChange={(v) => onChange('avatar', v)} placeholder="https://..." />
      <TextAreaField label="Bio" value={props.bio || ''} onChange={(v) => onChange('bio', v)} rows={3} />
      <TextField label="Email" value={props.email || ''} onChange={(v) => onChange('email', v)} />
      <TextField label="Phone" value={props.phone || ''} onChange={(v) => onChange('phone', v)} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function ServiceCardProperties({ props, onChange }: { props: ServiceCardProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Title" value={props.title} onChange={(v) => onChange('title', v)} />
      <TextAreaField label="Description" value={props.description} onChange={(v) => onChange('description', v)} rows={3} />
      <TextField label="Icon (Lucide)" value={props.icon} onChange={(v) => onChange('icon', v)} placeholder="e.g. Server" />
      <TextField label="Image URL" value={props.image || ''} onChange={(v) => onChange('image', v)} placeholder="https://..." />
      <TextField label="Link" value={props.link || ''} onChange={(v) => onChange('link', v)} placeholder="https://..." />
      <TextField label="Link Text" value={props.linkText || ''} onChange={(v) => onChange('linkText', v)} />
      <SelectField label="Variant" value={props.variant} onChange={(v) => onChange('variant', v)} options={[
        { value: 'default', label: 'Default' }, { value: 'icon-top', label: 'Icon Top' }, { value: 'horizontal', label: 'Horizontal' },
      ]} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function ContactFormProperties({ props, onChange }: { props: ContactFormProps; onChange: (k: string, v: unknown) => void }) {
  const updateField = (idx: number, field: string, value: string | boolean) => {
    const fields = [...props.fields];
    fields[idx] = { ...fields[idx], [field]: value };
    onChange('fields', fields);
  };
  const addField = () => {
    onChange('fields', [...props.fields, { name: `field_${Date.now()}`, type: 'text', label: 'New Field', required: false, placeholder: '' }]);
  };
  const removeField = (idx: number) => {
    onChange('fields', props.fields.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-zinc-300">Form Fields</Label>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300" onClick={addField}>
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>
      {props.fields.map((field, idx) => (
        <div key={idx} className="space-y-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Field {idx + 1}</span>
            <button onClick={() => removeField(idx)} className="text-zinc-500 hover:text-red-400 transition-colors"><X size={12} /></button>
          </div>
          <Input value={field.label} onChange={(e) => updateField(idx, 'label', e.target.value)} placeholder="Label" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <SelectField label="Type" value={field.type} onChange={(v) => updateField(idx, 'type', v)} options={[
            { value: 'text', label: 'Text' }, { value: 'email', label: 'Email' }, { value: 'tel', label: 'Phone' },
            { value: 'textarea', label: 'Textarea' }, { value: 'select', label: 'Select' },
          ]} />
          <Input value={field.placeholder || ''} onChange={(e) => updateField(idx, 'placeholder', e.target.value)} placeholder="Placeholder" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <SwitchField label="Required" value={field.required} onChange={(v) => updateField(idx, 'required', v)} />
        </div>
      ))}
      <TextField label="Submit Text" value={props.submitText || 'Submit'} onChange={(v) => onChange('submitText', v)} />
      <SelectField label="Variant" value={props.variant} onChange={(v) => onChange('variant', v)} options={[
        { value: 'default', label: 'Default' }, { value: 'card', label: 'Card' }, { value: 'floating', label: 'Floating' },
      ]} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function MapProperties({ props, onChange }: { props: MapProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Address" value={props.address} onChange={(v) => onChange('address', v)} />
      <NumberField label="Latitude" value={props.lat} onChange={(v) => onChange('lat', v)} min={-90} max={90} step={0.001} />
      <NumberField label="Longitude" value={props.lng} onChange={(v) => onChange('lng', v)} min={-180} max={180} step={0.001} />
      <NumberField label="Zoom" value={props.zoom} onChange={(v) => onChange('zoom', v)} min={1} max={20} />
      <NumberField label="Height" value={props.height} onChange={(v) => onChange('height', v)} min={200} max={800} unit="px" />
      <SelectField label="Style" value={props.style || 'standard'} onChange={(v) => onChange('style', v)} options={[
        { value: 'standard', label: 'Standard' }, { value: 'satellite', label: 'Satellite' }, { value: 'dark', label: 'Dark' },
      ]} />
      <SwitchField label="Show Marker" value={props.marker} onChange={(v) => onChange('marker', v)} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function CarouselProperties({ props, onChange }: { props: CarouselProps; onChange: (k: string, v: unknown) => void }) {
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...props.items];
    items[idx] = { ...items[idx], [field]: value };
    onChange('items', items);
  };
  const addItem = () => {
    onChange('items', [...props.items, { image: '', title: `Slide ${props.items.length + 1}`, description: '' }]);
  };
  const removeItem = (idx: number) => {
    onChange('items', props.items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-zinc-300">Slides</Label>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300" onClick={addItem}>
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>
      {props.items.map((item, idx) => (
        <div key={idx} className="space-y-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Slide {idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="text-zinc-500 hover:text-red-400 transition-colors"><X size={12} /></button>
          </div>
          <Input value={item.image || ''} onChange={(e) => updateItem(idx, 'image', e.target.value)} placeholder="Image URL" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <Input value={item.title || ''} onChange={(e) => updateItem(idx, 'title', e.target.value)} placeholder="Title" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <Input value={item.description || ''} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
        </div>
      ))}
      <SwitchField label="Autoplay" value={props.autoplay} onChange={(v) => onChange('autoplay', v)} />
      <NumberField label="Interval" value={props.interval} onChange={(v) => onChange('interval', v)} min={1000} max={15000} step={500} unit="ms" />
      <SwitchField label="Show Dots" value={props.showDots} onChange={(v) => onChange('showDots', v)} />
      <SwitchField label="Show Arrows" value={props.showArrows} onChange={(v) => onChange('showArrows', v)} />
      <NumberField label="Height" value={props.height} onChange={(v) => onChange('height', v)} min={200} max={800} unit="px" />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function TimelineProperties({ props, onChange }: { props: TimelineProps; onChange: (k: string, v: unknown) => void }) {
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...props.items];
    items[idx] = { ...items[idx], [field]: value } as TimelineItem;
    onChange('items', items);
  };
  const addItem = () => {
    onChange('items', [...props.items, { date: '2024', title: 'New Event', description: 'Description', icon: '' }]);
  };
  const removeItem = (idx: number) => {
    onChange('items', props.items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-zinc-300">Timeline Items</Label>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300" onClick={addItem}>
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>
      {props.items.map((item, idx) => (
        <div key={idx} className="space-y-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Item {idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="text-zinc-500 hover:text-red-400 transition-colors"><X size={12} /></button>
          </div>
          <Input value={item.date} onChange={(e) => updateItem(idx, 'date', e.target.value)} placeholder="Date" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <Input value={item.title} onChange={(e) => updateItem(idx, 'title', e.target.value)} placeholder="Title" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
          <Textarea value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" rows={2} className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 resize-none" />
          <Input value={item.icon || ''} onChange={(e) => updateItem(idx, 'icon', e.target.value)} placeholder="Icon (Lucide)" className="h-7 bg-zinc-900 border-zinc-700 text-xs text-zinc-200" />
        </div>
      ))}
      <SelectField label="Orientation" value={props.orientation || 'vertical'} onChange={(v) => onChange('orientation', v)} options={[
        { value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' },
      ]} />
      <SelectField label="Variant" value={props.variant || 'default'} onChange={(v) => onChange('variant', v)} options={[
        { value: 'default', label: 'Default' }, { value: 'alternating', label: 'Alternating' },
      ]} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function HtmlBlockProperties({ props, onChange }: { props: HtmlBlockProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextAreaField label="HTML Content" value={props.content} onChange={(v) => onChange('content', v)} rows={10} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

function QrCodeProperties({ props, onChange }: { props: QrCodeProps; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="Value" value={props.value} onChange={(v) => onChange('value', v)} placeholder="https://..." />
      <NumberField label="Size" value={props.size} onChange={(v) => onChange('size', v)} min={100} max={500} unit="px" />
      <ColorPickerField label="Color" value={props.color || ''} onChange={(v) => onChange('color', v)} />
      <ColorPickerField label="Background" value={props.bgColor || ''} onChange={(v) => onChange('bgColor', v)} />
      <TextField label="Label" value={props.label || ''} onChange={(v) => onChange('label', v)} />
      <AdvancedPropsSection props={props as unknown as AnyWidgetProps} onChange={onChange} />
    </div>
  );
}

// Widget property router
function WidgetPropertyEditor({ widget }: { widget: WidgetNode }) {
  const { schema, updateWidget } = useBuilderStore();
  const sel = useBuilderStore((s) => s.selectedElement);

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      if (sel.sectionId && sel.columnId && sel.widgetId) {
        updateWidget(sel.sectionId, sel.columnId, sel.widgetId, { [key]: value } as Partial<AnyWidgetProps>);
      }
    },
    [sel, updateWidget]
  );

  const props = widget.props as unknown as Record<string, unknown>;

  switch (widget.type) {
    case 'heading': return <HeadingProperties props={widget.props as HeadingProps} onChange={handleChange} />;
    case 'text': return <TextProperties props={widget.props as TextProps} onChange={handleChange} />;
    case 'button': return <ButtonProperties props={widget.props as ButtonProps} onChange={handleChange} />;
    case 'image': return <ImageProperties props={widget.props as ImageProps} onChange={handleChange} />;
    case 'video': return <VideoProperties props={widget.props as VideoProps} onChange={handleChange} />;
    case 'spacer': return <SpacerProperties props={widget.props as SpacerProps} onChange={handleChange} />;
    case 'divider': return <DividerProperties props={widget.props as DividerProps} onChange={handleChange} />;
    case 'icon': return <IconWidgetProperties props={widget.props as IconProps} onChange={handleChange} />;
    case 'card': return <CardProperties props={widget.props as CardProps} onChange={handleChange} />;
    case 'counter': return <CounterProperties props={widget.props as CounterProps} onChange={handleChange} />;
    case 'faq': return <FaqProperties props={widget.props as FaqProps} onChange={handleChange} />;
    case 'gallery': return <GalleryProperties props={widget.props as GalleryProps} onChange={handleChange} />;
    case 'testimonial': return <TestimonialProperties props={widget.props as TestimonialProps} onChange={handleChange} />;
    case 'team-card': return <TeamCardProperties props={widget.props as TeamCardProps} onChange={handleChange} />;
    case 'service-card': return <ServiceCardProperties props={widget.props as ServiceCardProps} onChange={handleChange} />;
    case 'contact-form': return <ContactFormProperties props={widget.props as ContactFormProps} onChange={handleChange} />;
    case 'map': return <MapProperties props={widget.props as MapProps} onChange={handleChange} />;
    case 'carousel': return <CarouselProperties props={widget.props as CarouselProps} onChange={handleChange} />;
    case 'timeline': return <TimelineProperties props={widget.props as TimelineProps} onChange={handleChange} />;
    case 'html-block': return <HtmlBlockProperties props={widget.props as HtmlBlockProps} onChange={handleChange} />;
    case 'qr-code': return <QrCodeProperties props={widget.props as QrCodeProps} onChange={handleChange} />;
    default: return <p className="text-xs text-zinc-500">Unknown widget type</p>;
  }
}

// ============================================================================
// Properties Panel — section & column editors
// ============================================================================

function SectionProperties({ section }: { section: SectionNode }) {
  const { updateSection, removeSection, duplicateSection, moveSection } = useBuilderStore();

  const handleChange = (key: string, value: unknown) => {
    updateSection(section.id, { [key]: value } as Partial<SectionNode['props']>);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-zinc-300">Section Name</Label>
        <Input
          value={section.name}
          onChange={(e) => {
            // Update name in schema directly
            useBuilderStore.setState((state) => ({
              schema: {
                sections: state.schema.sections.map((s) =>
                  s.id === section.id ? { ...s, name: e.target.value } : s
                ),
              },
              hasUnsavedChanges: true,
            }));
          }}
          className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200 mt-1.5"
        />
      </div>
      <Separator className="bg-zinc-800" />
      <ColorPickerField label="Background Color" value={section.props.background || ''} onChange={(v) => handleChange('background', v)} />
      <TextField label="Background Image URL" value={section.props.backgroundImage || ''} onChange={(v) => handleChange('backgroundImage', v)} placeholder="https://..." />
      <ColorPickerField label="Background Overlay" value={section.props.backgroundOverlay || ''} onChange={(v) => handleChange('backgroundOverlay', v)} />
      <TextField label="Padding" value={section.props.padding || ''} onChange={(v) => handleChange('padding', v)} placeholder="e.g. 40px 0" />
      <TextField label="Margin" value={section.props.margin || ''} onChange={(v) => handleChange('margin', v)} placeholder="e.g. 0" />
      <SwitchField label="Full Width" value={section.props.fullWidth} onChange={(v) => handleChange('fullWidth', v)} />
      <TextField label="Max Width" value={section.props.maxWidth || ''} onChange={(v) => handleChange('maxWidth', v)} placeholder="e.g. 1200px" />
      <TextField label="Border Radius" value={section.props.borderRadius || ''} onChange={(v) => handleChange('borderRadius', v)} placeholder="e.g. 0" />
      <TextField label="Box Shadow" value={section.props.boxShadow || ''} onChange={(v) => handleChange('boxShadow', v)} placeholder="e.g. none" />
      <TextField label="Border" value={section.props.border || ''} onChange={(v) => handleChange('border', v)} placeholder="e.g. none" />
      <SwitchField label="Hidden" value={section.props.hidden} onChange={(v) => handleChange('hidden', v)} />
      <Separator className="bg-zinc-800" />
      <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</Label>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700" onClick={() => { duplicateSection(section.id); toast.success('Section duplicated'); }}>
          <Copy size={12} className="mr-1" /> Duplicate
        </Button>
        <Button variant="outline" size="sm" className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700" onClick={() => { removeSection(section.id); toast.success('Section deleted'); }}>
          <Trash2 size={12} className="mr-1 text-red-400" /> Delete
        </Button>
        <Button variant="outline" size="sm" className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700" onClick={() => moveSection(section.id, 'up')}>
          <ChevronUp size={12} className="mr-1" /> Move Up
        </Button>
        <Button variant="outline" size="sm" className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700" onClick={() => moveSection(section.id, 'down')}>
          <ChevronDown size={12} className="mr-1" /> Move Down
        </Button>
      </div>
    </div>
  );
}

function ColumnProperties({ section, column }: { section: SectionNode; column: ColumnNode }) {
  const { updateColumn, addColumn, removeColumn } = useBuilderStore();

  return (
    <div className="space-y-3">
      <SliderField
        label="Width"
        value={column.width}
        onChange={(v) => updateColumn(section.id, column.id, v)}
        min={10}
        max={100}
        unit="%"
      />
      <ColorPickerField
        label="Background Color"
        value=""
        onChange={(v) => {
          // Column bg is set inline via direct state mutation
          useBuilderStore.setState((state) => ({
            schema: {
              sections: state.schema.sections.map((s) =>
                s.id === section.id
                  ? {
                      ...s,
                      columns: s.columns.map((c) =>
                        c.id === column.id ? { ...c, bgColor: v } : c
                      ),
                    }
                  : s
              ),
            },
            hasUnsavedChanges: true,
          }));
        }}
      />
      <TextField
        label="Padding"
        value=""
        onChange={() => {}}
        placeholder="e.g. 16px"
      />
      <Separator className="bg-zinc-800" />
      <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</Label>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline" size="sm" className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700"
          onClick={() => { addColumn(section.id); toast.success('Column added'); }}
          disabled={section.columns.length >= 6}
        >
          <Plus size={12} className="mr-1" /> Add Col
        </Button>
        <Button
          variant="outline" size="sm" className="h-8 bg-zinc-800 border-zinc-700 text-xs text-red-400 hover:bg-zinc-700"
          onClick={() => {
            if (section.columns.length > 1) {
              removeColumn(section.id, column.id);
              toast.success('Column removed');
            } else {
              toast.error('Cannot remove the last column');
            }
          }}
          disabled={section.columns.length <= 1}
        >
          <Trash2 size={12} className="mr-1" /> Remove
        </Button>
      </div>
    </div>
  );
}

function PageProperties() {
  const { pageTitle, pageSlug } = useBuilderStore();
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-zinc-300">Page Title</Label>
        <Input
          value={pageTitle}
          onChange={(e) => useBuilderStore.setState({ pageTitle: e.target.value, hasUnsavedChanges: true })}
          className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200 mt-1.5"
        />
      </div>
      <div>
        <Label className="text-xs font-medium text-zinc-300">Slug</Label>
        <Input
          value={pageSlug}
          onChange={(e) => useBuilderStore.setState({ pageSlug: e.target.value, hasUnsavedChanges: true })}
          className="h-8 bg-zinc-800 border-zinc-700 text-xs text-zinc-200 mt-1.5"
          placeholder="page-slug"
        />
      </div>
      <Separator className="bg-zinc-800" />
      <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">SEO</Label>
      <TextField label="SEO Title" value={seoTitle} onChange={setSeoTitle} placeholder="Meta title..." />
      <TextAreaField label="SEO Description" value={seoDescription} onChange={setSeoDescription} rows={3} placeholder="Meta description..." />
      <Separator className="bg-zinc-800" />
      <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Page Background</Label>
      <ColorPickerField label="Background Color" value="" onChange={() => {}} />
    </div>
  );
}

// ============================================================================
// Properties Panel (main)
// ============================================================================

function PropertiesPanel() {
  const { selectedElement, schema, isPreviewMode } = useBuilderStore();

  // Find selected section, column, widget
  const selectedSection = schema.sections.find((s) => s.id === selectedElement.sectionId);
  const selectedColumn = selectedSection?.columns.find((c) => c.id === selectedElement.columnId);
  const selectedWidget = selectedColumn?.widgets.find((w) => w.id === selectedElement.widgetId);

  const panelTitle = selectedWidget
    ? `${selectedWidget.name} Settings`
    : selectedColumn
      ? 'Column Settings'
      : selectedSection
        ? 'Section Settings'
        : 'Page Settings';

  const panelIcon = selectedWidget
    ? resolveIcon(WIDGET_DEFINITIONS.find((d) => d.type === selectedWidget.type)?.icon || 'Square', 14)
    : selectedColumn
      ? <Columns3Icon size={14} />
      : selectedSection
        ? <Layout size={14} />
        : <Settings size={14} />;

  if (isPreviewMode) return null;

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-l border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          {panelIcon}
          {panelTitle}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {selectedWidget && <WidgetPropertyEditor widget={selectedWidget} />}
          {selectedColumn && !selectedWidget && selectedSection && (
            <ColumnProperties section={selectedSection} column={selectedColumn} />
          )}
          {selectedSection && !selectedColumn && !selectedWidget && (
            <SectionProperties section={selectedSection} />
          )}
          {!selectedSection && !selectedColumn && !selectedWidget && <PageProperties />}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PageBuilderEditor({ pageId }: { pageId: string }) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedSchemaRef = useRef<string>('');

  const { setPageData, schema, hasUnsavedChanges, isSaving, setIsSaving, setHasUnsavedChanges, isPreviewMode, clearSelection, undo, redo, setIsDragging } = useBuilderStore();

  // Load page data
  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
        const res = await fetch(`/api/cms/builder/pages/${pageId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to load page');
        const json = await res.json();
        const data = json.data || json; // API wraps in { data: ... }
        const parsedSchema = typeof data.schema === 'string' ? JSON.parse(data.schema) : (data.schema || { sections: [] });
        setPageData({
          id: data.id,
          title: data.title || 'Untitled Page',
          slug: data.slug || '',
          status: data.status || 'draft',
          schema: parsedSchema,
        });
        lastSavedSchemaRef.current = JSON.stringify(parsedSchema);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [pageId, setPageData]);

  // Save function
  const savePage = useCallback(async () => {
    const store = useBuilderStore.getState();
    if (!store.pageId) return;

    const currentSchemaJson = JSON.stringify(store.schema);
    if (currentSchemaJson === lastSavedSchemaRef.current) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/cms/builder/pages/${store.pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: store.pageTitle,
          slug: store.pageSlug,
          schema: store.schema,
          status: 'draft',
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      lastSavedSchemaRef.current = currentSchemaJson;
      setHasUnsavedChanges(false);
      toast.success('Page saved');
    } catch (err) {
      toast.error('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  }, [setIsSaving, setHasUnsavedChanges]);

  // Auto-save
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (hasUnsavedChanges && !isSaving) {
        savePage();
      }
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [hasUnsavedChanges, isSaving, savePage]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' && !e.shiftKey) {
          e.preventDefault();
          savePage();
        }
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        if (e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          redo();
        }
        if (e.key === 'Z') {
          e.preventDefault();
          redo();
        }
      }

      if (!isInput) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Handled by individual components
        }
        if (e.key === 'Escape') {
          clearSelection();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, clearSelection, savePage]);

  // Publish function
  const publishPage = useCallback(async () => {
    const store = useBuilderStore.getState();
    if (!store.pageId) return;

    // Save first
    await savePage();

    setIsSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
      const res = await fetch(`/api/cms/builder/pages/${store.pageId}/publish`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to publish');
      useBuilderStore.setState({ pageStatus: 'published', hasUnsavedChanges: false });
      toast.success('Page published successfully');
    } catch (err) {
      toast.error('Failed to publish page');
    } finally {
      setIsSaving(false);
    }
  }, [savePage, setIsSaving]);

  // DnD handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Widget from palette dropped onto canvas
    if (activeData?.type === 'palette-widget' && overData?.type === 'column-drop') {
      const def = activeData.widgetDef as WidgetDefinition;
      const { sectionId, columnId } = overData;

      const newWidget: WidgetNode = {
        id: generateId(),
        type: def.type,
        name: def.label,
        props: { ...def.defaultProps } as AnyWidgetProps,
      };

      useBuilderStore.getState().addWidget(sectionId, columnId, newWidget);
      toast.success(`${def.label} added`);
      return;
    }

    // Widget from palette with no column drop target — add to first col of last section
    if (activeData?.type === 'palette-widget') {
      const def = activeData.widgetDef as WidgetDefinition;
      const store = useBuilderStore.getState();
      if (store.schema.sections.length > 0) {
        const lastSection = store.schema.sections[store.schema.sections.length - 1];
        const firstCol = lastSection.columns[0];
        if (firstCol) {
          const newWidget: WidgetNode = {
            id: generateId(),
            type: def.type,
            name: def.label,
            props: { ...def.defaultProps } as AnyWidgetProps,
          };
          store.addWidget(lastSection.id, firstCol.id, newWidget);
          toast.success(`${def.label} added`);
        }
      }
      return;
    }

    // Widget reorder within canvas
    if (activeData?.type === 'canvas-widget' && overData?.type === 'canvas-widget') {
      const { widget, sectionId, columnId } = activeData;
      const overWidget = overData.widget;

      if (widget.id === overWidget.id) return;

      const store = useBuilderStore.getState();
      const section = store.schema.sections.find((s) => s.id === sectionId);
      if (!section) return;
      const col = section.columns.find((c) => c.id === columnId);
      if (!col) return;

      const oldIndex = col.widgets.findIndex((w) => w.id === widget.id);
      const newIndex = col.widgets.findIndex((w) => w.id === overWidget.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Use moveWidget for same column reordering
      const updatedWidgets = arrayMove(col.widgets, oldIndex, newIndex);

      // Direct state update for reordering
      useBuilderStore.getState().pushToUndo();
      useBuilderStore.setState({
        schema: {
          sections: store.schema.sections.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  columns: s.columns.map((c) =>
                    c.id === columnId ? { ...c, widgets: updatedWidgets } : c
                  ),
                }
              : s
          ),
        },
        hasUnsavedChanges: true,
      });
    }
  }, [setIsDragging]);

  // Drag overlay
  const [dragOverlayContent, setDragOverlayContent] = useState<React.ReactNode>(null);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const activeData = event.active.data.current as { type?: string; widgetDef?: WidgetDefinition } | undefined;
    if (activeData?.type === 'palette-widget' && activeData.widgetDef) {
      setDragOverlayContent(
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-emerald-500 rounded-lg shadow-xl text-xs text-zinc-200">
          {resolveIcon(activeData.widgetDef.icon, 14)}
          {activeData.widgetDef.label}
        </div>
      );
    } else {
      setDragOverlayContent(null);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <span className="text-sm text-zinc-400">Loading page...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <AlertCircle size={48} className="text-red-400" />
          <span className="text-lg font-medium text-zinc-200">Failed to load page</span>
          <span className="text-sm text-zinc-400">{error}</span>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
        {/* Top Toolbar */}
        <TopToolbar
          pageId={pageId}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
          onToggleLeft={() => setLeftPanelOpen(!leftPanelOpen)}
          onToggleRight={() => setRightPanelOpen(!rightPanelOpen)}
          onSave={savePage}
          onPublish={publishPage}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
        />

        {/* Three Panel Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          {leftPanelOpen && !isPreviewMode && (
            <div className="w-[260px] shrink-0 border-r border-zinc-800 overflow-hidden">
              <WidgetPanel />
            </div>
          )}

          {/* Center Panel — Canvas */}
          <CanvasPanel />

          {/* Right Panel */}
          {rightPanelOpen && !isPreviewMode && (
            <div className="w-[300px] shrink-0 overflow-hidden">
              <PropertiesPanel />
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {dragOverlayContent}
      </DragOverlay>
    </DndContext>
  );
}