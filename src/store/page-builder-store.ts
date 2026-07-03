import { create } from 'zustand';
import type {
  WidgetNode, PageSection, PageData, ViewportMode,
  WidgetType, SeoData, PageStatus, WidgetStyles,
} from '@/types/page-builder';
import { WIDGET_DEFINITIONS } from '@/types/page-builder';

// ============ STATE INTERFACE ============

interface PageBuilderState {
  // Current page info
  pageId: string | null;
  pageTitle: string;
  pageSlug: string;
  pageStatus: PageStatus;
  seoData: SeoData;

  // Page content
  sections: PageSection[];

  // Selection
  selectedSectionId: string | null;
  selectedWidgetId: string | null;

  // Viewport
  viewport: ViewportMode;

  // UI state
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelTab: 'widgets' | 'sections' | 'templates';
  rightPanelTab: 'content' | 'style' | 'advanced';
  isDirty: boolean;
  isSaving: boolean;
  history: PageData[];
  historyIndex: number;
  showPreview: boolean;

  // Actions - Page
  setPageInfo: (info: { id: string; title: string; slug: string; status: PageStatus }) => void;
  setPageStatus: (status: PageStatus) => void;
  setSeoData: (data: Partial<SeoData>) => void;
  loadPageData: (data: PageData) => void;
  getPageData: () => PageData;

  // Actions - Sections
  addSection: (type?: PageSection['type']) => string;
  removeSection: (sectionId: string) => void;
  duplicateSection: (sectionId: string) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  updateSection: (sectionId: string, updates: Partial<PageSection>) => void;
  selectSection: (sectionId: string | null) => void;

  // Actions - Widgets
  addWidget: (sectionId: string, widgetType: WidgetType, index?: number) => string;
  removeWidget: (sectionId: string, widgetId: string) => void;
  duplicateWidget: (sectionId: string, widgetId: string) => void;
  moveWidget: (sectionId: string, fromIndex: number, toIndex: number) => void;
  moveWidgetToSection: (fromSectionId: string, widgetId: string, toSectionId: string, toIndex: number) => void;
  updateWidget: (sectionId: string, widgetId: string, updates: Partial<WidgetNode>) => void;
  updateWidgetContent: (sectionId: string, widgetId: string, content: Record<string, unknown>) => void;
  updateWidgetStyles: (sectionId: string, widgetId: string, viewport: ViewportMode, styles: Partial<WidgetStyles>) => void;
  selectWidget: (widgetId: string | null) => void;

  // Actions - UI
  setViewport: (viewport: ViewportMode) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelTab: (tab: 'widgets' | 'sections' | 'templates') => void;
  setRightPanelTab: (tab: 'content' | 'style' | 'advanced') => void;
  setShowPreview: (show: boolean) => void;
  setIsSaving: (saving: boolean) => void;

  // Actions - History (Undo/Redo)
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions - Reset
  reset: () => void;
}

// ============ HELPERS ============

const uid = () => Math.random().toString(36).slice(2, 11);
const sectionUid = () => `sec_${uid()}`;
const widgetUid = () => `wid_${uid()}`;

const defaultSection = (type?: PageSection['type']): PageSection => ({
  id: sectionUid(),
  type: type || 'custom',
  label: type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ') : 'Custom Section',
  styles: {
    desktop: {
      padding: { top: 64, right: 0, bottom: 64, left: 0 },
      maxWidth: '1200px',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  },
  columns: 1,
  widgets: [],
});

// ============ STORE ============

const initialState = {
  pageId: null as string | null,
  pageTitle: 'Untitled Page',
  pageSlug: 'untitled-page',
  pageStatus: 'draft' as PageStatus,
  seoData: {},
  sections: [] as PageSection[],
  selectedSectionId: null as string | null,
  selectedWidgetId: null as string | null,
  viewport: 'desktop' as ViewportMode,
  leftPanelOpen: true,
  rightPanelOpen: true,
  leftPanelTab: 'widgets' as const,
  rightPanelTab: 'content' as const,
  isDirty: false,
  isSaving: false,
  history: [] as PageData[],
  historyIndex: -1,
  showPreview: false,
};

export const usePageBuilderStore = create<PageBuilderState>((set, get) => ({
  ...initialState,

  // ============ PAGE ACTIONS ============

  setPageInfo: (info) => set({ pageId: info.id, pageTitle: info.title, pageSlug: info.slug, pageStatus: info.status }),

  setPageStatus: (status) => set({ pageStatus: status }),

  setSeoData: (data) => set((s) => ({ seoData: { ...s.seoData, ...data }, isDirty: true })),

  loadPageData: (data) => {
    const state = get();
    set({
      sections: data.sections || [],
      history: [{ sections: data.sections || [] }],
      historyIndex: 0,
      isDirty: false,
    });
  },

  getPageData: () => {
    const { sections } = get();
    return { sections };
  },

  // ============ SECTION ACTIONS ============

  addSection: (type) => {
    const section = defaultSection(type);
    set((s) => {
      const newSections = [...s.sections, section];
      return { sections: newSections, isDirty: true, selectedSectionId: section.id, selectedWidgetId: null };
    });
    get().pushHistory();
    return section.id;
  },

  removeSection: (sectionId) => {
    set((s) => {
      const newSections = s.sections.filter((sec) => sec.id !== sectionId);
      return {
        sections: newSections,
        isDirty: true,
        selectedSectionId: s.selectedSectionId === sectionId ? null : s.selectedSectionId,
        selectedWidgetId: s.selectedWidgetId ? null : s.selectedWidgetId,
      };
    });
    get().pushHistory();
  },

  duplicateSection: (sectionId) => {
    const { sections } = get();
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const original = sections[idx];
    const duplicate: PageSection = {
      ...JSON.parse(JSON.stringify(original)),
      id: sectionUid(),
      label: `${original.label} (Copy)`,
      widgets: original.widgets.map((w) => ({ ...JSON.parse(JSON.stringify(w)), id: widgetUid() })),
    };
    set((s) => {
      const newSections = [...s.sections];
      newSections.splice(idx + 1, 0, duplicate);
      return { sections: newSections, isDirty: true, selectedSectionId: duplicate.id };
    });
    get().pushHistory();
  },

  moveSection: (fromIndex, toIndex) => {
    set((s) => {
      const newSections = [...s.sections];
      const [moved] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, moved);
      return { sections: newSections, isDirty: true };
    });
    get().pushHistory();
  },

  updateSection: (sectionId, updates) => {
    set((s) => ({
      sections: s.sections.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)),
      isDirty: true,
    }));
  },

  selectSection: (sectionId) => set({ selectedSectionId: sectionId, selectedWidgetId: null }),

  // ============ WIDGET ACTIONS ============

  addWidget: (sectionId, widgetType, index) => {
    const def = WIDGET_DEFINITIONS.find((d) => d.type === widgetType);
    if (!def) return '';
    const widget: WidgetNode = {
      id: widgetUid(),
      type: widgetType,
      label: def.label,
      content: { ...def.defaultContent },
      styles: { desktop: {} },
    } as WidgetNode;
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const widgets = [...sec.widgets];
        if (index !== undefined) widgets.splice(index, 0, widget);
        else widgets.push(widget);
        return { ...sec, widgets };
      }),
      isDirty: true,
      selectedSectionId: sectionId,
      selectedWidgetId: widget.id,
    }));
    get().pushHistory();
    return widget.id;
  },

  removeWidget: (sectionId, widgetId) => {
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return { ...sec, widgets: sec.widgets.filter((w) => w.id !== widgetId) };
      }),
      isDirty: true,
      selectedWidgetId: s.selectedWidgetId === widgetId ? null : s.selectedWidgetId,
    }));
    get().pushHistory();
  },

  duplicateWidget: (sectionId, widgetId) => {
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const idx = sec.widgets.findIndex((w) => w.id === widgetId);
        if (idx === -1) return sec;
        const duplicate = { ...JSON.parse(JSON.stringify(sec.widgets[idx])), id: widgetUid() };
        const widgets = [...sec.widgets];
        widgets.splice(idx + 1, 0, duplicate);
        return { ...sec, widgets };
      }),
      isDirty: true,
    }));
    get().pushHistory();
  },

  moveWidget: (sectionId, fromIndex, toIndex) => {
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const widgets = [...sec.widgets];
        const [moved] = widgets.splice(fromIndex, 1);
        widgets.splice(toIndex, 0, moved);
        return { ...sec, widgets };
      }),
      isDirty: true,
    }));
    get().pushHistory();
  },

  moveWidgetToSection: (fromSectionId, widgetId, toSectionId, toIndex) => {
    let movedWidget: WidgetNode | null = null;
    set((s) => {
      const sourceSection = s.sections.find((sec) => sec.id === fromSectionId);
      if (!sourceSection) return s;
      const widget = sourceSection.widgets.find((w) => w.id === widgetId);
      if (!widget) return s;
      movedWidget = { ...JSON.parse(JSON.stringify(widget)), id: widgetUid() };
      return {
        sections: s.sections.map((sec) => {
          if (sec.id === fromSectionId) {
            return { ...sec, widgets: sec.widgets.filter((w) => w.id !== widgetId) };
          }
          if (sec.id === toSectionId) {
            const widgets = [...sec.widgets];
            widgets.splice(toIndex, 0, movedWidget!);
            return { ...sec, widgets };
          }
          return sec;
        }),
        isDirty: true,
        selectedSectionId: toSectionId,
        selectedWidgetId: movedWidget!.id,
      };
    });
    get().pushHistory();
  },

  updateWidget: (sectionId, widgetId, updates) => {
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          widgets: sec.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } as WidgetNode : w)),
        };
      }),
      isDirty: true,
    }));
  },

  updateWidgetContent: (sectionId, widgetId, content) => {
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          widgets: sec.widgets.map((w) => {
            if (w.id !== widgetId) return w;
            return { ...w, content: { ...((w as unknown as Record<string, unknown>).content || {}), ...content } } as WidgetNode;
          }),
        };
      }),
      isDirty: true,
    }));
  },

  updateWidgetStyles: (sectionId, widgetId, viewport, styles) => {
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          widgets: sec.widgets.map((w) => {
            if (w.id !== widgetId) return w;
            const currentStyles = w.styles || { desktop: {} };
            const viewportStyles = viewport === 'desktop' ? 'desktop' : viewport === 'tablet' ? 'tablet' : 'mobile';
            return {
              ...w,
              styles: {
                ...currentStyles,
                [viewportStyles]: { ...((currentStyles as unknown as Record<string, unknown>)[viewportStyles] || {}), ...styles },
              },
            } as WidgetNode;
          }),
        };
      }),
      isDirty: true,
    }));
  },

  selectWidget: (widgetId) => set({ selectedWidgetId: widgetId, rightPanelOpen: true, rightPanelTab: 'content' }),

  // ============ UI ACTIONS ============

  setViewport: (viewport) => set({ viewport }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab, leftPanelOpen: true }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab, rightPanelOpen: true }),
  setShowPreview: (show) => set({ showPreview: show }),
  setIsSaving: (saving) => set({ isSaving: saving }),

  // ============ HISTORY ============

  pushHistory: () => {
    const { sections, history, historyIndex } = get();
    const snapshot = JSON.parse(JSON.stringify({ sections }));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    // Keep max 50 history entries
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    set({ sections: JSON.parse(JSON.stringify(snapshot.sections)), historyIndex: newIndex, isDirty: true });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    set({ sections: JSON.parse(JSON.stringify(snapshot.sections)), historyIndex: newIndex, isDirty: true });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ============ RESET ============

  reset: () => set({ ...initialState, history: [], historyIndex: -1 }),
}));