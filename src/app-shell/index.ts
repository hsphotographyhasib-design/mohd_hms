// App Shell barrel export

// Core components
export { default as AppEntry } from './app-entry';
export { AppShell } from './app-shell';
export { Sidebar } from './sidebar';
export { Header } from './header';
export { LoginView } from './login-view';

// Store
export {
  useAuthStore,
  useAppStore,
  hasPermission,
  hasMinRole,
  canAccess,
} from './store';

// Navigation components
export { AppHeader } from './nav/app-header';
export { FloatingNavBar } from './nav/floating-nav-bar';
export { MobileBottomNav } from './nav/mobile-bottom-nav';
export { MobileNavSheet } from './nav/mobile-nav-sheet';

// Providers
export { QueryProvider } from './providers/query-provider';