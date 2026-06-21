// ============ AUTH & USER TYPES ============

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'supervisor' | 'technician' | 'finance' | 'customer';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  tenantId: string;
  tenantName?: string;
  tenantDomain?: string;
  employeeNumber?: string;
  departmentId?: string;
  profileCompleted: boolean;
}

// ============ NAVIGATION ============

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
  children?: NavItem[];
  badge?: number;
}

export type AppView =
  | 'login'
  | 'dashboard'
  | 'equipment'
  | 'equipment-detail'
  | 'complaints'
  | 'complaint-detail'
  | 'work-orders'
  | 'work-order-detail'
  | 'invoices'
  | 'invoice-detail'
  | 'pm'
  | 'quotations'
  | 'inventory'
  | 'customers'
  | 'employees'
  | 'purchases'
  | 'vehicles'
  | 'finance'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'profile';

// ============ EQUIPMENT ============

export type EquipmentCategory = 'HVAC' | 'Electrical' | 'Plumbing' | 'Generator' | 'Mechanical' | 'FireProtection';
export type EquipmentStatus = 'active' | 'inactive' | 'under_maintenance' | 'decommissioned';

export interface EquipmentItem {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  name: string;
  category: EquipmentCategory;
  assetNumber: string;
  qrCode: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  installDate?: string;
  warrantyExpiry?: string;
  status: EquipmentStatus;
  photos?: string;
  documents?: string;
  specifications?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { complaints: number; workOrders: number };
}

// ============ COMPLAINTS ============

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface ComplaintItem {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  equipmentId?: string;
  equipmentName?: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  category?: string;
  photos?: string;
  assignedToId?: string;
  assignedToName?: string;
  supervisorId?: string;
  supervisorName?: string;
  resolutionNotes?: string;
  customerRating?: number;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  workOrders?: WorkOrderItem[];
}

// ============ WORK ORDERS ============

export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkOrderType = 'corrective' | 'preventive' | 'emergency';

export interface WorkOrderItem {
  id: string;
  tenantId: string;
  complaintId?: string;
  equipmentId?: string;
  equipmentName?: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: string;
  type: WorkOrderType;
  assignedToId?: string;
  assignedToName?: string;
  createdBy?: string;
  creatorName?: string;
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
  laborHours?: number;
  laborCost?: number;
  materialCost?: number;
  totalCost?: number;
  notes?: string;
  photos?: string;
  checklistData?: string;
  technicianSignature?: string;
  customerSignature?: string;
  createdAt: string;
  updatedAt: string;
  materials?: WorkOrderMaterialItem[];
}

export interface WorkOrderMaterialItem {
  id: string;
  workOrderId: string;
  inventoryItemId: string;
  itemName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

// ============ INVOICES ============

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' | 'OVERDUE';

export interface InvoiceItem {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  workOrderId?: string;
  invoiceNumber: string;
  title: string;
  description?: string;
  items?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  dueDate?: string;
  paidAt?: string;
  paymentMethod?: string;
  sentVia?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ QUOTATIONS ============

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface QuotationItem {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  title: string;
  description?: string;
  items?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: QuotationStatus;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ PM SCHEDULES ============

export type PmFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';

export interface PmScheduleItem {
  id: string;
  tenantId: string;
  equipmentId: string;
  equipmentName?: string;
  title: string;
  description?: string;
  frequency: PmFrequency;
  customDays?: number;
  lastExecuted?: string;
  nextDueDate: string;
  assignedToId?: string;
  assignedToName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ============ INVENTORY ============

export interface InventoryItemData {
  id: string;
  tenantId: string;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  unit: string;
  quantity: number;
  minStock: number;
  unitCost: number;
  supplier?: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ CUSTOMERS ============

export interface CustomerData {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  companyName?: string;
  customerNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { equipment: number; complaints: number; invoices: number };
}

// ============ EMPLOYEES ============

export interface EmployeeData {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  employeeNumber?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  isOnline: boolean;
  lastLogin?: string;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ VEHICLES ============

export interface VehicleData {
  id: string;
  tenantId: string;
  plateNumber: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  fuelType?: string;
  status: string;
  currentMileage?: number;
  nextServiceDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ PURCHASE ORDERS ============

export interface PurchaseOrderData {
  id: string;
  tenantId: string;
  poNumber: string;
  supplier: string;
  supplierContact?: string;
  items?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  expectedDate?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ DASHBOARD ============

export interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  openComplaints: number;
  inProgressComplaints: number;
  totalWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pmCompliance: number;
  totalCustomers: number;
  totalEmployees: number;
  lowStockItems: number;
  monthlyRevenue: { month: string; revenue: number }[];
  complaintsByCategory: { category: string; count: number }[];
  complaintsByStatus: { status: string; count: number }[];
  recentComplaints: ComplaintItem[];
  recentWorkOrders: WorkOrderItem[];
  upcomingPm: PmScheduleItem[];
}

// ============ NOTIFICATIONS ============

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  isRead: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ COMMON ============

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}

export interface SelectOption {
  label: string;
  value: string;
}