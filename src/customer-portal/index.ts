// Customer Portal barrel export

// Components
export { CustomerPortal } from './components/customer-portal';

// App
export { CustomerMobileApp } from './app/customer-shell';

// Screens
export {
  WorkOrderDetailScreen,
  TrackTechnicianScreen,
  RateFeedbackScreen,
} from './app/screens/tracking';
export {
  ComplaintsScreen,
  ComplaintDetailScreen,
  NewComplaintScreen,
} from './app/screens/complaints';
export {
  ProfileScreen,
  DocumentsScreen,
  HelpSupportScreen,
} from './app/screens/more';
export {
  InvoicesScreen,
  NotificationsScreen,
} from './app/screens/invoices';
export { DashboardScreen } from './app/screens/dashboard';

// Store
export {
  useCustomerAppStore,
  type CustomerScreen,
  type CustomerTab,
} from './store';