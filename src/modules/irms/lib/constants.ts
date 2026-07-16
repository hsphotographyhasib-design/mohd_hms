// IRMS Constants

import type { PhotoCategory, PdfTemplate, SortOption } from "./types";

// Photo Categories
export const PHOTO_CATEGORIES: PhotoCategory[] = [
  { key: "before", label: "Before Work", prefix: "B", color: "#64748b" },
  { key: "after", label: "After Work", prefix: "A", color: "#16a34a" },
  { key: "progress", label: "Progress", prefix: "P", color: "#0891b2" },
  { key: "during", label: "During Work", prefix: "D", color: "#7c3aed" },
  { key: "inspection", label: "Inspection", prefix: "I", color: "#1d4ed8" },
  { key: "completion", label: "Completion", prefix: "C", color: "#15803d" },
  { key: "defect", label: "Defect", prefix: "F", color: "#dc2626" },
  { key: "evidence", label: "Evidence", prefix: "E", color: "#b45309" },
];

// PDF Templates
export const PDF_TEMPLATES: PdfTemplate[] = [
  { key: "government", accent: "#111111", label: "Government" },
  { key: "commercial", accent: "#16A34A", label: "Commercial" },
  { key: "maintenance", accent: "#1D4ED8", label: "Maintenance" },
  { key: "electrical", accent: "#B45309", label: "Electrical" },
  { key: "hvac", accent: "#0E7490", label: "HVAC" },
  { key: "civil", accent: "#57534E", label: "Civil" },
];

// Sort Options
export const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "oldest", label: "Oldest First" },
  { key: "newest", label: "Newest First" },
  { key: "swref", label: "SW Reference" },
  { key: "room", label: "Room" },
  { key: "area", label: "Area (Building)" },
  { key: "category", label: "Category" },
];

// RBAC Roles
export const ROLES = [
  "Super Admin",
  "Admin",
  "Project Manager",
  "Site Engineer",
  "Inspector",
  "Supervisor",
  "Technician",
  "Quality Control",
  "Safety Officer",
  "Customer",
  "Viewer",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  "Super Admin": ["create", "edit", "delete", "approve", "manage"],
  Admin: ["create", "edit", "delete", "approve", "manage"],
  "Project Manager": ["create", "edit", "approve"],
  "Site Engineer": ["create", "edit"],
  Inspector: ["create", "edit"],
  Supervisor: ["approve"],
  Technician: ["create"],
  "Quality Control": ["approve"],
  "Safety Officer": ["view"],
  Customer: ["view"],
  Viewer: ["view"],
};

// Approval Workflow Steps
export const WORKFLOW_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "supervisor_review", label: "Supervisor Review" },
  { key: "manager_approval", label: "Manager Approval" },
  { key: "client_review", label: "Client Review" },
  { key: "approved", label: "Approved" },
  { key: "archived", label: "Archived" },
] as const;

export const STATUS_FLOW: Record<string, string> = {
  draft: "submitted",
  submitted: "supervisor_review",
  supervisor_review: "manager_approval",
  manager_approval: "client_review",
  client_review: "approved",
  approved: "archived",
};

// Report Statuses
export const REPORT_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-700" },
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-700" },
  { value: "supervisor_review", label: "Supervisor Review", color: "bg-yellow-100 text-yellow-700" },
  { value: "manager_approval", label: "Manager Approval", color: "bg-orange-100 text-orange-700" },
  { value: "client_review", label: "Client Review", color: "bg-purple-100 text-purple-700" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "archived", label: "Archived", color: "bg-slate-100 text-slate-500" },
];

export const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-600" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
];

export const WORK_CATEGORIES = [
  "Electrical",
  "Mechanical",
  "Plumbing",
  "HVAC",
  "Fire Protection",
  "Civil",
  "Structural",
  "Painting",
  "Cleaning",
  "Landscaping",
  "General Maintenance",
  "Preventive Maintenance",
  "Corrective Maintenance",
  "Emergency Repair",
  "Installation",
  "Testing & Commissioning",
];

export const INSPECTION_TYPES = [
  "Routine",
  "Scheduled",
  "Emergency",
  "Follow-up",
  "Final",
  "Progress",
  "Quality Control",
  "Safety",
  "Acceptance",
  "Handover",
];

export const DEPARTMENTS = [
  "Electrical",
  "Mechanical",
  "Plumbing",
  "HVAC",
  "Fire Protection",
  "Civil",
  "Quality Control",
  "Safety",
  "Project Management",
  "Facility Management",
];

// Annotation colors
export const ANNOTATION_COLORS = [
  "#dc2626",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
];