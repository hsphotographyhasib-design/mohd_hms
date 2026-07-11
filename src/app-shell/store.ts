import { create } from 'zustand';
import type { AuthUser, UserRole, AppView } from '@/core/types';
import { markLoginTime } from '@/shared/hooks/use-secure-fetch';
import { canAccessFeature, hasMinRole, hasPermission, ROLE_HIERARCHY } from '@/core/permissions/rbac/permissions-matrix';

// NOTE: JWT operations are server-only in @/core/auth/auth-lib.ts.
// This constant is NOT used for actual token verification.

/** Normalize user role to lowercase to match UserRole type union */
function normalizeUser(raw: AuthUser): AuthUser {
  return { ...raw, role: (raw.role as string).toLowerCase() as UserRole };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string }) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  loginWithWhatsApp: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  secureLogout: (reason?: string) => void;
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
      set({ user: normalizeUser(data.user), token: data.token, isAuthenticated: true, isLoading: false });
      markLoginTime(); // Start grace period — ignore 401s for 5s
      // Push history state for back button protection
      window.history.pushState(null, '', '/');
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
      set({ user: normalizeUser(result.user), token: result.token, isAuthenticated: true, isLoading: false });
      markLoginTime();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async (googleToken: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      localStorage.setItem('cmms_token', data.token);
      localStorage.setItem('cmms_user', JSON.stringify(data.user));
      set({ user: normalizeUser(data.user), token: data.token, isAuthenticated: true, isLoading: false });
      markLoginTime();
      window.history.pushState(null, '', '/');
      window.dispatchEvent(
        new CustomEvent('cmms:toast', { detail: { type: 'success', message: `Welcome, ${data.user.name}!` } }),
      );
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    // Clear ALL storage (tokens, cache, role info, notification cache)
    localStorage.clear();
    sessionStorage.clear();
    // Reset auth state
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    // Reset app view to landing page
    useAppStore.getState().setView('dashboard');
  },

  /** Secure logout with broadcast + history protection */
  secureLogout: (reason?: string) => {
    // Broadcast to other tabs
    try {
      const channel = new BroadcastChannel('cmms-logout');
      channel.postMessage({ type: 'LOGOUT', reason });
      channel.close();
    } catch {
      // Fallback
      localStorage.setItem('cmms_logout_broadcast', JSON.stringify({ type: 'LOGOUT', reason, timestamp: Date.now() }));
      setTimeout(() => localStorage.removeItem('cmms_logout_broadcast'), 100);
    }
    // Clear everything
    localStorage.clear();
    sessionStorage.clear();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    useAppStore.getState().setView('dashboard');
    // Prevent back button
    window.history.replaceState(null, '', '/');
    // Toast notification
    if (reason) {
      window.dispatchEvent(new CustomEvent('cmms:toast', { detail: { type: 'info', message: reason } }));
    }
  },

  updateProfile: (data: Partial<AuthUser>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updated = normalizeUser({ ...currentUser, ...data });
      localStorage.setItem('cmms_user', JSON.stringify(updated));
      set({ user: updated });
    }
  },

  loginWithWhatsApp: (user: AuthUser, accessToken: string, refreshToken: string) => {
    localStorage.setItem('cmms_token', accessToken);
    localStorage.setItem('cmms_refresh_token', refreshToken);
    localStorage.setItem('cmms_user', JSON.stringify(user));
    set({ user: normalizeUser(user), token: accessToken, isAuthenticated: true, isLoading: false });
    markLoginTime();
    window.history.pushState(null, '', '/');
    window.dispatchEvent(
      new CustomEvent('cmms:toast', { detail: { type: 'success', message: 'Welcome back!' } }),
    );
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('cmms_token');
    const userStr = localStorage.getItem('cmms_user');
    if (token && userStr) {
      try {
        const user = normalizeUser(JSON.parse(userStr) as AuthUser);
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
  searchOpen: boolean;
  quickActionsOpen: boolean;
  notificationPanelOpen: boolean;
  setView: (view: AppView, params?: Record<string, string>) => void;
  setSearchOpen: (open: boolean) => void;
  setQuickActionsOpen: (open: boolean) => void;
  setNotificationPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  viewParams: {},
  searchOpen: false,
  quickActionsOpen: false,
  notificationPanelOpen: false,
  setView: (view, params = {}) => set({ currentView: view, viewParams: params }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setQuickActionsOpen: (open) => set({ quickActionsOpen: open }),
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
}));

// ============ PERMISSIONS HELPERS (delegates to unified RBAC) ============

/** @deprecated Use canAccessFeature from '@/core/permissions/rbac/permissions-matrix' instead */
export const canAccess = canAccessFeature;

/** Re-export for client components — avoids importing the full RBAC barrel */
export { hasMinRole, hasPermission, ROLE_HIERARCHY } from '@/core/permissions/rbac/permissions-matrix';