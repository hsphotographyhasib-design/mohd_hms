import { create } from 'zustand';
import type { AuthUser, UserRole, AppView } from '@/types';

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'cmms-secret-key';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('cmms_token', data.token);
      localStorage.setItem('cmms_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      // Reset view to dashboard on login
      setTimeout(() => { useAppStore.getState().setView('dashboard'); }, 0);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: { name: string; email: string; password: string; role: string }) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Registration failed');
      localStorage.setItem('cmms_token', result.token);
      localStorage.setItem('cmms_user', JSON.stringify(result.user));
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('cmms_token');
    localStorage.removeItem('cmms_user');
    set({ user: null, token: null, isAuthenticated: false });
    // Reset view to dashboard on logout
    setTimeout(() => { useAppStore.getState().setView('dashboard'); }, 0);
  },

  updateProfile: (data: Partial<AuthUser>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updated = { ...currentUser, ...data };
      localStorage.setItem('cmms_user', JSON.stringify(updated));
      set({ user: updated });
    }
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('cmms_token');
    const userStr = localStorage.getItem('cmms_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('cmms_token');
        localStorage.removeItem('cmms_user');
      }
    }
  },
}));

// ============ APP STATE ============

interface AppState {
  currentView: AppView;
  viewParams: Record<string, string>;
  sidebarOpen: boolean;
  setView: (view: AppView, params?: Record<string, string>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  viewParams: {},
  sidebarOpen: true,
  setView: (view, params = {}) => set({ currentView: view, viewParams: params }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// ============ NOTIFICATION STATE ============

interface NotificationState {
  unreadCount: number;
  notifications: import('@/types').NotificationItem[];
  setNotifications: (notifications: import('@/types').NotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  setNotifications: (notifications) => {
    set({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
  },
  setUnreadCount: (count) => set({ unreadCount: count }),
  markAsRead: (id) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  },
  markAllAsRead: () => {
    const notifications = get().notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications, unreadCount: 0 });
  },
}));

// ============ PERMISSIONS HELPER ============

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 90,
  manager: 80,
  supervisor: 70,
  finance: 60,
  technician: 50,
  customer: 10,
};

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function canAccess(userRole: UserRole, feature: string): boolean {
  const permissions: Record<string, UserRole[]> = {
    dashboard: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'],
    equipment: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'],
    complaints: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'],
    'work-orders': ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    invoices: ['super_admin', 'admin', 'manager', 'finance', 'customer'],
    pm: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    quotations: ['super_admin', 'admin', 'manager', 'customer'],
    inventory: ['super_admin', 'admin', 'manager', 'supervisor'],
    customers: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],
    employees: ['super_admin', 'admin', 'manager'],
    purchases: ['super_admin', 'admin', 'manager'],
    vehicles: ['super_admin', 'admin', 'manager'],
    finance: ['super_admin', 'admin', 'manager', 'finance'],
    reports: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],
    notifications: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'],
    settings: ['super_admin', 'admin'],
    cms: ['super_admin', 'admin'],
  };
  return (permissions[feature] || []).includes(userRole);
}