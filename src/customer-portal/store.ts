import { create } from 'zustand';

// ============================================================
// CUSTOMER APP SCREEN TYPES
// ============================================================

export type CustomerScreen =
  | 'dashboard'
  | 'complaints'
  | 'complaint-detail'
  | 'new-complaint'
  | 'work-order-detail'
  | 'track-technician'
  | 'rate-feedback'
  | 'invoices'
  | 'notifications'
  | 'profile'
  | 'documents'
  | 'help-support';

export type CustomerTab = 'home' | 'complaints' | 'invoices' | 'more';

// ============================================================
// CUSTOMER APP STATE
// ============================================================

interface CustomerAppState {
  currentScreen: CustomerScreen;
  currentTab: CustomerTab;
  screenParams: Record<string, string>;
  // Navigation history for back button
  history: CustomerScreen[];
  // Set screen
  setScreen: (screen: CustomerScreen, params?: Record<string, string>) => void;
  goBack: () => void;
  setTab: (tab: CustomerTab) => void;
  // New complaint form state
  newComplaintData: {
    category: string;
    location: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  };
  setNewComplaintData: (data: Partial<CustomerAppState['newComplaintData']>) => void;
  resetNewComplaint: () => void;
}

const INITIAL_COMPLAINT = {
  category: '',
  location: '',
  title: '',
  description: '',
  priority: 'medium' as const,
};

export const useCustomerAppStore = create<CustomerAppState>((set, get) => ({
  currentScreen: 'dashboard',
  currentTab: 'home',
  screenParams: {},
  history: [],

  setScreen: (screen, params = {}) => {
    const { currentScreen, history } = get();
    // Don't push duplicates
    if (screen !== currentScreen) {
      set({
        currentScreen: screen,
        screenParams: params,
        history: [...history, currentScreen],
      });
    }
  },

  goBack: () => {
    const { history } = get();
    if (history.length > 0) {
      const prev = history[history.length - 1];
      set({
        currentScreen: prev,
        history: history.slice(0, -1),
        screenParams: {},
      });
    }
  },

  setTab: (tab) => {
    const tabToScreen: Record<CustomerTab, CustomerScreen> = {
      home: 'dashboard',
      complaints: 'complaints',
      invoices: 'invoices',
      more: 'profile',
    };
    set({ currentTab: tab, currentScreen: tabToScreen[tab], history: [], screenParams: {} });
  },

  newComplaintData: { ...INITIAL_COMPLAINT },
  setNewComplaintData: (data) =>
    set((state) => ({ newComplaintData: { ...state.newComplaintData, ...data } })),
  resetNewComplaint: () => set({ newComplaintData: { ...INITIAL_COMPLAINT } }),
}));