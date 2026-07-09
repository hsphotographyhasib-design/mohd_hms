'use client';

import { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerAppStore } from '@/customer-portal/store';
import { cn } from '@/core/utils/utils';
import {
  Home,
  ClipboardList,
  Receipt,
  Grid3X3,
  Plus,
  Bell,
  ArrowLeft,
  User,
} from 'lucide-react';
import { Skeleton } from '@/shared/ui/skeleton';

// ============================================================
// LAZY SCREEN IMPORTS
// ============================================================

const DashboardScreen = lazy(() =>
  import('./screens/dashboard').then((m) => ({ default: m.DashboardScreen }))
);
const ComplaintsScreen = lazy(() =>
  import('./screens/complaints').then((m) => ({ default: m.ComplaintsScreen }))
);
const ComplaintDetailScreen = lazy(() =>
  import('./screens/complaints').then((m) => ({ default: m.ComplaintDetailScreen }))
);
const NewComplaintScreen = lazy(() =>
  import('./screens/complaints').then((m) => ({ default: m.NewComplaintScreen }))
);
const WorkOrderDetailScreen = lazy(() =>
  import('./screens/tracking').then((m) => ({ default: m.WorkOrderDetailScreen }))
);
const TrackTechnicianScreen = lazy(() =>
  import('./screens/tracking').then((m) => ({ default: m.TrackTechnicianScreen }))
);
const RateFeedbackScreen = lazy(() =>
  import('./screens/tracking').then((m) => ({ default: m.RateFeedbackScreen }))
);
const InvoicesScreen = lazy(() =>
  import('./screens/invoices').then((m) => ({ default: m.InvoicesScreen }))
);
const NotificationsScreen = lazy(() =>
  import('./screens/invoices').then((m) => ({ default: m.NotificationsScreen }))
);
const ProfileScreen = lazy(() =>
  import('./screens/more').then((m) => ({ default: m.ProfileScreen }))
);
const DocumentsScreen = lazy(() =>
  import('./screens/more').then((m) => ({ default: m.DocumentsScreen }))
);
const HelpSupportScreen = lazy(() =>
  import('./screens/more').then((m) => ({ default: m.HelpSupportScreen }))
);

// ============================================================
// SCREEN LOADER
// ============================================================

function ScreenLoader() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <Skeleton className="h-5 w-48" />
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

// ============================================================
// HEADER COMPONENT
// ============================================================

function CustomerHeader() {
  const { currentScreen, goBack } = useCustomerAppStore();

  const showBack = currentScreen !== 'dashboard' && currentScreen !== 'complaints' && currentScreen !== 'invoices' && currentScreen !== 'profile' && currentScreen !== 'notifications';

  const titles: Record<string, string> = {
    dashboard: 'MOHD.HMS ENTERPRISE',
    complaints: 'My Complaints',
    'complaint-detail': 'Complaint Details',
    'new-complaint': 'New Complaint',
    'work-order-detail': 'Work Order Details',
    'track-technician': 'Track Technician',
    'rate-feedback': 'Rate & Feedback',
    invoices: 'My Invoices',
    notifications: 'Notifications',
    profile: 'Profile',
    documents: 'My Documents',
    'help-support': 'Help & Support',
  };

  return (
    <header className="sticky top-0 z-50 bg-emerald-600 text-white">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={goBack}
              className="p-1 -ml-1 hover:bg-emerald-500 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-lg font-bold tracking-tight">
            {titles[currentScreen] || 'MOHD.HMS ENTERPRISE'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentScreen === 'dashboard' && (
            <button
              onClick={() => useCustomerAppStore.getState().setScreen('notifications')}
              className="relative p-2 hover:bg-emerald-500 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-emerald-600" />
            </button>
          )}
          {currentScreen === 'notifications' && (
            <button
              onClick={() => {}}
              className="text-xs text-emerald-100 hover:text-white transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => useCustomerAppStore.getState().setScreen('profile')}
            className="p-1 hover:bg-emerald-500 rounded-lg transition-colors"
            aria-label="Profile"
          >
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// BOTTOM NAVIGATION
// ============================================================

function BottomNav() {
  const { currentTab, setTab, currentScreen } = useCustomerAppStore();

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home, screens: ['dashboard', 'help-support'] },
    { id: 'complaints' as const, label: 'Complaints', icon: ClipboardList, screens: ['complaints', 'complaint-detail', 'new-complaint', 'work-order-detail', 'track-technician', 'rate-feedback'] },
    { id: 'invoices' as const, label: 'Invoices', icon: Receipt, screens: ['invoices'] },
    { id: 'more' as const, label: 'More', icon: Grid3X3, screens: ['profile', 'documents', 'notifications', 'help-support'] },
  ];

  const activeTab = tabs.find((t) => t.screens.includes(currentScreen))?.id || 'home';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-end justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[56px]',
                isActive ? 'text-emerald-600' : 'text-gray-400'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -top-px left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
        {/* FAB - New Complaint */}
        <button
          onClick={() => useCustomerAppStore.getState().setScreen('new-complaint')}
          className="flex items-center justify-center w-12 h-12 -mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          aria-label="New Complaint"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </nav>
  );
}

// ============================================================
// SCREEN ROUTER
// ============================================================

function ScreenRouter() {
  const { currentScreen, screenParams } = useCustomerAppStore();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentScreen}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="min-h-full"
      >
        <Suspense fallback={<ScreenLoader />}>
          {currentScreen === 'dashboard' && <DashboardScreen />}
          {currentScreen === 'complaints' && <ComplaintsScreen />}
          {currentScreen === 'complaint-detail' && <ComplaintDetailScreen />}
          {currentScreen === 'new-complaint' && <NewComplaintScreen />}
          {currentScreen === 'work-order-detail' && <WorkOrderDetailScreen />}
          {currentScreen === 'track-technician' && <TrackTechnicianScreen />}
          {currentScreen === 'rate-feedback' && <RateFeedbackScreen />}
          {currentScreen === 'invoices' && <InvoicesScreen />}
          {currentScreen === 'notifications' && <NotificationsScreen />}
          {currentScreen === 'profile' && <ProfileScreen />}
          {currentScreen === 'documents' && <DocumentsScreen />}
          {currentScreen === 'help-support' && <HelpSupportScreen />}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// CUSTOMER MOBILE APP SHELL
// ============================================================

export function CustomerMobileApp() {
  return (
    <div className="h-dvh flex flex-col bg-gray-50 max-w-lg mx-auto relative overflow-hidden shadow-2xl">
      {/* Header */}
      <CustomerHeader />

      {/* Screen Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <ScreenRouter />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}