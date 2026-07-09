'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePageBuilderStore } from '@/modules/cms/page-builder/store';
import { useAppStore } from '@/app-shell/store';
import type { PageData } from '@/modules/cms/page-builder/types';
import { BuilderToolbar } from '../page-builder/builder-toolbar';
import { LeftPanel } from '../page-builder/builder-left-panel';
import { BuilderCanvas } from '../page-builder/builder-canvas';
import { RightPanel } from '../page-builder/builder-right-panel';
import { WidgetRenderer } from '../page-builder/widget-renderer';
import { toast } from 'sonner';
import {
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Loader2, X,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/core/utils/utils';

// ============ MAIN PAGE BUILDER ============

export function CmsPageBuilder({ pageId }: { pageId?: string }) {
  const store = usePageBuilderStore();
  const setView = useAppStore((s) => s.setView);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Load page data
  useEffect(() => {
    if (!pageId || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function load() {
      try {
        const token = localStorage.getItem('cmms_token');
        const res = await fetch(`/api/cms/pages/${pageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load page');
        const data = await res.json();

        const pageData: PageData = typeof data.pageData === 'string'
          ? JSON.parse(data.pageData)
          : (data.pageData || { sections: [] });

        store.setPageInfo({
          id: data.id,
          title: data.title,
          slug: data.slug,
          status: data.status,
        });
        store.loadPageData(pageData);
      } catch (err) {
        toast.error('Failed to load page');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pageId, store]);

  // Save handler
  const handleSave = useCallback(async (auto = false) => {
    const s = usePageBuilderStore.getState();
    if (!s.pageId || !s.isDirty) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('cmms_token');
      const pageData = s.getPageData();
      const res = await fetch(`/api/cms/pages/${s.pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageData: JSON.stringify(pageData),
          title: s.pageTitle,
          status: auto ? s.pageStatus : 'draft',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setLastSaved(new Date().toISOString());
      usePageBuilderStore.setState({ isDirty: false });
      if (!auto) toast.success('Page saved successfully');
    } catch (err) {
      toast.error('Failed to save page');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, []);

  // Publish handler
  const handlePublish = useCallback(async () => {
    const s = usePageBuilderStore.getState();
    if (!s.pageId) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('cmms_token');
      const pageData = s.getPageData();
      const res = await fetch(`/api/cms/pages/${s.pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageData: JSON.stringify(pageData),
          title: s.pageTitle,
          status: 'published',
        }),
      });
      if (!res.ok) throw new Error('Publish failed');
      usePageBuilderStore.setState({ pageStatus: 'published', isDirty: false });
      setLastSaved(new Date().toISOString());
      toast.success('Page published!');
    } catch (err) {
      toast.error('Failed to publish page');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, []);

  // Listen for save/publish events from toolbar
  useEffect(() => {
    const saveHandler = (e: Event) => {
      const { auto } = (e as CustomEvent).detail || {};
      handleSave(auto);
    };
    const publishHandler = () => handlePublish();
    window.addEventListener('pb:save', saveHandler);
    window.addEventListener('pb:publish', publishHandler);
    return () => {
      window.removeEventListener('pb:save', saveHandler);
      window.removeEventListener('pb:publish', publishHandler);
    };
  }, [handleSave, handlePublish]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { store.reset(); };
  }, [store]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading page builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-40 flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Toolbar */}
      <BuilderToolbar saving={saving} lastSaved={lastSaved} />

      {/* Panel toggle + main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel toggle */}
        <button
          onClick={() => store.toggleLeftPanel()}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-gray-800 border border-gray-700 rounded-r-md flex items-center justify-center hover:bg-gray-700 transition-colors"
          style={{ left: store.leftPanelOpen ? '280px' : '0px' }}
        >
          {store.leftPanelOpen
            ? <PanelLeftClose className="h-3 w-3 text-gray-400" />
            : <PanelLeftOpen className="h-3 w-3 text-gray-400" />}
        </button>

        {/* Left panel */}
        <LeftPanel />

        {/* Canvas */}
        <BuilderCanvas />

        {/* Right panel toggle */}
        <button
          onClick={() => store.toggleRightPanel()}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-gray-800 border border-gray-700 rounded-l-md flex items-center justify-center hover:bg-gray-700 transition-colors"
          style={{ right: store.rightPanelOpen ? '300px' : '0px' }}
        >
          {store.rightPanelOpen
            ? <PanelRightClose className="h-3 w-3 text-gray-400" />
            : <PanelRightOpen className="h-3 w-3 text-gray-400" />}
        </button>

        {/* Right panel */}
        <RightPanel />
      </div>

      {/* Preview overlay */}
      {store.showPreview && (
        <PreviewOverlay onClose={() => store.setShowPreview(false)} />
      )}
    </div>
  );
}

// ============ PREVIEW OVERLAY ============

function PreviewOverlay({ onClose }: { onClose: () => void }) {
  const sections = usePageBuilderStore((s) => s.sections);
  const pageTitle = usePageBuilderStore((s) => s.pageTitle);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Preview header bar */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-4 h-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Preview Mode</span>
          <span className="text-xs font-medium text-white">{pageTitle}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-300 hover:text-white gap-1" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
          Close Preview
        </Button>
      </div>

      {/* Preview content */}
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {sections.filter((s) => !s.hidden).map((section) => (
          <div key={section.id} className="mb-8">
            {section.widgets.map((widget) => (
              <div key={widget.id} className={cn(widget.hidden && 'hidden')}>
                <WidgetRenderer widget={widget} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}