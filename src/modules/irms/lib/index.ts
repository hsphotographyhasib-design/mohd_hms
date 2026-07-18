export { useInspectionStore } from './store';
export type { InspectionTab } from './store';

// Keep existing type exports that are still useful for reports
export type {
  IrmReport,
  IrmPhoto,
  IrmRevision,
  IrmApproval,
  IrmActivity,
  DashboardData,
  AnalyticsData,
  PhotoCategoryKey,
  PdfTemplateKey,
  SortOption,
  PdfTemplate,
  AnnotationLayer,
  UploadQueueItem,
  // New inspection types
  DashboardStats,
  InspectionItem,
  InspectionListResponse,
  InspectorWorkload,
  EquipmentDueItem,
  ComplianceSummary,
  InspectionTemplate,
  ChecklistItem,
  GeneratedReport,
  AnalyticsSummary,
  CalendarInspection,
} from './types';

export {
  PHOTO_CATEGORIES,
  PDF_TEMPLATES,
  SORT_OPTIONS,
  INSPECTION_TYPES,
  DEPARTMENTS,
  ANNOTATION_COLORS,
} from './constants';