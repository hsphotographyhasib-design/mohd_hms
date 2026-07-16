import { create } from "zustand";
import type {
  ViewKey,
  ReportsFilter,
  IrmUser,
  IrmProject,
} from "./types";

interface IrmState {
  // Navigation
  view: ViewKey;
  setView: (view: ViewKey) => void; // eslint-disable-line no-unused-vars
  goBack: () => void;
  viewHistory: ViewKey[];

  // Cross-view filter
  reportsFilter: ReportsFilter | null;
  setReportsFilter: (filter: ReportsFilter | null) => void; // eslint-disable-line no-unused-vars

  // Selected entities
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void; // eslint-disable-line no-unused-vars
  selectedReportId: string | null;
  setSelectedReportId: (id: string | null) => void; // eslint-disable-line no-unused-vars

  // Current user (simulated)
  currentUser: IrmUser;
  setCurrentUser: (user: IrmUser) => void; // eslint-disable-line no-unused-vars

  // Theme
  theme: "light" | "dark";
  toggleTheme: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void; // eslint-disable-line no-unused-vars

  // Projects cache
  projects: IrmProject[];
  setProjects: (projects: IrmProject[]) => void; // eslint-disable-line no-unused-vars

  // Permission helper
  hasPermission: (action: string) => boolean; // eslint-disable-line no-unused-vars
}

const defaultUser: IrmUser = {
  id: "usr_admin",
  email: "admin@irms.local",
  name: "Admin User",
  role: "Super Admin",
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const ROLE_PERMS: Record<string, string[]> = {
  "Super Admin": ["create", "edit", "delete", "approve", "manage", "view"],
  Admin: ["create", "edit", "delete", "approve", "manage", "view"],
  "Project Manager": ["create", "edit", "approve", "view"],
  "Site Engineer": ["create", "edit", "view"],
  Inspector: ["create", "edit", "view"],
  Supervisor: ["approve", "view"],
  Technician: ["create", "view"],
  "Quality Control": ["approve", "view"],
  "Safety Officer": ["view"],
  Customer: ["view"],
  Viewer: ["view"],
};

export const useIrmStore = create<IrmState>((set, get) => ({
  // Navigation
  view: "dashboard" as ViewKey,
  setView: (view) =>
    set((s) => ({
      view,
      viewHistory: [...s.viewHistory, s.view].slice(-20),
    })),
  goBack: () =>
    set((s) => {
      const hist = [...s.viewHistory];
      const prev = hist.pop() || "dashboard";
      return { view: prev, viewHistory: hist };
    }),
  viewHistory: [],

  // Cross-view filter
  reportsFilter: null,
  setReportsFilter: (filter) => set({ reportsFilter: filter }),

  // Selected entities
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  selectedReportId: null,
  setSelectedReportId: (id) => set({ selectedReportId: id }),

  // Current user
  currentUser: defaultUser,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Theme
  theme: "light",
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Projects cache
  projects: [],
  setProjects: (projects) => set({ projects }),

  // Permission helper
  hasPermission: (action: string) => {
    const role = get().currentUser.role;
    const perms = ROLE_PERMS[role] || [];
    return perms.includes(action);
  },
}));