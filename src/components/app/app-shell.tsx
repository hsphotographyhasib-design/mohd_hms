'use client';

import { lazy, Suspense } from 'react';
import { useAppStore } from '@/store';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/nav/app-header';
import { FloatingNavBar } from '@/components/nav/floating-nav-bar';

// Lazy-loaded module views
const DashboardView = lazy(() => import('@/components/modules/dashboard/dashboard-view').then(m => ({ default: m.DashboardView })));
const EquipmentList = lazy(() => import('@/components/modules/equipment/equipment-list').then(m => ({ default: m.EquipmentList })));
const EquipmentDetail = lazy(() => import('@/components/modules/equipment/equipment-detail').then(m => ({ default: m.EquipmentDetail })));
const ComplaintList = lazy(() => import('@/components/modules/complaints/complaint-list').then(m => ({ default: m.ComplaintList })));
const ComplaintDetail = lazy(() => import('@/components/modules/complaints/complaint-detail').then(m => ({ default: m.ComplaintDetail })));
const NewComplaint = lazy(() => import('@/components/modules/complaints/new-complaint').then(m => ({ default: m.NewComplaint })));
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

// WhatsApp views
const WhatsAppDashboard = lazy(() => import('@/components/modules/whatsapp/whatsapp-dashboard').then(m => ({ default: m.WhatsAppDashboard })));
const WhatsAppChats = lazy(() => import('@/components/modules/whatsapp/whatsapp-chats').then(m => ({ default: m.WhatsAppChats })));
const WhatsAppTemplates = lazy(() => import('@/components/modules/whatsapp/whatsapp-templates').then(m => ({ default: m.WhatsAppTemplates })));
const WhatsAppCampaigns = lazy(() => import('@/components/modules/whatsapp/whatsapp-campaigns').then(m => ({ default: m.WhatsAppCampaigns })));
const WhatsAppSettings = lazy(() => import('@/components/modules/whatsapp/whatsapp-settings').then(m => ({ default: m.WhatsAppSettings })));

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
      {currentView === 'new-complaint' && <NewComplaint />}
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
      {currentView === 'whatsapp' && <WhatsAppDashboard />}
      {currentView === 'whatsapp-chats' && <WhatsAppChats />}
      {currentView === 'whatsapp-templates' && <WhatsAppTemplates />}
      {currentView === 'whatsapp-campaigns' && <WhatsAppCampaigns />}
      {currentView === 'whatsapp-settings' && <WhatsAppSettings />}
    </Suspense>
  );
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <AppHeader />
      {/* Floating Navigation Bar */}
      <FloatingNavBar />
      {/* Main Content - full width, no sidebar margin */}
      <main className="pt-2 pb-8">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <ViewRouter />
        </div>
      </main>
    </div>
  );
}