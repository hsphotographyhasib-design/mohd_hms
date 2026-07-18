// IRMS Type Definitions

export type ViewKey =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "reports"
  | "report-builder"
  | "report-view"
  | "analytics"
  | "calendar"
  | "admin"
  | "settings";

// ─── New Inspection Types ───────────────────────────────────────────

export interface DashboardStats {
  totalInspections: number;
  scheduledToday: number;
  pending: number;
  completed: number;
  overdue: number;
  failed: number;
  passRate: number;
}

export interface InspectionItem {
  id: string;
  title: string;
  equipmentName?: string;
  equipmentId?: string;
  assignedToId?: string;
  assignedToName?: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  result?: 'pass' | 'fail' | 'conditional' | 'na';
  type?: string;
  templateId?: string;
  templateName?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionListResponse {
  items: InspectionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InspectorWorkload {
  id: string;
  name: string;
  pending: number;
  completed: number;
  inProgress: number;
}

export interface EquipmentDueItem {
  id: string;
  name: string;
  lastInspection?: string;
  nextDue: string;
  isOverdue: boolean;
  category?: string;
}

export interface ComplianceSummary {
  pass: number;
  fail: number;
  conditional: number;
  na: number;
  total: number;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id?: string;
  question: string;
  type: 'pass_fail' | 'yes_no' | 'rating' | 'text' | 'photo' | 'numeric';
  required: boolean;
  helpText?: string;
}

export interface GeneratedReport {
  id: string;
  type: string;
  title: string;
  generatedAt: string;
  format: 'pdf' | 'excel' | 'csv';
  downloadUrl?: string;
  size?: string;
}

export interface AnalyticsSummary {
  monthlyTrend: { month: string; count: number; pass: number; fail: number }[];
  statusBreakdown: { status: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  topInspectors: { name: string; completed: number; total: number; rate: number }[];
  passFailByCategory: { category: string; pass: number; fail: number; total: number }[];
}

export interface CalendarInspection {
  id: string;
  title: string;
  date: string;
  status: string;
  priority: string;
  assignedToName?: string;
  equipmentName?: string;
}

export interface ReportsFilter {
  status?: string;
  priority?: string;
  category?: string;
  q?: string;
  projectId?: string;
}

export interface IrmUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IrmProject {
  id: string;
  name: string;
  number?: string | null;
  contractNumber?: string | null;
  tenderNumber?: string | null;
  customer?: string | null;
  location?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  value?: number | null;
  startDate?: string | null;
  completionDate?: string | null;
  status: string;
  logo?: string | null;
  clientLogo?: string | null;
  consultant?: string | null;
  contractor?: string | null;
  supervisor?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { reports: number };
}

export interface IrmReport {
  id: string;
  number: string;
  projectId: string;
  inspectionDate: string;
  inspectorId: string;
  department?: string | null;
  site?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  equipment?: string | null;
  assetId?: string | null;
  workCategory?: string | null;
  inspectionType?: string | null;
  priority: string;
  status: string;
  jobOrderNumber?: string | null;
  workOrderNumber?: string | null;
  taskDescription?: string | null;
  workScope?: string | null;
  inspectionNotes?: string | null;
  correctiveActions?: string | null;
  recommendation?: string | null;
  observation?: string | null;
  safetyNotes?: string | null;
  rootCause?: string | null;
  materialsUsed?: string | null;
  labourHours?: number | null;
  completionPct: number;
  assessedById?: string | null;
  assessedDate?: string | null;
  inspectorSign?: string | null;
  supervisorSign?: string | null;
  clientSign?: string | null;
  managerSign?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (populated by API)
  project?: IrmProject;
  inspector?: IrmUser;
  assessedBy?: IrmUser;
  photos?: IrmPhoto[];
  revisions?: IrmRevision[];
  approvals?: IrmApproval[];
  activities?: IrmActivity[];
  _count?: { photos: number };
}

export interface IrmPhoto {
  id: string;
  reportId: string;
  type: string;
  data: string;
  thumbnail: string;
  originalImage?: string | null;
  caption?: string | null;
  swRef?: string | null;
  photoNumber?: string | null;
  room?: string | null;
  building?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  mimeType?: string | null;
  cameraModel?: string | null;
  exifData?: string | null;
  timestamp: string;
  annotation?: string | null;
  sortOrder: number;
  createdBy?: string | null;
  createdAt: string;
}

export interface IrmRevision {
  id: string;
  reportId: string;
  version: number;
  snapshot: string;
  note?: string | null;
  userId: string;
  createdAt: string;
  user?: IrmUser;
}

export interface IrmApproval {
  id: string;
  reportId: string;
  step: string;
  status: string;
  userId: string;
  comment?: string | null;
  createdAt: string;
  user?: IrmUser;
}

export interface IrmActivity {
  id: string;
  type: string;
  description: string;
  userId?: string | null;
  reportId?: string | null;
  projectId?: string | null;
  createdAt: string;
  user?: IrmUser;
}

export interface DashboardData {
  todayInspections: number;
  completedReports: number;
  pendingReports: number;
  overdueReports: number;
  activeProjects: number;
  activeWorkOrders: number;
  photosUploaded: number;
  avgCompletion: number;
  recentReports: IrmReport[];
  upcomingInspections: IrmReport[];
  inspectionTrend: { date: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  projectProgress: { name: string; progress: number; reports: number }[];
  recentActivities: IrmActivity[];
}

export interface AnalyticsData {
  totalReports: number;
  completedReports: number;
  pendingReports: number;
  overdueReports: number;
  avgCompletion: number;
  photosCount: number;
  activeProjects: number;
  totalUsers: number;
  monthlyTrend: { month: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  technicianPerformance: { name: string; reports: number; avgCompletion: number }[];
}

export type PhotoCategoryKey =
  | "before"
  | "after"
  | "progress"
  | "during"
  | "inspection"
  | "completion"
  | "defect"
  | "evidence";

export interface PhotoCategory {
  key: PhotoCategoryKey;
  label: string;
  prefix: string;
  color: string;
}

export type PdfTemplateKey =
  | "government"
  | "commercial"
  | "maintenance"
  | "electrical"
  | "hvac"
  | "civil";

export type SortOption = "oldest" | "newest" | "swref" | "room" | "area" | "category";

export interface PdfTemplate {
  key: PdfTemplateKey;
  accent: string;
  label: string;
}

export interface AnnotationLayer {
  type: "arrow" | "circle" | "rectangle" | "highlight" | "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  text?: string;
  color: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  category: PhotoCategoryKey;
  thumbnail?: string;
  error?: string;
}