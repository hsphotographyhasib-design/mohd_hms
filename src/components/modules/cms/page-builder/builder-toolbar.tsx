'use client';

import { usePageBuilderStore } from '@/store/page-builder-store';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft, Save, Upload, Eye, Undo2, Redo2,
  Monitor, Tablet, Smartphone, Loader2, Check,
  AlertTriangle,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

// ============ TOOLBAR ============

export function BuilderToolbar({
  saving,
  lastSaved,
}: {
  saving: boolean;
  lastSaved: string | null;
}) {
  const store = usePageBuilderStore();
  const setView = useAppStore((s) => s.setView);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(() => store.pageTitle);
  const titleRef = useRef<HTMLInputElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Sync title - use derived state pattern
  const [prevTitle, setPrevTitle] = useState(store.pageTitle);
  if (store.pageTitle !== prevTitle) {
    setTitleVal(store.pageTitle);
    setPrevTitle(store.pageTitle);
  }
  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current?.focus(); }, [editingTitle]);

  // Auto-save
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      const s = usePageBuilderStore.getState();
      if (s.isDirty && s.pageId && !s.isSaving) {
        window.dispatchEvent(new CustomEvent('pb:save', { detail: { auto: true } }));
      }
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        usePageBuilderStore.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        usePageBuilderStore.getState().redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('pb:save', { detail: { auto: false } }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleBack = () => {
    if (store.isDirty) {
      if (confirm('You have unsaved changes. Leave without saving?')) {
        store.reset();
        setView('cms-page-list');
      }
    } else {
      store.reset();
      setView('cms-page-list');
    }
  };

  const save = (auto = false) => {
    window.dispatchEvent(new CustomEvent('pb:save', { detail: { auto } }));
  };

  const publish = () => {
    window.dispatchEvent(new CustomEvent('pb:publish'));
  };

  const vp = store.viewport;
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();

  const vpWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  return (
    <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center px-3 gap-2 shrink-0 z-50">
      {/* Left section */}
      <div className="flex items-center gap-2 mr-4">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">Back to Pages</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-6 w-px bg-gray-700" />

        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={() => { store.setPageInfo({ id: store.pageId || '', title: titleVal, slug: store.pageSlug, status: store.pageStatus }); setEditingTitle(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-emerald-600 outline-none w-48"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-white text-sm font-medium hover:text-emerald-400 transition-colors truncate max-w-[200px] text-left"
          >
            {store.pageTitle}
          </button>
        )}

        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
          store.pageStatus === 'published' ? 'bg-emerald-900/50 text-emerald-400' :
          store.pageStatus === 'draft' ? 'bg-amber-900/50 text-amber-400' :
          'bg-gray-700 text-gray-400'
        )}>
          {store.pageStatus}
        </span>
      </div>

      {/* Center: Viewport */}
      <div className="flex-1 flex items-center justify-center gap-1">
        <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
          {([
            { mode: 'desktop' as const, icon: Monitor, label: 'Desktop', width: '1440px' },
            { mode: 'tablet' as const, icon: Tablet, label: 'Tablet', width: '768px' },
            { mode: 'mobile' as const, icon: Smartphone, label: 'Mobile', width: '375px' },
          ]).map(({ mode, icon: Icon, label, width }) => (
            <TooltipProvider key={mode} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => store.setViewport(mode)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      vp === mode
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">{label} ({width})</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5 ml-4">
        {/* Undo/Redo */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" disabled={!canUndo} onClick={() => store.undo()}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" disabled={!canRedo} onClick={() => store.redo()}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Save status */}
        {saving ? (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </div>
        ) : store.isDirty ? (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Unsaved</span>
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Saved</span>
          </div>
        ) : null}

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Preview */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800 h-8 gap-1.5" onClick={() => store.setShowPreview(true)}>
                <Eye className="h-4 w-4" />
                <span className="hidden md:inline text-xs">Preview</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">Preview Page</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Save */}
        <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => save()} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline text-xs">Save Draft</span>
        </Button>

        {/* Publish */}
        <Button size="sm" className="h-8 gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white" onClick={publish} disabled={saving}>
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Publish</span>
        </Button>
      </div>
    </div>
  );
}