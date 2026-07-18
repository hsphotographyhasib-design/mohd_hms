import { create } from 'zustand';

export type InspectionTab = 'dashboard' | 'inspections' | 'calendar' | 'reports' | 'templates' | 'analytics';

interface InspectionState {
  activeTab: InspectionTab;
  setActiveTab: (tab: InspectionTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedInspectionId: string | null;
  setSelectedInspectionId: (id: string | null) => void;
}

export const useInspectionStore = create<InspectionState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  selectedInspectionId: null,
  setSelectedInspectionId: (id) => set({ selectedInspectionId: id }),
}));