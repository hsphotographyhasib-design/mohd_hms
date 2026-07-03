'use client';

import { usePageBuilderStore } from '@/store/page-builder-store';
import { WidgetRenderer } from './widget-renderer';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus, ChevronUp, ChevronDown, Copy, Trash2, Eye, EyeOff,
  GripVertical, MousePointerClick, LayoutTemplate, ArrowDownToLine,
} from 'lucide-react';
import { useMemo, useRef, useCallback } from 'react';

// ============ CANVAS WIDTHS ============
const VIEWPORT_WIDTHS: Record<string, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

// ============ WIDGET BLOCK ============
function WidgetBlock({ sectionId, widget, index, total }: {
  sectionId: string;
  widget: import('@/types/page-builder').WidgetNode;
  index: number;
  total: number;
}) {
  const selectedWidgetId = usePageBuilderStore((s) => s.selectedWidgetId);
  const selectWidget = usePageBuilderStore((s) => s.selectWidget);
  const selectSection = usePageBuilderStore((s) => s.selectSection);
  const removeWidget = usePageBuilderStore((s) => s.removeWidget);
  const duplicateWidget = usePageBuilderStore((s) => s.duplicateWidget);
  const moveWidget = usePageBuilderStore((s) => s.moveWidget);
  const isSelected = selectedWidgetId === widget.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectWidget(widget.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeWidget(sectionId, widget.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateWidget(sectionId, widget.id);
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) moveWidget(sectionId, index, index - 1);
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index < total - 1) moveWidget(sectionId, index, index + 1);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative rounded-md transition-all',
        isSelected
          ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-white'
          : 'hover:ring-1 hover:ring-emerald-500/50 hover:ring-offset-1 hover:ring-offset-white'
      )}
    >
      {/* Widget label on hover */}
      <div className={cn(
        'absolute -top-5 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-t text-[10px] font-medium transition-all',
        isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100'
      )}>
        {widget.label || widget.type}
      </div>

      {/* Widget action toolbar (show when selected) */}
      {isSelected && (
        <div className="absolute -top-10 right-0 z-20 flex items-center gap-0.5 bg-gray-800 rounded-lg shadow-lg px-1 py-0.5">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleMoveUp} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30" disabled={index === 0}>
                  <ChevronUp className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">Move Up</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleMoveDown} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30" disabled={index >= total - 1}>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">Move Down</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleDuplicate} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
                  <Copy className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">Duplicate</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleDelete} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-rose-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Widget content */}
      <div className={cn(widget.hidden && 'opacity-30 pointer-events-none')}>
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  );
}

// ============ SECTION BLOCK ============
function SectionBlock({ section, index, total }: {
  section: import('@/types/page-builder').PageSection;
  index: number;
  total: number;
}) {
  const selectedSectionId = usePageBuilderStore((s) => s.selectedSectionId);
  const selectedWidgetId = usePageBuilderStore((s) => s.selectedWidgetId);
  const selectSection = usePageBuilderStore((s) => s.selectSection);
  const selectWidget = usePageBuilderStore((s) => s.selectWidget);
  const removeSection = usePageBuilderStore((s) => s.removeSection);
  const duplicateSection = usePageBuilderStore((s) => s.duplicateSection);
  const moveSection = usePageBuilderStore((s) => s.moveSection);
  const updateSection = usePageBuilderStore((s) => s.updateSection);
  const addWidget = usePageBuilderStore((s) => s.addWidget);
  const viewport = usePageBuilderStore((s) => s.viewport);

  const isSectionSelected = selectedSectionId === section.id && !selectedWidgetId;
  const sectionRef = useRef<HTMLDivElement>(null);

  const bgStyle = useMemo(() => {
    const bg = section.background || section.styles?.desktop?.background;
    if (!bg) return {};
    if (bg.type === 'solid' && bg.color) return { backgroundColor: bg.color };
    if (bg.type === 'gradient' && bg.gradient) return { background: bg.gradient };
    if (bg.type === 'image' && bg.imageUrl) {
      return {
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: bg.size || 'cover',
        backgroundPosition: bg.position || 'center',
      };
    }
    return {};
  }, [section.background, section.styles?.desktop?.background]);

  const paddingStyle = useMemo(() => {
    const p = section.styles?.desktop?.padding;
    if (!p) return {};
    return {
      paddingTop: p.top ? `${p.top}px` : undefined,
      paddingRight: p.right ? `${p.right}px` : undefined,
      paddingBottom: p.bottom ? `${p.bottom}px` : undefined,
      paddingLeft: p.left ? `${p.left}px` : undefined,
    };
  }, [section.styles?.desktop?.padding]);

  const handleClick = (e: React.MouseEvent) => {
    // Only select section if clicking on the section background, not a widget
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.sectionBg) {
      selectSection(section.id);
      selectWidget(null);
    }
  };

  return (
    <div
      ref={sectionRef}
      className={cn(
        'group relative transition-all',
        section.hidden && 'opacity-30',
        isSectionSelected ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-100' : 'hover:ring-1 hover:ring-emerald-500/30'
      )}
      style={bgStyle}
      onClick={handleClick}
    >
      {/* Section toolbar */}
      <div className={cn(
        'absolute -top-9 left-0 z-30 flex items-center gap-0.5 px-1.5 py-0.5 rounded-t-lg shadow-lg transition-all',
        isSectionSelected
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-700 text-gray-300 opacity-0 group-hover:opacity-100'
      )}>
        <GripVertical className="h-3 w-3 cursor-grab mr-1" />
        <span className="text-[10px] font-medium max-w-[120px] truncate">{section.label || section.type}</span>
        <div className="flex items-center gap-0.5 ml-1">
          <button onClick={(e) => { e.stopPropagation(); if (index > 0) moveSection(index, index - 1); }} className="p-0.5 rounded hover:bg-emerald-700 disabled:opacity-30" disabled={index === 0}>
            <ChevronUp className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (index < total - 1) moveSection(index, index + 1); }} className="p-0.5 rounded hover:bg-emerald-700 disabled:opacity-30" disabled={index >= total - 1}>
            <ChevronDown className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }} className="p-0.5 rounded hover:bg-emerald-700">
            <Copy className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); updateSection(section.id, { hidden: !section.hidden }); }} className="p-0.5 rounded hover:bg-emerald-700">
            {section.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete section?')) removeSection(section.id); }} className="p-0.5 rounded hover:bg-emerald-700 hover:text-rose-300">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Section content */}
      <div
        data-section-bg="true"
        className="mx-auto w-full"
        style={{ ...paddingStyle, maxWidth: section.styles?.desktop?.maxWidth || '1200px' }}
      >
        {section.widgets.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg py-12 flex flex-col items-center gap-3 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
            onClick={(e) => { e.stopPropagation(); selectSection(section.id); }}
          >
            <ArrowDownToLine className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500 font-medium">Drop widgets here</p>
            <p className="text-xs text-gray-400">Or click a widget from the left panel</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-2">
            {section.widgets.map((w, wIdx) => (
              <WidgetBlock
                key={w.id}
                sectionId={section.id}
                widget={w}
                index={wIdx}
                total={section.widgets.length}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ CANVAS ============
export function BuilderCanvas() {
  const sections = usePageBuilderStore((s) => s.sections);
  const viewport = usePageBuilderStore((s) => s.viewport);
  const selectedWidgetId = usePageBuilderStore((s) => s.selectedWidgetId);
  const selectWidget = usePageBuilderStore((s) => s.selectWidget);
  const selectSection = usePageBuilderStore((s) => s.selectSection);
  const addSection = usePageBuilderStore((s) => s.addSection);

  const canvasWidth = VIEWPORT_WIDTHS[viewport] || '100%';

  const handleCanvasClick = () => {
    selectWidget(null);
    selectSection(null);
  };

  return (
    <div
      className="flex-1 bg-gray-100 overflow-auto flex justify-center py-6 px-4"
      onClick={handleCanvasClick}
    >
      <div
        className="bg-white shadow-xl rounded-lg min-h-[calc(100vh-120px)] transition-all duration-300 overflow-hidden"
        style={{
          width: canvasWidth,
          maxWidth: canvasWidth,
        }}
      >
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <LayoutTemplate className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Start Building Your Page</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Add sections to structure your page, then drag widgets from the left panel to build your content.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={() => addSection('hero')}
                variant="outline"
                className="gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Hero Section
              </Button>
              <Button
                onClick={() => addSection('custom')}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Custom Section
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {sections.map((sec, idx) => (
              <SectionBlock
                key={sec.id}
                section={sec}
                index={idx}
                total={sections.length}
              />
            ))}

            {/* Add section button at bottom */}
            <div className="py-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-emerald-600 gap-1.5 text-xs"
                onClick={(e) => { e.stopPropagation(); addSection('custom'); }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Section
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}