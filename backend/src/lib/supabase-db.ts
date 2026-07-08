/**
 * Supabase REST API Adapter — Prisma-compatible interface
 *
 * Uses native fetch() to call Supabase PostgREST API directly.
 * Zero runtime dependencies beyond what Node.js provides.
 *
 * All API routes import { db } from '@/lib/db' — this is the backend.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ---------------------------------------------------------------------------
// 1. Low-level Supabase REST caller
// ---------------------------------------------------------------------------

interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count: number | null;
}

async function supabaseRequest<T = any>(
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  options: {
    select?: string;
    filters?: Record<string, string>;
    order?: string;
    limit?: number;
    offset?: number;
    body?: any;
    single?: boolean;
    head?: boolean;
    upsert?: boolean;
    onConflict?: string;
  } = {}
): Promise<SupabaseResponse<T>> {
  const { select, filters, order, limit, offset, body, single, head, upsert, onConflict } = options;

  // Build URL
  const params = new URLSearchParams();
  if (select) params.set('select', select);
  for (const [k, v] of Object.entries(filters || {})) {
    params.set(k, v);
  }
  if (order) params.set('order', order);
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));

  const url = `${SUPABASE_URL}/rest/v1/${table}${params.toString() ? '?' + params : ''}`;

  // Build headers
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': head ? 'count=exact' : upsert ? `return=representation,resolution=${onConflict ? 'merge-duplicates' : 'merge'},return=minimal` : 'return=representation',
  };

  if (single) {
    headers['Prefer'] += ',return=representation,single=true';
  }

  // Make request
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse response
  const contentType = res.headers.get('content-type') || '';
  const contentRange = res.headers.get('content-range') || '';
  const countMatch = contentRange.match(/\/(\d+)/);
  const count = countMatch ? parseInt(countMatch[1]) : null;

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const errBody = await res.json() as Record<string, unknown>;
      msg = (errBody.message || errBody.msg || msg) as string;
    } catch { /* ignore */ }
    return { data: null, error: { message: msg, code: String(res.status) }, count };
  }

  if (head || res.status === 204) {
    return { data: null, error: null, count: count ?? 0 };
  }

  let data: T | null = null;
  try {
    const parsed = await res.json();
    data = parsed as T;
    if (single && Array.isArray(data)) {
      data = ((data as any[]).length > 0 ? (data as any[])[0] : null) as T;
    }
  } catch { /* ignore */ }

  return { data, error: null, count };
}

// ---------------------------------------------------------------------------
// 2. Where Clause → PostgREST Filters
// ---------------------------------------------------------------------------

function whereToFilters(where: Record<string, unknown>, prefix = ''): Record<string, string> {
  const filters: Record<string, string> = {};

  for (const [key, value] of Object.entries(where)) {
    const col = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) continue;

    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const obj = value as Record<string, unknown>;
      for (const [op, opVal] of Object.entries(obj)) {
        if (op === 'equals' || op === 'eq' || (!op.startsWith('_') && typeof opVal !== 'object')) {
          const v = (op === 'equals' || op === 'eq') ? opVal : value;
          if (typeof v === 'boolean') filters[col] = `is.${v}`;
          else if (v instanceof Date) filters[col] = `eq.${v.toISOString()}`;
          else filters[col] = `eq.${v}`;
          break;
        }
        if (op === 'in') {
          filters[col] = `in.(${(opVal as any[]).join(',')})`;
        } else if (op === 'notIn') {
          filters[col] = `not.in.(${(opVal as any[]).join(',')})`;
        } else if (op === 'contains') {
          filters[col] = `ilike.%${opVal}%`;
        } else if (op === 'startsWith') {
          filters[col] = `ilike.${opVal}%`;
        } else if (op === 'endsWith') {
          filters[col] = `ilike.%${opVal}`;
        } else if (op === 'gt') {
          filters[col] = `gt.${opVal}`;
        } else if (op === 'gte') {
          filters[col] = `gte.${opVal}`;
        } else if (op === 'lt') {
          filters[col] = `lt.${opVal}`;
        } else if (op === 'lte') {
          filters[col] = `lte.${opVal}`;
        } else if (op === 'ne' || op === 'not') {
          if (opVal === null) filters[col] = 'not.is.null';
          else filters[col] = `neq.${opVal}`;
        } else if (op === 'mode' || op === 'path') {
          // Prisma internal
        }
      }
    } else if (typeof value === 'boolean') {
      filters[col] = `is.${value}`;
    } else if (value instanceof Date) {
      filters[col] = `eq.${value.toISOString()}`;
    } else {
      filters[col] = `eq.${value}`;
    }
  }
  return filters;
}

// ---------------------------------------------------------------------------
// 3. Select Builder
// ---------------------------------------------------------------------------

function buildSelect(select?: Record<string, unknown>, include?: Record<string, unknown>): string | undefined {
  if (select && Object.keys(select).length > 0) return _buildFields(select);
  if (include && Object.keys(include).length > 0) return _buildFields(include, true);
  return undefined;
}

function _buildFields(fields: Record<string, unknown>, isInclude = false): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === 'boolean' && val) {
      parts.push(key);
    } else if (typeof val === 'object' && val !== null) {
      parts.push(`${key}(${_buildFields(val as Record<string, unknown>, 'select' in (val as any))})`);
    }
  }
  return parts.join(',');
}

// ---------------------------------------------------------------------------
// 4. Order By Builder
// ---------------------------------------------------------------------------

function buildOrderBy(orderBy: unknown): string {
  if (!orderBy) return '';
  if (typeof orderBy === 'string') return orderBy;
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  return arr.map((o: any) => {
    if (typeof o === 'string') return o;
    const k = Object.keys(o)[0];
    return `${k}.${o[k] === 'desc' ? 'desc' : 'asc'}`;
  }).join(',');
}

// ---------------------------------------------------------------------------
// 5. Table Proxy Factory
// ---------------------------------------------------------------------------

type PrismaArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  skip?: number;
};

function createTableProxy(tableName: string) {
  return {
    async findMany(args?: PrismaArgs) {
      const r = await supabaseRequest(tableName, 'GET', {
        select: buildSelect(args?.select, args?.include),
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
        order: args?.orderBy ? buildOrderBy(args.orderBy) : undefined,
        limit: args?.take,
        offset: args?.skip,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.findMany: ${r.error.message}`);
      return r.data ?? [];
    },

    async findFirst(args?: PrismaArgs) {
      const r = await supabaseRequest(tableName, 'GET', {
        select: buildSelect(args?.select, args?.include),
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
        order: args?.orderBy ? buildOrderBy(args.orderBy) : undefined,
        limit: 1,
        single: true,
      });
      if (r.error && r.error.code === '406') return null;
      if (r.error) throw new Error(`[Supabase] ${tableName}.findFirst: ${r.error.message}`);
      return r.data ?? null;
    },

    async findUnique(args: { where: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'GET', {
        select: buildSelect(args?.select, args?.include),
        filters: whereToFilters(args.where as any),
        limit: 1,
        single: true,
      });
      if (r.error && r.error.code === '406') return null;
      if (r.error) throw new Error(`[Supabase] ${tableName}.findUnique: ${r.error.message}`);
      return r.data ?? null;
    },

    async create(args: { data: Record<string, unknown>; select?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'POST', {
        select: buildSelect(args?.select),
        body: args.data,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.create: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },

    async update(args: { where: Record<string, unknown>; data: Record<string, unknown>; select?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'PATCH', {
        select: buildSelect(args?.select),
        filters: whereToFilters(args.where as any),
        body: args.data,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.update: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },

    async delete(args: { where: Record<string, unknown>; select?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'DELETE', {
        select: buildSelect(args?.select),
        filters: whereToFilters(args.where as any),
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.delete: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },

    async count(args?: { where?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'GET', {
        head: true,
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.count: ${r.error.message}`);
      return r.count ?? 0;
    },

    async upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown>; select?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'POST', {
        select: buildSelect(args?.select),
        body: args.create,
        upsert: true,
        onConflict: Object.keys(args.where)[0],
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.upsert: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },

    async updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'PATCH', {
        filters: whereToFilters(args.where as any),
        body: args.data,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.updateMany: ${r.error.message}`);
      return { count: Array.isArray(r.data) ? r.data.length : 0 };
    },

    async deleteMany(args?: { where?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'DELETE', {
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.deleteMany: ${r.error.message}`);
      return { count: Array.isArray(r.data) ? r.data.length : 0 };
    },

    async createMany(args: { data: Record<string, unknown>[]; skipDuplicates?: boolean }) {
      if (!args.data || args.data.length === 0) return { count: 0 };
      const r = await supabaseRequest(tableName, 'POST', {
        body: args.data,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.createMany: ${r.error.message}`);
      return { count: Array.isArray(r.data) ? r.data.length : args.data.length };
    },

    async aggregate(args: { where?: Record<string, unknown>; _count?: Record<string, unknown>; _sum?: Record<string, boolean> }) {
      // Handle _sum by fetching rows
      if (args._sum) {
        const sumFields = Object.entries(args._sum).filter(([, v]) => v).map(([k]) => k);
        if (sumFields.length > 0) {
          const select = sumFields.join(',');
          const r = await supabaseRequest(tableName, 'GET', {
            select,
            filters: args?.where ? whereToFilters(args.where as any) : undefined,
          });
          if (r.error) throw new Error(`[Supabase] ${tableName}.aggregate: ${r.error.message}`);

          const rows = (r.data ?? []) as Record<string, unknown>[];
          const sums: Record<string, number> = {};
          for (const field of sumFields) {
            sums[field] = rows.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
          }

          return { _sum: sums };
        }
      }

      // Fallback: count only
      const r = await supabaseRequest(tableName, 'GET', {
        head: true,
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.aggregate: ${r.error.message}`);
      return { _count: { _all: r.count ?? 0 } };
    },

    async groupBy(args: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, unknown> }) {
      const r = await supabaseRequest(tableName, 'GET', {
        select: args.by.join(','),
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.groupBy: ${r.error.message}`);

      const rows = (r.data ?? []) as Record<string, unknown>[];
      const groups = new Map<string, Record<string, unknown>>();

      for (const row of rows) {
        const key = args.by.map(b => String(row[b] ?? '')).join('|||');
        const existing = groups.get(key);
        if (existing) {
          (existing._count as any).id = ((existing._count as any).id || 0) + 1;
        } else {
          const group: Record<string, unknown> = { ...row, _count: { id: 1 } };
          groups.set(key, group);
        }
      }

      return Array.from(groups.values());
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Model Name Mapping
// ---------------------------------------------------------------------------

const MODEL_MAP: Record<string, string> = {
  user: 'User', tenant: 'Tenant', department: 'Department', customer: 'Customer',
  equipment: 'Equipment', complaint: 'Complaint', workOrder: 'WorkOrder',
  invoice: 'Invoice', quotation: 'Quotation', pmSchedule: 'PmSchedule',
  inventoryItem: 'InventoryItem', inventoryCategory: 'InventoryCategory',
  inventorySubcategory: 'InventorySubcategory', warehouse: 'Warehouse',
  itemSupplier: 'ItemSupplier', stockMovement: 'StockMovement',
  warehouseStock: 'WarehouseStock', priceBook: 'PriceBook',
  priceBookEntry: 'PriceBookEntry', purchaseOrder: 'PurchaseOrder',
  vehicle: 'Vehicle', vehicleLog: 'VehicleLog', notification: 'Notification',
  deviceToken: 'DeviceToken', notificationLog: 'NotificationLog',
  auditLog: 'AuditLog', checklistTemplate: 'ChecklistTemplate',
  equipmentQrCode: 'EquipmentQrCode', scanLog: 'ScanLog',
  complaintTimeline: 'ComplaintTimeline', workOrderMaterial: 'WorkOrderMaterial',
  whatsAppConfig: 'WhatsAppConfig', whatsAppSession: 'WhatsAppSession',
  whatsAppMessage: 'WhatsAppMessage', whatsAppTemplate: 'WhatsAppTemplate',
  conversationThread: 'ConversationThread', customerFeedback: 'CustomerFeedback',
  customerReport: 'CustomerReport', broadcastLog: 'BroadcastLog',
  whatsAppDeliveryLog: 'WhatsAppDeliveryLog', otpCode: 'OtpCode',
  loginSession: 'LoginSession', device: 'Device',
  passwordResetToken: 'PasswordResetToken', passwordResetOtp: 'PasswordResetOtp',
  authAuditLog: 'AuthAuditLog', termsAcceptance: 'TermsAcceptance',
  emailLog: 'EmailLog', emailTemplate: 'EmailTemplate',
  hrEmployee: 'HrEmployee', hrShift: 'HrShift',
  hrShiftSchedule: 'HrShiftSchedule', hrHoliday: 'HrHoliday',
  hrLeaveType: 'HrLeaveType', hrLeaveBalance: 'HrLeaveBalance',
  hrLeaveRequest: 'HrLeaveRequest', hrPayroll: 'HrPayroll',
  hrOvertimeRequest: 'HrOvertimeRequest', hrJobPosition: 'HrJobPosition',
  hrCandidate: 'HrCandidate', hrPerformanceReview: 'HrPerformanceReview',
  hrTraining: 'HrTraining', hrTrainingRecord: 'HrTrainingRecord',
  hrAssetAssignment: 'HrAssetAssignment', hrEmployeeDocument: 'HrEmployeeDocument',
  hrVisitor: 'HrVisitor', hrMedicalRecord: 'HrMedicalRecord',
  hrTravelRequest: 'HrTravelRequest', hrExpenseClaim: 'HrExpenseClaim',
  hrDisciplinaryAction: 'HrDisciplinaryAction', hrAnnouncement: 'HrAnnouncement',
  serviceItem: 'ServiceItem', serviceCategory: 'ServiceCategory',
  servicePackage: 'ServicePackage', labourRate: 'LabourRate',
  leaveRequest: 'LeaveRequest', attendance: 'Attendance',
  employee: 'HrEmployee', technician: 'User',
  cmsPage: 'CmsPage', cmsSetting: 'CmsSetting', cmsHero: 'CmsHero',
  cmsService: 'CmsService', cmsIndustry: 'CmsIndustry', cmsProject: 'CmsProject',
  cmsBlog: 'CmsBlog', cmsBlogCategory: 'CmsBlogCategory',
  cmsTestimonial: 'CmsTestimonial', cmsCareerJob: 'CmsCareerJob',
  cmsCareerApplication: 'CmsCareerApplication', cmsContactMessage: 'CmsContactMessage',
  cmsMedia: 'CmsMedia', cmsSeo: 'CmsSeo', cmsFooter: 'CmsFooter',
  cmsAnnouncement: 'CmsAnnouncement', cmsPopup: 'CmsPopup',
  cmsForm: 'CmsForm', cmsActivityLog: 'CmsActivityLog',
};

const cache = new Map<string, any>();

export const supabaseDb = new Proxy({} as any, {
  get(_, prop: string) {
    const table = MODEL_MAP[prop] || prop;
    if (!cache.has(table)) cache.set(table, createTableProxy(table));
    return cache.get(table);
  },
});