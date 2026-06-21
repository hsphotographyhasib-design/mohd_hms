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

// CMS views
const CmsDashboard = lazy(() => import('@/components/modules/cms/cms-dashboard').then(m => ({ default: m.CmsDashboard })));
const CmsServices = lazy(() => import('@/components/modules/cms/cms-services').then(m => ({ default: m.CmsServices })));
const CmsIndustries = lazy(() => import('@/components/modules/cms/cms-industries').then(m => ({ default: m.CmsIndustries })));
const CmsProjects = lazy(() => import('@/components/modules/cms/cms-projects').then(m => ({ default: m.CmsProjects })));
const CmsBlogs = lazy(() => import('@/components/modules/cms/cms-blogs').then(m => ({ default: m.CmsBlogs })));
const CmsTestimonials = lazy(() => import('@/components/modules/cms/cms-testimonials').then(m => ({ default: m.CmsTestimonials })));
const CmsCareers = lazy(() => import('@/components/modules/cms/cms-careers').then(m => ({ default: m.CmsCareers })));
const CmsContact = lazy(() => import('@/components/modules/cms/cms-contact').then(m => ({ default: m.CmsContact })));
const CmsMedia = lazy(() => import('@/components/modules/cms/cms-media').then(m => ({ default: m.CmsMedia })));
const CmsSeo = lazy(() => import('@/components/modules/cms/cms-seo').then(m => ({ default: m.CmsSeo })));
const CmsHero = lazy(() => import('@/components/modules/cms/cms-hero').then(m => ({ default: m.CmsHero })));
const CmsAbout = lazy(() => import('@/components/modules/cms/cms-about').then(m => ({ default: m.CmsAbout })));
const CmsHeader = lazy(() => import('@/components/modules/cms/cms-header').then(m => ({ default: m.CmsHeader })));
const CmsFooter = lazy(() => import('@/components/modules/cms/cms-footer').then(m => ({ default: m.CmsFooter })));
const CmsAnnouncements = lazy(() => import('@/components/modules/cms/cms-announcements').then(m => ({ default: m.CmsAnnouncements })));
const CmsPopups = lazy(() => import('@/components/modules/cms/cms-popups').then(m => ({ default: m.CmsPopups })));
const CmsForms = lazy(() => import('@/components/modules/cms/cms-forms').then(m => ({ default: m.CmsForms })));
const CmsActivity = lazy(() => import('@/components/modules/cms/cms-activity').then(m => ({ default: m.CmsActivity })));

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
      {currentView === 'cms-dashboard' && <CmsDashboard />}
      {currentView === 'cms-services' && <CmsServices />}
      {currentView === 'cms-industries' && <CmsIndustries />}
      {currentView === 'cms-projects' && <CmsProjects />}
      {currentView === 'cms-blogs' && <CmsBlogs />}
      {currentView === 'cms-testimonials' && <CmsTestimonials />}
      {currentView === 'cms-careers' && <CmsCareers />}
      {currentView === 'cms-contact' && <CmsContact />}
      {currentView === 'cms-media' && <CmsMedia />}
      {currentView === 'cms-seo' && <CmsSeo />}
      {currentView === 'cms-hero' && <CmsHero />}
      {currentView === 'cms-about' && <CmsAbout />}
      {currentView === 'cms-header' && <CmsHeader />}
      {currentView === 'cms-footer' && <CmsFooter />}
      {currentView === 'cms-announcements' && <CmsAnnouncements />}
      {currentView === 'cms-popups' && <CmsPopups />}
      {currentView === 'cms-forms' && <CmsForms />}
      {currentView === 'cms-activity' && <CmsActivity />}
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