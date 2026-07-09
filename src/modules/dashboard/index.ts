// ─── Components ───────────────────────────────────────────────────────────────
export { MobileDashboardSkeleton, MobileDashboard } from './components/mobile-dashboard';
export { DashboardView } from './components/dashboard-view';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export {
  type DashboardKpiData,
  type DashboardChartsData,
  type DashboardRecentData,
  type DashboardFilters,
  useDashboardKpi,
  useDashboardCharts,
  useDashboardRecent,
  useInvalidateDashboard,
} from './hooks/use-dashboard-queries';

// ─── Services ─────────────────────────────────────────────────────────────────
export {
  type DashboardScope,
  buildDashboardScope,
} from './services/dashboard-scope';