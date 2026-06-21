'use client';

import { lazy, Suspense } from 'react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-loaded module views
const DashboardView = lazy(() => import('@/components/modules/dashboard/dashboard-view').then(m => ({ default: m.DashboardView })));
const EquipmentList = lazy(() => import('@/components/modules/equipment/equipment-list').then(m => ({ default: m.EquipmentList })));
const EquipmentDetail = lazy(() => import('@/components/modules/equipment/equipment-detail').then(m => ({ default: m.EquipmentDetail })));
const ComplaintList = lazy(() => import('@/components/modules/complaints/complaint-list').then(m => ({ default: m.ComplaintList })));
const ComplaintDetail = lazy(() => import('@/components/modules/complaints/complaint-detail').then(m => ({ default: m.ComplaintDetail })));
const WorkOrderList = lazy(() => import('@/components/modules/work-orders/work-order-list').then(m => ({ default: m.WorkOrderList })));
const WorkOrderDetail = lazy(() => import('@/components/modules/work-orders/work-order-detail').then(m => ({ default: m.WorkOrderDetail })));
const InvoiceList = lazy(() => import('@/components/modules/invoices/invoice-list').then(m => ({ default: m.InvoiceList })));
const InvoiceDetail = lazy(() => import('@/components/modules/invoices/invoice-detail').then(m => ({ default: m.InvoiceDetail })));
const PmList = lazy(() => import('@/components/modules/pm/pm-list').then(m => ({ default: m.PmList })));
const QuotationList = lazy(() => import('@/components/modules/quotations/quotation-list').then(m => ({ default: m.QuotationList })));
const InventoryList = lazy(() => import('@/components/modules/inventory/inventory-list').then(m => ({ default: m.InventoryList })));
const CustomerList = lazy(() => import('@/components/modules/customers/customer-list').then(m => ({ default: m.CustomerList })));
const EmployeeList = lazy(() => import('@/components/modules/employees/employee-list').then(m => ({ default: m.EmployeeList })));
const PurchaseList = lazy(() => import('@/components/modules/purchases/purchase-list').then(m => ({ default: m.PurchaseList })));
const VehicleList = lazy(() => import('@/components/modules/vehicles/vehicle-list').then(m => ({ default: m.VehicleList })));
const FinanceView = lazy(() => import('@/components/modules/finance/finance-view').then(m => ({ default: m.FinanceView })));
const ReportView = lazy(() => import('@/components/modules/reports/report-view').then(m => ({ default: m.ReportView })));
const NotificationList = lazy(() => import('@/components/modules/notifications/notification-list').then(m => ({ default: m.NotificationList })));
const SettingsView = lazy(() => import('@/components/modules/settings/settings-view').then(m => ({ default: m.SettingsView })));

function ViewLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function ViewRouter() {
  const { currentView } = useAppStore();

  return (
    <Suspense fallback={<ViewLoader />}>
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'equipment' && <EquipmentList />}
      {currentView === 'equipment-detail' && <EquipmentDetail />}
      {currentView === 'complaints' && <ComplaintList />}
      {currentView === 'complaint-detail' && <ComplaintDetail />}
      {currentView === 'work-orders' && <WorkOrderList />}
      {currentView === 'work-order-detail' && <WorkOrderDetail />}
      {currentView === 'invoices' && <InvoiceList />}
      {currentView === 'invoice-detail' && <InvoiceDetail />}
      {currentView === 'pm' && <PmList />}
      {currentView === 'quotations' && <QuotationList />}
      {currentView === 'inventory' && <InventoryList />}
      {currentView === 'customers' && <CustomerList />}
      {currentView === 'employees' && <EmployeeList />}
      {currentView === 'purchases' && <PurchaseList />}
      {currentView === 'vehicles' && <VehicleList />}
      {currentView === 'finance' && <FinanceView />}
      {currentView === 'reports' && <ReportView />}
      {currentView === 'notifications' && <NotificationList />}
      {currentView === 'settings' && <SettingsView />}
      {currentView === 'profile' && <SettingsView />}
    </Suspense>
  );
}

export function AppShell() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-200',
          'lg:ml-[256px]',
          !sidebarOpen && 'lg:ml-[68px]'
        )}
      >
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">
          <ViewRouter />
        </main>
      </div>
    </div>
  );
}