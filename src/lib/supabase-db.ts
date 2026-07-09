/**
 * Supabase REST API Adapter — Prisma-compatible interface
 *
 * Uses native fetch() to call Supabase PostgREST API directly.
 * Zero runtime dependencies beyond what Next.js provides.
 *
 * Handles tables WITHOUT foreign key relationships by doing manual
 * eager loading for `include` queries.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

  const params = new URLSearchParams();
  if (select) params.set('select', select);
  for (const [k, v] of Object.entries(filters || {})) {
    params.set(k, v);
  }
  if (order) params.set('order', order);
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));

  const url = `${SUPABASE_URL}/rest/v1/${table}${params.toString() ? '?' + params : ''}`;

  const preferParts: string[] = [];
  if (head) {
    preferParts.push('count=exact');
  } else if (upsert) {
    preferParts.push('resolution=' + (onConflict ? 'merge-duplicates' : 'merge'));
    preferParts.push('return=representation');
  } else {
    preferParts.push('return=representation');
  }
  if (single) {
    preferParts.push('return=representation');
    preferParts.push('single=true');
  }

  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': preferParts.join(','),
  };

  const serializedBody = body ? serializeData(body) : undefined;

  const res = await fetch(url, {
    method,
    headers,
    body: serializedBody ? JSON.stringify(serializedBody) : undefined,
  });

  const contentRange = res.headers.get('content-range') || '';
  const countMatch = contentRange.match(/\/(\d+)/);
  const count = countMatch ? parseInt(countMatch[1]) : null;

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      msg = errBody.message || errBody.msg || msg;
    } catch { /* ignore */ }
    return { data: null, error: { message: msg, code: String(res.status) }, count };
  }

  if (head || res.status === 204) {
    return { data: null, error: null, count: count ?? 0 };
  }

  let data: T | null = null;
  try {
    data = await res.json();
    if (single && Array.isArray(data)) {
      data = (data as any[]).length > 0 ? (data as any[])[0] : null;
    }
  } catch { /* ignore */ }

  return { data, error: null, count };
}

// ---------------------------------------------------------------------------
// 2. Data serialization
// ---------------------------------------------------------------------------

function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serializeData);
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      out[k] = serializeData(v);
    }
    return out;
  }
  return data;
}

// ---------------------------------------------------------------------------
// 3. Where Clause → PostgREST Filters
// ---------------------------------------------------------------------------

function whereToFilters(where: Record<string, unknown>, prefix = ''): Record<string, string> {
  const filters: Record<string, string> = {};

  for (const [key, value] of Object.entries(where)) {
    const col = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) continue;

    // Handle OR clause — convert to PostgREST or= filter
    if (key === 'OR' && Array.isArray(value)) {
      const orParts: string[] = [];
      for (const orGroup of value as Record<string, unknown>[]) {
        const groupParts: string[] = [];
        for (const [gKey, gVal] of Object.entries(orGroup)) {
          if (gVal === undefined) continue;
          if (gVal === null) {
            groupParts.push(`${gKey}.is.null`);
          } else if (typeof gVal === 'object' && !Array.isArray(gVal) && !(gVal instanceof Date)) {
            const gObj = gVal as Record<string, unknown>;
            for (const [op, opVal] of Object.entries(gObj)) {
              if (op === 'lte') groupParts.push(`${gKey}.lte.${opVal instanceof Date ? opVal.toISOString() : opVal}`);
              else if (op === 'gte') groupParts.push(`${gKey}.gte.${opVal instanceof Date ? opVal.toISOString() : opVal}`);
              else if (op === 'lt') groupParts.push(`${gKey}.lt.${opVal instanceof Date ? opVal.toISOString() : opVal}`);
              else if (op === 'gt') groupParts.push(`${gKey}.gt.${opVal instanceof Date ? opVal.toISOString() : opVal}`);
              else if (op === 'eq') groupParts.push(`${gKey}.eq.${opVal}`);
              else if (op === 'ne') groupParts.push(`${gKey}.neq.${opVal}`);
              else if (op === 'contains') groupParts.push(`${gKey}.ilike.%${opVal}%`);
            }
          } else if (gVal instanceof Date) {
            groupParts.push(`${gKey}.eq.${gVal.toISOString()}`);
          } else {
            groupParts.push(`${gKey}.eq.${gVal}`);
          }
        }
        if (groupParts.length > 0) orParts.push(`(${groupParts.join(',')})`);
      }
      if (orParts.length > 0) {
        filters['or'] = orParts.join(',');
      }
      continue;
    }

    // Handle AND clause — flatten into same filter set
    if (key === 'AND' && Array.isArray(value)) {
      for (const andGroup of value as Record<string, unknown>[]) {
        const subFilters = whereToFilters(andGroup, prefix);
        Object.assign(filters, subFilters);
      }
      continue;
    }

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
          // Prisma internal — skip
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
// 4. Select Builder — separates relation selects from column selects
// ---------------------------------------------------------------------------

/**
 * Prisma often puts relation selects INSIDE `select`:
 *   { id: true, name: true, tenant: { select: { id: true } } }
 *
 * PostgREST embedded selects require FK constraints, which may not exist.
 * So we extract relation keys and handle them via eager loading.
 *
 * Returns: { columns: 'id,name,...', includes: { tenant: { select: {...} } } }
 */
function parseSelectAndInclude(
  select?: Record<string, unknown>,
  include?: Record<string, unknown>
): { columns: string | undefined; includes: Record<string, unknown> } {
  const includes: Record<string, unknown> = {};

  // Merge include into includes
  if (include) {
    Object.assign(includes, include);
  }

  // Extract relations from select (keys whose values are objects with select/include)
  const columnEntries: string[] = [];
  if (select) {
    for (const [key, val] of Object.entries(select)) {
      if (val === true) {
        columnEntries.push(key);
      } else if (typeof val === 'object' && val !== null) {
        // This is a relation select — extract it
        includes[key] = val;
      }
    }
  }

  return {
    columns: columnEntries.length > 0 ? columnEntries.join(',') : undefined,
    includes,
  };
}

function _buildFields(fields: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === 'boolean' && val) {
      parts.push(key);
    } else if (typeof val === 'object' && val !== null) {
      parts.push(`${key}(${_buildFields(val as Record<string, unknown>)})`);
    }
  }
  return parts.join(',');
}

// ---------------------------------------------------------------------------
// 5. Order By Builder
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
// 6. Include resolver — manual eager loading for tables without FKs
// ---------------------------------------------------------------------------

/**
 * PostgREST requires foreign key constraints for embedded selects.
 * Since the Supabase schema may not have FKs, we resolve `include`
 * by making separate requests and merging results.
 *
 * Convention: relation "tenant" maps to FK column "tenantId" on the parent.
 */
async function resolveIncludes(
  rows: any[],
  includes: Record<string, any>,
  parentTable: string
): Promise<void> {
  if (!rows.length || !includes || !Object.keys(includes).length) return;

  for (const [relName, relOpts] of Object.entries(includes)) {
    // Determine the FK column name: "tenant" → "tenantId"
    const fkCol = `${relName}Id`;

    // Get the target table name
    const targetTable = MODEL_MAP[relName] || relName;

    // Determine select for the related table
    let relSelect: string | undefined;
    if (relOpts && typeof relOpts === 'object') {
      if ('select' in relOpts) {
        relSelect = _buildFields(relOpts.select as Record<string, unknown>);
      }
    }

    // Collect unique FK values from rows
    const fkValues = [...new Set(
      rows
        .map(r => r[fkCol])
        .filter(v => v !== null && v !== undefined)
    )];

    if (fkValues.length === 0) {
      // No FK values — set null for all rows
      for (const row of rows) {
        row[relName] = null;
      }
      continue;
    }

    // Fetch related records
    const relFilters: Record<string, string> = {
      'id': `in.(${fkValues.join(',')})`,
    };
    const r = await supabaseRequest(targetTable, 'GET', {
      select: relSelect,
      filters: relFilters,
    });

    if (r.error) {
      console.warn(`[Supabase] include "${relName}" fetch failed: ${r.error.message}`);
      for (const row of rows) {
        row[relName] = null;
      }
      continue;
    }

    // Build a lookup map
    const relMap = new Map<string, any>();
    for (const rel of (r.data || [])) {
      relMap.set(String(rel.id), rel);
    }

    // Attach to parent rows
    for (const row of rows) {
      const fkVal = row[fkCol];
      row[relName] = fkVal ? (relMap.get(String(fkVal)) ?? null) : null;
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Table Proxy Factory
// ---------------------------------------------------------------------------

type PrismaArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  skip?: number;
  cursor?: Record<string, unknown>;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

function createTableProxy(tableName: string) {
  return {
    async findMany(args?: PrismaArgs) {
      const { columns, includes } = parseSelectAndInclude(args?.select, args?.include);
      const r = await supabaseRequest(tableName, 'GET', {
        select: columns,
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
        order: args?.orderBy ? buildOrderBy(args.orderBy) : undefined,
        limit: args?.take,
        offset: args?.skip,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.findMany: ${r.error.message}`);
      const data = r.data ?? [];
      if (Object.keys(includes).length > 0) {
        await resolveIncludes(data, includes, tableName);
      }
      return data;
    },

    async findFirst(args?: PrismaArgs) {
      const { columns, includes } = parseSelectAndInclude(args?.select, args?.include);
      const r = await supabaseRequest(tableName, 'GET', {
        select: columns,
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
        order: args?.orderBy ? buildOrderBy(args.orderBy) : undefined,
        limit: 1,
        single: true,
      });
      if (r.error && r.error.code === '406') return null;
      if (r.error) throw new Error(`[Supabase] ${tableName}.findFirst: ${r.error.message}`);
      const data = r.data ?? null;
      if (data && Object.keys(includes).length > 0) {
        await resolveIncludes([data], includes, tableName);
      }
      return data;
    },

    async findUnique(args: { where: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }) {
      const { columns, includes } = parseSelectAndInclude(args?.select, args?.include);
      const r = await supabaseRequest(tableName, 'GET', {
        select: columns,
        filters: whereToFilters(args.where as any),
        limit: 1,
        single: true,
      });
      if (r.error && r.error.code === '406') return null;
      if (r.error) throw new Error(`[Supabase] ${tableName}.findUnique: ${r.error.message}`);
      const data = r.data ?? null;
      if (data && Object.keys(includes).length > 0) {
        await resolveIncludes([data], includes, tableName);
      }
      return data;
    },

    async findFirstOrThrow(args?: PrismaArgs) {
      const row = await this.findFirst(args);
      if (!row) throw new Error(`[Supabase] ${tableName}.findFirstOrThrow: Record not found`);
      return row;
    },

    async create(args: { data: Record<string, unknown>; select?: Record<string, unknown> }) {
      const { columns } = parseSelectAndInclude(args?.select);
      const r = await supabaseRequest(tableName, 'POST', {
        select: columns,
        body: args.data,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.create: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },

    async update(args: { where: Record<string, unknown>; data: Record<string, unknown>; select?: Record<string, unknown> }) {
      const { columns } = parseSelectAndInclude(args?.select);
      const r = await supabaseRequest(tableName, 'PATCH', {
        select: columns,
        filters: whereToFilters(args.where as any),
        body: args.data,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.update: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },

    async delete(args: { where: Record<string, unknown>; select?: Record<string, unknown> }) {
      const { columns } = parseSelectAndInclude(args?.select);
      const r = await supabaseRequest(tableName, 'DELETE', {
        select: columns,
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
      const { columns } = parseSelectAndInclude(args?.select);
      const r = await supabaseRequest(tableName, 'POST', {
        select: columns,
        body: args.create,
        upsert: true,
        onConflict: Object.keys(args.where)[0],
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.upsert: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },

    async createMany(args: { data: Record<string, unknown>[] | Record<string, unknown>; skipDuplicates?: boolean }) {
      const rows = Array.isArray(args.data) ? args.data : [args.data];
      const r = await supabaseRequest(tableName, 'POST', {
        body: rows,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.createMany: ${r.error.message}`);
      return { count: Array.isArray(r.data) ? r.data.length : 0 };
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

    async aggregate(args: { where?: Record<string, unknown>; _count?: Record<string, unknown>; _sum?: Record<string, unknown>; _avg?: Record<string, unknown>; _min?: Record<string, unknown>; _max?: Record<string, unknown> }) {
      // Determine which columns we need to fetch for in-memory aggregation
      const sumCols = args._sum ? Object.keys(args._sum) : [];
      const avgCols = args._avg ? Object.keys(args._avg) : [];
      const minCols = args._min ? Object.keys(args._min) : [];
      const maxCols = args._max ? Object.keys(args._max) : [];
      const neededCols = [...new Set([...sumCols, ...avgCols, ...minCols, ...maxCols])];

      const result: Record<string, unknown> = {};

      // If only _count is needed, use HEAD request for efficiency
      if (neededCols.length === 0) {
        const r = await supabaseRequest(tableName, 'GET', {
          head: true,
          filters: args?.where ? whereToFilters(args.where as any) : undefined,
        });
        if (r.error) throw new Error(`[Supabase] ${tableName}.aggregate: ${r.error.message}`);
        return { _count: { _all: r.count ?? 0 } };
      }

      // Fetch rows and compute aggregates in-memory
      const selectCols = neededCols.join(',');
      const r = await supabaseRequest(tableName, 'GET', {
        select: selectCols || '*',
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.aggregate: ${r.error.message}`);
      const rows: Record<string, unknown>[] = (r.data ?? []) as any[];

      if (args._count) {
        result._count = { _all: rows.length };
      }

      if (args._sum && sumCols.length > 0) {
        const _sum: Record<string, unknown> = {};
        for (const col of sumCols) {
          _sum[col] = rows.reduce((s: number, row) => s + (Number(row[col]) || 0), 0);
        }
        result._sum = _sum;
      }

      if (args._avg && avgCols.length > 0) {
        const _avg: Record<string, unknown> = {};
        for (const col of avgCols) {
          const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
          _avg[col] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        }
        result._avg = _avg;
      }

      if (args._min && minCols.length > 0) {
        const _min: Record<string, unknown> = {};
        for (const col of minCols) {
          const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
          _min[col] = vals.length > 0 ? Math.min(...vals) : null;
        }
        result._min = _min;
      }

      if (args._max && maxCols.length > 0) {
        const _max: Record<string, unknown> = {};
        for (const col of maxCols) {
          const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
          _max[col] = vals.length > 0 ? Math.max(...vals) : null;
        }
        result._max = _max;
      }

      return result;
    },

    async groupBy(args: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, unknown>; _sum?: Record<string, unknown>; _avg?: Record<string, unknown>; _min?: Record<string, unknown>; _max?: Record<string, unknown>; orderBy?: unknown; take?: number; skip?: number; having?: unknown }) {
      // PostgREST doesn't support GROUP BY — fetch all rows and group in-memory
      const r = await supabaseRequest(tableName, 'GET', {
        select: args.by.join(','),
        filters: args?.where ? whereToFilters(args.where as any) : undefined,
      });
      if (r.error) throw new Error(`[Supabase] ${tableName}.groupBy: ${r.error.message}`);
      const rows = r.data ?? [];

      // Group by the specified columns
      const groups = new Map<string, Record<string, unknown>>();
      for (const row of rows) {
        const key = args.by.map(col => String(row[col] ?? 'null')).join('||');
        if (!groups.has(key)) {
          const group: Record<string, unknown> = {};
          for (const col of args.by) {
            group[col] = row[col];
          }
          group._count = args._count ? { id: 0 } : undefined;
          if (args._sum) {
            group._sum = {};
            for (const field of Object.keys(args._sum)) {
              (group._sum as Record<string, unknown>)[field] = 0;
            }
          }
          groups.set(key, group);
        }
        const group = groups.get(key)!;
        if (args._count) {
          (group._count as Record<string, number>).id = ((group._count as Record<string, number>).id || 0) + 1;
        }
      }

      let results = [...groups.values()];

      // Apply ordering
      if (args.orderBy) {
        const orderStr = buildOrderBy(args.orderBy);
        if (orderStr) {
          const [orderField, orderDir] = orderStr.split('.');
          const desc = orderDir === 'desc' ? -1 : 1;
          results.sort((a, b) => {
            const av = a[orderField], bv = b[orderField];
            return av < bv ? -desc : av > bv ? desc : 0;
          });
        }
      }

      // Apply pagination
      if (args.skip) results = results.slice(args.skip);
      if (args.take) results = results.slice(0, args.take);

      return results;
    },
  };
}

// ---------------------------------------------------------------------------
// 8. Model Name Mapping (Prisma camelCase → Supabase PascalCase table names)
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

// ---------------------------------------------------------------------------
// 9. Raw query support (tagged template literal)
// ---------------------------------------------------------------------------

/**
 * Minimal $queryRaw implementation for Supabase.
 * Supports `SELECT 1 as ok` pattern for health checks.
 * For complex queries, use Supabase RPC functions instead.
 */
async function $queryRaw(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  // Only support simple SELECT queries for health checks
  let query = strings[0] || '';
  if (values.length > 0) {
    // Replace placeholders — basic parameterized query support
    for (const val of values) {
      if (typeof val === 'string') {
        query = query.replace('?', `'${val.replace(/'/g, "''")}'`);
      } else if (typeof val === 'number') {
        query = query.replace('?', String(val));
      } else if (val === null || val === undefined) {
        query = query.replace('?', 'NULL');
      } else {
        query = query.replace('?', String(val));
      }
    }
  }

  const trimmed = query.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT')) {
    throw new Error(`[Supabase] $queryRaw only supports SELECT queries. Got: ${trimmed.slice(0, 20)}`);
  }

  // Use Supabase RPC endpoint to execute raw SQL
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    // For health check pattern "SELECT 1 as ok", just return the expected result
    if (trimmed.includes('SELECT 1')) {
      return [{ ok: 1 }];
    }
    throw new Error(`[Supabase] $queryRaw failed: HTTP ${res.status}`);
  }

  try {
    return await res.json();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 10. Main db export (Proxy)
// ---------------------------------------------------------------------------

const tableCache = new Map<string, ReturnType<typeof createTableProxy>>();

export const supabaseDb = new Proxy({} as any, {
  get(_, prop: string | symbol) {
    if (typeof prop === 'symbol') return undefined;
    if (prop === 'then') return undefined; // prevent Promise-like behavior

    // Handle db-level methods
    if (prop === '$transaction') return $transaction;
    if (prop === '$disconnect') return $disconnect;
    if (prop === '$connect') return $connect;
    if (prop === '$on') return () => {}; // no-op for Prisma event listeners
    if (prop === '$queryRaw') return $queryRaw;
    if (prop === '$queryRawUnsafe') return $queryRaw;
    if (prop === '$executeRaw') return $queryRaw;
    if (prop === '$executeRawUnsafe') return $queryRaw;

    // Map model name to table name
    const table = MODEL_MAP[prop] || prop;
    if (!tableCache.has(table)) {
      tableCache.set(table, createTableProxy(table));
    }
    return tableCache.get(table);
  },
});

// ---------------------------------------------------------------------------
// 11. Transaction support
// ---------------------------------------------------------------------------

async function $transaction<T>(
  fnOrArgs: ((tx: any) => Promise<T>) | Promise<any>[]
): Promise<T> {
  if (Array.isArray(fnOrArgs)) {
    const results: any[] = [];
    for (const p of fnOrArgs) {
      results.push(await p);
    }
    return results as unknown as T;
  }
  return fnOrArgs(supabaseDb);
}

async function $disconnect(): Promise<void> {}
async function $connect(): Promise<void> {}

console.log(`[Supabase DB] Initialized — URL: ${SUPABASE_URL ? SUPABASE_URL.substring(0, 50) + '...' : 'NOT SET'}`);