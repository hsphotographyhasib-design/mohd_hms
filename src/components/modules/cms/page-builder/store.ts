import { create } from 'zustand';
import type {
  PageSchema, SectionNode, ColumnNode, WidgetNode,
  WidgetType, WidgetDefinition, SelectionState,
  Breakpoint, BuilderPanel, AnyWidgetProps,
} from './types';

// ============================================================================
// Utility
// ============================================================================

export function generateId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================================================
// Widget Definitions — organized by category
// Theme: MOHD.HMS ENTERPRISE green (#00A76F)
// ============================================================================

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  // ── Basic ────────────────────────────────────────────────────────────────
  {
    type: 'heading',
    label: 'Heading',
    icon: 'Type',
    category: 'basic',
    defaultProps: {
      text: 'Heading',
      tag: 'h2',
      fontSize: 32,
      fontWeight: '700',
      color: '#111827',
      textAlign: 'left',
      lineHeight: 1.2,
      marginBottom: 16,
    } as AnyWidgetProps,
  },
  {
    type: 'text',
    label: 'Text',
    icon: 'AlignLeft',
    category: 'basic',
    defaultProps: {
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      fontSize: 16,
      fontWeight: '400',
      color: '#4B5563',
      textAlign: 'left',
      lineHeight: 1.7,
      maxWidth: 720,
    } as AnyWidgetProps,
  },
  {
    type: 'button',
    label: 'Button',
    icon: 'MousePointerClick',
    category: 'basic',
    defaultProps: {
      text: 'Get Started',
      variant: 'primary',
      size: 'md',
      url: '#',
      fullWidth: false,
      borderRadius: '8px',
      icon: '',
      iconPosition: 'left',
      target: '_self',
    } as AnyWidgetProps,
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: 'MoveVertical',
    category: 'basic',
    defaultProps: {
      height: 40,
    } as AnyWidgetProps,
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'basic',
    defaultProps: {
      style: 'solid',
      color: '#E5E7EB',
      weight: 1,
      width: 100,
    } as AnyWidgetProps,
  },
  {
    type: 'icon',
    label: 'Icon',
    icon: 'Star',
    category: 'basic',
    defaultProps: {
      name: 'Star',
      size: 32,
      color: '#00A76F',
      bgColor: 'transparent',
      rounded: false,
    } as AnyWidgetProps,
  },

  // ── Content ──────────────────────────────────────────────────────────────
  {
    type: 'card',
    label: 'Card',
    icon: 'RectangleHorizontal',
    category: 'content',
    defaultProps: {
      title: 'Card Title',
      description: 'A short description of the card content goes here.',
      icon: '',
      link: '',
      linkText: 'Learn More',
      variant: 'default',
      textAlign: 'left',
      hoverEffect: true,
    } as AnyWidgetProps,
  },
  {
    type: 'counter',
    label: 'Counter',
    icon: 'Hash',
    category: 'content',
    defaultProps: {
      label: 'Projects Completed',
      value: 150,
      prefix: '',
      suffix: '+',
      duration: 2000,
      fontSize: 48,
      color: '#00A76F',
      textAlign: 'center',
    } as AnyWidgetProps,
  },
  {
    type: 'faq',
    label: 'FAQ',
    icon: 'HelpCircle',
    category: 'content',
    defaultProps: {
      items: [
        { question: 'What services do you offer?', answer: 'We offer a comprehensive range of IT solutions including networking, security, and cloud services.' },
        { question: 'How can I get a quote?', answer: 'Contact us through our form or call us directly for a customized quotation.' },
        { question: 'What is your response time?', answer: 'We aim to respond within 2 business hours during working days.' },
      ],
      allowMultiple: false,
      style: 'default',
    } as AnyWidgetProps,
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: 'Quote',
    category: 'content',
    defaultProps: {
      quote: 'Their team delivered exceptional results on time and within budget. Highly recommended!',
      author: 'Ahmad Bin Hassan',
      role: 'Managing Director',
      avatar: '',
      rating: 5,
      variant: 'default',
    } as AnyWidgetProps,
  },
  {
    type: 'team-card',
    label: 'Team Card',
    icon: 'Users',
    category: 'content',
    defaultProps: {
      name: 'John Doe',
      role: 'Senior Engineer',
      avatar: '',
      bio: 'Experienced professional with over 10 years in the industry.',
      email: 'john@company.com',
      phone: '+6012-345-6789',
      socials: [],
    } as AnyWidgetProps,
  },
  {
    type: 'service-card',
    label: 'Service Card',
    icon: 'Wrench',
    category: 'content',
    defaultProps: {
      title: 'IT Infrastructure',
      description: 'Complete networking solutions including design, deployment, and maintenance.',
      icon: 'Server',
      image: '',
      link: '',
      linkText: 'Learn More',
      variant: 'icon-top',
    } as AnyWidgetProps,
  },
  {
    type: 'timeline',
    label: 'Timeline',
    icon: 'Clock',
    category: 'content',
    defaultProps: {
      items: [
        { date: '2020', title: 'Company Founded', description: 'Started operations with a small team of 5.', icon: 'Rocket' },
        { date: '2022', title: 'First Major Contract', description: 'Secured our first enterprise-level project.', icon: 'Trophy' },
        { date: '2024', title: 'Regional Expansion', description: 'Expanded services across Southeast Asia.', icon: 'Globe' },
      ],
      orientation: 'vertical',
      variant: 'default',
    } as AnyWidgetProps,
  },

  // ── Media ────────────────────────────────────────────────────────────────
  {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    category: 'media',
    defaultProps: {
      src: '/placeholder.jpg',
      alt: 'Image description',
      width: 800,
      height: 450,
      objectFit: 'cover',
      borderRadius: '12px',
      shadow: '',
      link: '',
      caption: '',
    } as AnyWidgetProps,
  },
  {
    type: 'video',
    label: 'Video',
    icon: 'PlayCircle',
    category: 'media',
    defaultProps: {
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      type: 'youtube',
      autoplay: false,
      muted: false,
      controls: true,
      aspectRatio: '16/9',
      borderRadius: '12px',
    } as AnyWidgetProps,
  },
  {
    type: 'gallery',
    label: 'Gallery',
    icon: 'Images',
    category: 'media',
    defaultProps: {
      images: [
        { src: '/placeholder.jpg', alt: 'Gallery image 1' },
        { src: '/placeholder.jpg', alt: 'Gallery image 2' },
        { src: '/placeholder.jpg', alt: 'Gallery image 3' },
        { src: '/placeholder.jpg', alt: 'Gallery image 4' },
      ],
      columns: 3,
      gap: 16,
      borderRadius: '8px',
      lightbox: true,
    } as AnyWidgetProps,
  },
  {
    type: 'carousel',
    label: 'Carousel',
    icon: 'GalleryHorizontalEnd',
    category: 'media',
    defaultProps: {
      items: [
        { image: '/placeholder.jpg', title: 'Slide 1', description: 'First slide description' },
        { image: '/placeholder.jpg', title: 'Slide 2', description: 'Second slide description' },
        { image: '/placeholder.jpg', title: 'Slide 3', description: 'Third slide description' },
      ],
      autoplay: true,
      interval: 5000,
      showDots: true,
      showArrows: true,
      height: 400,
    } as AnyWidgetProps,
  },

  // ── Interactive ──────────────────────────────────────────────────────────
  {
    type: 'contact-form',
    label: 'Contact Form',
    icon: 'Mail',
    category: 'interactive',
    defaultProps: {
      fields: [
        { name: 'name', type: 'text', label: 'Full Name', required: true, placeholder: 'Enter your name' },
        { name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'Enter your email' },
        { name: 'phone', type: 'tel', label: 'Phone Number', required: false, placeholder: '+6012-345-6789' },
        { name: 'message', type: 'textarea', label: 'Message', required: true, placeholder: 'How can we help?' },
      ],
      submitText: 'Send Message',
      variant: 'default',
    } as AnyWidgetProps,
  },
  {
    type: 'map',
    label: 'Map',
    icon: 'MapPin',
    category: 'interactive',
    defaultProps: {
      address: 'Kuala Lumpur, Malaysia',
      lat: 3.139,
      lng: 101.6869,
      zoom: 14,
      height: 400,
      style: 'standard',
      marker: true,
    } as AnyWidgetProps,
  },

  // ── Advanced ─────────────────────────────────────────────────────────────
  {
    type: 'html-block',
    label: 'HTML Block',
    icon: 'Code',
    category: 'advanced',
    defaultProps: {
      content: '<div style="padding:24px;background:#f0fdf4;border-radius:8px;border-left:4px solid #00A76F;"><h3 style="margin:0 0 8px;color:#111827;">Custom HTML</h3><p style="margin:0;color:#4B5563;">You can place any custom HTML content here.</p></div>',
    } as AnyWidgetProps,
  },
  {
    type: 'qr-code',
    label: 'QR Code',
    icon: 'QrCode',
    category: 'advanced',
    defaultProps: {
      value: 'https://mohdhms.com',
      size: 200,
      color: '#111827',
      bgColor: '#FFFFFF',
      label: 'Scan to visit',
    } as AnyWidgetProps,
  },
];

// ============================================================================
// Zustand Store
// ============================================================================

interface BuilderState {
  // Page data
  pageId: string | null;
  pageTitle: string;
  pageSlug: string;
  pageStatus: 'draft' | 'published' | 'archived';
  schema: PageSchema;

  // UI State
  breakpoint: Breakpoint;
  leftPanel: BuilderPanel;
  selectedElement: SelectionState;
  isDragging: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isPreviewMode: boolean;

  // Revision History
  undoStack: PageSchema[];
  redoStack: PageSchema[];
  maxHistory: number;

  // Actions — Page data
  setPageData: (data: { id: string; title: string; slug: string; status: string; schema: PageSchema }) => void;
  setSchema: (schema: PageSchema) => void;

  // Actions — UI
  setBreakpoint: (bp: Breakpoint) => void;
  setLeftPanel: (panel: BuilderPanel) => void;
  selectElement: (selection: SelectionState) => void;
  clearSelection: () => void;
  setIsDragging: (dragging: boolean) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  setIsSaving: (val: boolean) => void;
  setIsPreviewMode: (val: boolean) => void;

  // Actions — History
  pushToUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Actions — Section CRUD
  addSection: (section: SectionNode) => void;
  updateSection: (id: string, props: Partial<SectionNode['props']>) => void;
  removeSection: (id: string) => void;
  duplicateSection: (id: string) => void;
  moveSection: (id: string, direction: 'up' | 'down') => void;

  // Actions — Column CRUD
  addColumn: (sectionId: string) => void;
  updateColumn: (sectionId: string, columnId: string, width: number) => void;
  removeColumn: (sectionId: string, columnId: string) => void;

  // Actions — Widget CRUD
  addWidget: (sectionId: string, columnId: string, widget: WidgetNode) => void;
  updateWidget: (sectionId: string, columnId: string, widgetId: string, props: Partial<AnyWidgetProps>) => void;
  removeWidget: (sectionId: string, columnId: string, widgetId: string) => void;
  moveWidget: (fromSection: string, fromColumn: string, toSection: string, toColumn: string, widgetId: string, newIndex: number) => void;
  duplicateWidget: (sectionId: string, columnId: string, widgetId: string) => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────────────
  pageId: null,
  pageTitle: '',
  pageSlug: '',
  pageStatus: 'draft',
  schema: { sections: [] },

  breakpoint: 'desktop',
  leftPanel: 'widgets',
  selectedElement: { sectionId: null, columnId: null, widgetId: null },
  isDragging: false,
  hasUnsavedChanges: false,
  isSaving: false,
  isPreviewMode: false,

  undoStack: [],
  redoStack: [],
  maxHistory: 50,

  // ── Page Data ──────────────────────────────────────────────────────────
  setPageData: (data) => set({
    pageId: data.id,
    pageTitle: data.title,
    pageSlug: data.slug,
    pageStatus: data.status as 'draft' | 'published' | 'archived',
    schema: data.schema,
    hasUnsavedChanges: false,
    undoStack: [],
    redoStack: [],
  }),

  setSchema: (schema) => set({ schema, hasUnsavedChanges: true }),

  // ── UI ─────────────────────────────────────────────────────────────────
  setBreakpoint: (bp) => set({ breakpoint: bp }),
  setLeftPanel: (panel) => set({ leftPanel: panel }),
  selectElement: (selection) => set({ selectedElement: selection }),
  clearSelection: () => set({ selectedElement: { sectionId: null, columnId: null, widgetId: null } }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setHasUnsavedChanges: (val) => set({ hasUnsavedChanges: val }),
  setIsSaving: (val) => set({ isSaving: val }),
  setIsPreviewMode: (val) => set({ isPreviewMode: val }),

  // ── History ────────────────────────────────────────────────────────────
  pushToUndo: () => {
    const { schema, undoStack, maxHistory } = get();
    const cloned = JSON.parse(JSON.stringify(schema)) as PageSchema;
    const newStack = [...undoStack, cloned];
    if (newStack.length > maxHistory) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, schema } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const currentCloned = JSON.parse(JSON.stringify(schema)) as PageSchema;
    set({
      schema: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, currentCloned],
      hasUnsavedChanges: true,
    });
  },

  redo: () => {
    const { redoStack, schema } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentCloned = JSON.parse(JSON.stringify(schema)) as PageSchema;
    set({
      schema: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, currentCloned],
      hasUnsavedChanges: true,
    });
  },

  // ── Section CRUD ───────────────────────────────────────────────────────
  addSection: (section) => {
    get().pushToUndo();
    set((state) => ({
      schema: { sections: [...state.schema.sections, section] },
      hasUnsavedChanges: true,
    }));
  },

  updateSection: (id, props) => {
    get().pushToUndo();
    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === id ? { ...s, props: { ...s.props, ...props } } : s
        ),
      },
      hasUnsavedChanges: true,
    }));
  },

  removeSection: (id) => {
    get().pushToUndo();
    set((state) => ({
      schema: {
        sections: state.schema.sections.filter((s) => s.id !== id),
      },
      hasUnsavedChanges: true,
      selectedElement: { sectionId: null, columnId: null, widgetId: null },
    }));
  },

  duplicateSection: (id) => {
    const { schema } = get();
    const idx = schema.sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    get().pushToUndo();
    const original = schema.sections[idx];
    const clone = JSON.parse(JSON.stringify(original)) as SectionNode;
    const deepCloneIds = (node: SectionNode): SectionNode => ({
      ...node,
      id: generateId(),
      columns: node.columns.map((col) => ({
        ...col,
        id: generateId(),
        widgets: col.widgets.map((w) => ({
          ...w,
          id: generateId(),
        })),
      })),
    });
    const clonedSection = deepCloneIds(clone);
    set((state) => {
      const sections = [...state.schema.sections];
      sections.splice(idx + 1, 0, clonedSection);
      return { schema: { sections }, hasUnsavedChanges: true };
    });
  },

  moveSection: (id, direction) => {
    const { schema } = get();
    const idx = schema.sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= schema.sections.length) return;
    get().pushToUndo();
    set((state) => {
      const sections = [...state.schema.sections];
      [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
      return { schema: { sections }, hasUnsavedChanges: true };
    });
  },

  // ── Column CRUD ────────────────────────────────────────────────────────
  addColumn: (sectionId) => {
    get().pushToUndo();
    const newCol: ColumnNode = {
      id: generateId(),
      width: 100,
      widgets: [],
    };
    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === sectionId ? { ...s, columns: [...s.columns, newCol] } : s
        ),
      },
      hasUnsavedChanges: true,
    }));
  },

  updateColumn: (sectionId, columnId, width) => {
    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                columns: s.columns.map((c) =>
                  c.id === columnId ? { ...c, width } : c
                ),
              }
            : s
        ),
      },
      hasUnsavedChanges: true,
    }));
  },

  removeColumn: (sectionId, columnId) => {
    get().pushToUndo();
    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === sectionId
            ? { ...s, columns: s.columns.filter((c) => c.id !== columnId) }
            : s
        ),
      },
      hasUnsavedChanges: true,
    }));
  },

  // ── Widget CRUD ────────────────────────────────────────────────────────
  addWidget: (sectionId, columnId, widget) => {
    get().pushToUndo();
    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                columns: s.columns.map((c) =>
                  c.id === columnId
                    ? { ...c, widgets: [...c.widgets, widget] }
                    : c
                ),
              }
            : s
        ),
      },
      hasUnsavedChanges: true,
    }));
  },

  updateWidget: (sectionId, columnId, widgetId, props) => {
    get().pushToUndo();
    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                columns: s.columns.map((c) =>
                  c.id === columnId
                    ? {
                        ...c,
                        widgets: c.widgets.map((w) =>
                          w.id === widgetId
                            ? { ...w, props: { ...w.props, ...props } as AnyWidgetProps }
                            : w
                        ),
                      }
                    : c
                ),
              }
            : s
        ),
      },
      hasUnsavedChanges: true,
    }));
  },

  removeWidget: (sectionId, columnId, widgetId) => {
    get().pushToUndo();
    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                columns: s.columns.map((c) =>
                  c.id === columnId
                    ? { ...c, widgets: c.widgets.filter((w) => w.id !== widgetId) }
                    : c
                ),
              }
            : s
        ),
      },
      hasUnsavedChanges: true,
      selectedElement: { sectionId: null, columnId: null, widgetId: null },
    }));
  },

  moveWidget: (fromSection, fromColumn, toSection, toColumn, widgetId, newIndex) => {
    const { schema } = get();
    // Find and remove widget from source
    let movedWidget: WidgetNode | null = null;
    let sourceSection = schema.sections.find((s) => s.id === fromSection);
    if (!sourceSection) return;
    let sourceCol = sourceSection.columns.find((c) => c.id === fromColumn);
    if (!sourceCol) return;
    const widgetIdx = sourceCol.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIdx === -1) return;
    movedWidget = sourceCol.widgets[widgetIdx];

    get().pushToUndo();

    set((state) => {
      const sections = state.schema.sections.map((s) => {
        // Remove from source
        if (s.id === fromSection) {
          return {
            ...s,
            columns: s.columns.map((c) =>
              c.id === fromColumn
                ? { ...c, widgets: c.widgets.filter((w) => w.id !== widgetId) }
                : c
            ),
          };
        }
        // Insert into target
        if (s.id === toSection && movedWidget) {
          return {
            ...s,
            columns: s.columns.map((c) => {
              if (c.id !== toColumn) return c;
              const widgets = [...c.widgets];
              const clampedIdx = Math.min(newIndex, widgets.length);
              widgets.splice(clampedIdx, 0, movedWidget!);
              return { ...c, widgets };
            }),
          };
        }
        return s;
      });
      return { schema: { sections }, hasUnsavedChanges: true };
    });
  },

  duplicateWidget: (sectionId, columnId, widgetId) => {
    const { schema } = get();
    const section = schema.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const col = section.columns.find((c) => c.id === columnId);
    if (!col) return;
    const widgetIdx = col.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIdx === -1) return;

    get().pushToUndo();

    const clone: WidgetNode = {
      ...JSON.parse(JSON.stringify(col.widgets[widgetIdx])),
      id: generateId(),
      name: `${col.widgets[widgetIdx].name} (copy)`,
    };

    set((state) => ({
      schema: {
        sections: state.schema.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                columns: s.columns.map((c) =>
                  c.id === columnId
                    ? {
                        ...c,
                        widgets: [...c.widgets.slice(0, widgetIdx + 1), clone, ...c.widgets.slice(widgetIdx + 1)],
                      }
                    : c
                ),
              }
            : s
        ),
      },
      hasUnsavedChanges: true,
    }));
  },
}));