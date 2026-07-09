// Supabase Proxy Service — translates Prisma-style queries to Supabase PostgREST API calls
// Runs on port 3001, uses ONLY Node.js built-in http module

import http from 'node:http';

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = 3001;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REST_BASE = '/rest/v1/';

// ─── Model name → Supabase table name mapping ────────────────────────────────
const MODEL_MAP: Record<string, string> = {
  user: 'User',
  tenant: 'Tenant',
  department: 'Department',
  customer: 'Customer',
  equipment: 'Equipment',
  complaint: 'Complaint',
  workOrder: 'WorkOrder',
  invoice: 'Invoice',
  quotation: 'Quotation',
  pmSchedule: 'PmSchedule',
  inventoryItem: 'InventoryItem',
  inventoryCategory: 'InventoryCategory',
  warehouse: 'Warehouse',
  notification: 'Notification',
  auditLog: 'AuditLog',
  checklistTemplate: 'ChecklistTemplate',
  departmentId: 'Department',
  assignedToId: 'User',
  supervisorId: 'User',
  complaintId: 'Complaint',
  customerId: 'Customer',
  equipmentId: 'Equipment',
  createdBy: 'User',
};

// ─── Known FK relationships: FK column → { table, pk } ──────────────────────
const FK_MAP: Record<string, { table: string; pk: string }> = {
  tenantId: { table: 'Tenant', pk: 'id' },
  departmentId: { table: 'Department', pk: 'id' },
  customerId: { table: 'Customer', pk: 'id' },
  assignedToId: { table: 'User', pk: 'id' },
  supervisorId: { table: 'User', pk: 'id' },
  createdBy: { table: 'User', pk: 'id' },
  complaintId: { table: 'Complaint', pk: 'id' },
  workOrderId: { table: 'WorkOrder', pk: 'id' },
  equipmentId: { table: 'Equipment', pk: 'id' },
  invoiceId: { table: 'Invoice', pk: 'id' },
  quotationId: { table: 'Quotation', pk: 'id' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function resolveTable(model: string): string {
  return MODEL_MAP[model] || capitalize(model);
}

// ─── Where clause → PostgREST filter strings ──────────────────────────────────

function whereToFilters(where: Record<string, any>): string[] {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(where)) {
    if (val === null || val === undefined) continue;
    parts.push(...parseField(key, val));
  }
  return parts;
}

function parseField(key: string, val: any): string[] {
  const parts: string[] = [];

  // Nested where (AND within same field) — e.g. { age: { gte: 18, lte: 65 } }
  if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {

    // ── not ───────────────────────────────────────────────────────────────
    if ('not' in val) {
      const nv = val.not;
      if (nv === null) {
        parts.push(`${key}=not.is.null`);
      } else if (typeof nv === 'object' && !Array.isArray(nv) && !(nv instanceof Date)) {
        // { not: { in: [...] } }, { not: { contains: 'x' } }, etc.
        const inner = parseField(key, nv);
        for (const p of inner) {
          if (p.includes('=eq.')) parts.push(p.replace('=eq.', '=neq.'));
          else if (p.includes('=ilike.')) parts.push(p.replace('=ilike.', '=not.ilike.'));
          else if (p.includes('=in.')) parts.push(p.replace('=in.', '=not.in.'));
          else if (p.includes('=is.')) parts.push(p.replace('=is.', '=not.is.'));
          else parts.push('not.' + p);
        }
      } else {
        parts.push(`${key}=neq.${nv}`);
      }
      return parts;
    }

    // ── in / notIn ────────────────────────────────────────────────────────
    if ('in' in val) {
      const list = Array.isArray(val.in) ? val.in : [val.in];
      parts.push(`${key}=in.(${list.join(',')})`);
      return parts;
    }
    if ('notIn' in val) {
      const list = Array.isArray(val.notIn) ? val.notIn : [val.notIn];
      parts.push(`${key}=not.in.(${list.join(',')})`);
      return parts;
    }

    // ── string operators ──────────────────────────────────────────────────
    if ('contains' in val) {
      const v = val.contains;
      if (typeof v === 'string') parts.push(`${key}=ilike.%${v}%`);
      else parts.push(`${key}=cs.${JSON.stringify(v)}`);
      return parts;
    }
    if ('startsWith' in val) {
      parts.push(`${key}=ilike.${val.startsWith}%`);
      return parts;
    }
    if ('endsWith' in val) {
      parts.push(`${key}=ilike.%${val.endsWith}`);
      return parts;
    }

    // ── equals / eq ───────────────────────────────────────────────────────
    if ('equals' in val || 'eq' in val) {
      const v = val.equals ?? val.eq;
      if (v === null) parts.push(`${key}=is.null`);
      else if (typeof v === 'boolean') parts.push(`${key}=is.${v}`);
      else parts.push(`${key}=eq.${v}`);
      return parts;
    }

    // ── comparison operators (can be combined: gte + lte) ───────────────
    const cmpOps: [string, string][] = [
      ['gt', 'gt'], ['gte', 'gte'], ['lt', 'lt'], ['lte', 'lte'],
    ];
    for (const [prismaOp, pgOp] of cmpOps) {
      if (prismaOp in val) {
        parts.push(`${key}=${pgOp}.${val[prismaOp]}`);
      }
    }
    if (parts.length) return parts;

    return parts;
  }

  // ── Boolean ─────────────────────────────────────────────────────────────
  if (typeof val === 'boolean') {
    parts.push(`${key}=is.${val}`);
    return parts;
  }

  // ── null / plain value ──────────────────────────────────────────────────
  if (val === null) {
    parts.push(`${key}=is.null`);
  } else {
    const strVal = val instanceof Date ? val.toISOString() : String(val);
    parts.push(`${key}=eq.${strVal}`);
  }

  return parts;
}

// ─── Select builder ───────────────────────────────────────────────────────────

function selectToString(select: Record<string, any>): { selectStr: string; nested: Record<string, any> } {
  const cols: string[] = [];
  const nested: Record<string, any> = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true) {
      cols.push(key);
    } else if (typeof val === 'object' && val !== null) {
      nested[key] = val;
    }
  }
  return { selectStr: cols.join(','), nested };
}

// ─── OrderBy builder ─────────────────────────────────────────────────────────

function orderByToQuery(orderBy: any): string {
  if (!orderBy) return '';
  const fmt = (o: any) => {
    const col = typeof o === 'string' ? o : (o.field || Object.keys(o)[0]);
    const dir = typeof o === 'object' && o.desc ? 'desc' : 'asc';
    return `${col}.${dir}`;
  };
  return Array.isArray(orderBy) ? orderBy.map(fmt).join(',') : fmt(orderBy);
}

// ─── Low-level Supabase REST request ─────────────────────────────────────────

function supabaseRequest(
  method: string,
  path: string,
  params?: [string, string][],
  body?: any
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    if (params) {
      for (const [k, v] of params) {
        if (v !== undefined && v !== '') url.searchParams.append(k, v);
      }
    }

    const isHead = method === 'HEAD';
    const headers: Record<string, string> = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': isHead ? 'count=exact' : 'return=representation',
    };

    const req = http.request(
      { hostname: url.hostname, port: 443, path: url.pathname + url.search, method: isHead ? 'GET' : method, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          const hdrs: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            hdrs[k] = Array.isArray(v) ? v.join(', ') : (v || '');
          }
          let data: any = null;
          if (raw) { try { data = JSON.parse(raw); } catch { data = raw; } }
          if (isHead) {
            const m = (hdrs['content-range'] || '').match(/\/(\d+)/);
            data = m ? parseInt(m[1]) : 0;
          }
          resolve({ status: res.statusCode || 200, data, headers: hdrs });
        });
      }
    );
    req.on('error', reject);
    if (body && !isHead) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Build full query params for a read request ──────────────────────────────

function buildReadParams(opts: {
  where?: Record<string, any>;
  select?: string;
  orderBy?: any;
  take?: number;
  skip?: number;
}): [string, string][] {
  const params: [string, string][] = [];
  const filters = whereToFilters(opts.where || {});
  for (const f of filters) {
    const eqIdx = f.indexOf('=');
    params.push([f.slice(0, eqIdx), f.slice(eqIdx + 1)]);
  }
  if (opts.select) params.push(['select', opts.select]);
  if (opts.orderBy) params.push(['order', opts.orderBy]);
  if (opts.take !== undefined) params.push(['limit', String(opts.take)]);
  if (opts.skip !== undefined) params.push(['offset', String(opts.skip)]);
  return params;
}

// ─── Fetch related resources for nested select/include ───────────────────────

async function resolveNested(
  rows: any[],
  nested: Record<string, any>
): Promise<any[]> {
  if (!rows.length || !Object.keys(nested).length) return rows;

  for (const [relName, relSpec] of Object.entries(nested)) {
    // Determine FK column
    let fkCol = relName + 'Id';
    if (!FK_MAP[fkCol]) {
      // Try to infer from actual row columns
      for (const col of Object.keys(rows[0] || {})) {
        if (FK_MAP[col] && FK_MAP[col].table === resolveTable(relName)) {
          fkCol = col;
          break;
        }
      }
    }
    if (!FK_MAP[fkCol]) continue;

    const fk = FK_MAP[fkCol];
    const nestedSelect = relSpec.select || relSpec;
    const { selectStr } = selectToString(nestedSelect);

    // Collect unique FK values
    const fkValues = [...new Set(rows.map((r: any) => r[fkCol]).filter((v: any) => v != null))];
    if (!fkValues.length) {
      for (const row of rows) row[relName] = null;
      continue;
    }

    // Batch fetch
    const params: [string, string][] = [];
    if (selectStr) params.push(['select', selectStr]);
    params.push([fk.pk, fkValues.length === 1 ? `eq.${fkValues[0]}` : `in.(${fkValues.join(',')})`]);

    const res = await supabaseRequest('GET', REST_BASE + fk.table, params);

    if (res.status >= 200 && res.status < 300 && Array.isArray(res.data)) {
      const relMap = new Map(res.data.map((d: any) => [d[fk.pk], d]));
      for (const row of rows) {
        row[relName] = row[fkCol] != null ? (relMap.get(row[fkCol]) || null) : null;
      }
    }
  }
  return rows;
}

// ─── Main query handler ──────────────────────────────────────────────────────

async function handleQuery(body: any): Promise<any> {
  const { table, method, args = {} } = body;
  const tableName = resolveTable(table);
  const { where = {}, select, include, orderBy, take, skip, data, _count, by } = args;
  const start = performance.now();
  const logTag = `[Supabase] ${table}.${method}`;

  try {
    // Merge include into nested map
    const nested: Record<string, any> = {};
    if (include) {
      for (const [key, val] of Object.entries(include)) {
        if (val === true) nested[key] = { select: { id: true } };
        else if (typeof val === 'object') nested[key] = val;
      }
    }

    // Parse select — extract top-level columns and nested
    let selectStr = '';
    if (select) {
      const parsed = selectToString(select);
      selectStr = parsed.selectStr;
      Object.assign(nested, parsed.nested);
    }

    let result: any;

    switch (method) {

      // ─── findFirst ──────────────────────────────────────────────────────
      case 'findFirst': {
        const params = buildReadParams({
          where, select: selectStr || undefined,
          orderBy: orderBy || undefined,
          take: take ?? 1, skip,
        });
        const res = await supabaseRequest('GET', REST_BASE + tableName, params);
        let rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        if (rows.length) rows = await resolveNested(rows, nested);
        result = rows[0] || null;
        break;
      }

      // ─── findMany ───────────────────────────────────────────────────────
      case 'findMany': {
        const params = buildReadParams({
          where, select: selectStr || undefined,
          orderBy: orderBy || undefined, take, skip,
        });
        const res = await supabaseRequest('GET', REST_BASE + tableName, params);
        let rows = Array.isArray(res.data) ? res.data : [];
        if (rows.length) rows = await resolveNested(rows, nested);
        result = rows;
        break;
      }

      // ─── findUnique ─────────────────────────────────────────────────────
      case 'findUnique': {
        const params = buildReadParams({
          where, select: selectStr || undefined, take: 1,
        });
        const res = await supabaseRequest('GET', REST_BASE + tableName, params);
        let rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        if (rows.length) rows = await resolveNested(rows, nested);
        result = rows[0] || null;
        break;
      }

      // ─── create ─────────────────────────────────────────────────────────
      case 'create': {
        const params: [string, string][] = [];
        if (selectStr) params.push(['select', selectStr]);
        const res = await supabaseRequest('POST', REST_BASE + tableName, params, data);
        if (res.status < 200 || res.status >= 300) {
          return { error: { message: res.data?.message || 'Create failed', code: res.status } };
        }
        let rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        if (rows.length) rows = await resolveNested(rows, nested);
        // Return a mutable copy (PostgREST returns frozen objects)
        if (rows.length > 0) {
          const copy = { ...rows[0] };
          result = copy;
        } else {
          result = res.data || null;
        }
        break;
      }

      // ─── update ─────────────────────────────────────────────────────────
      case 'update': {
        const params = buildReadParams({ where });
        if (selectStr) params.push(['select', selectStr]);
        const res = await supabaseRequest('PATCH', REST_BASE + tableName, params, data);
        if (res.status < 200 || res.status >= 300) {
          return { error: { message: res.data?.message || 'Update failed', code: res.status } };
        }
        let rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        if (rows.length) rows = await resolveNested(rows, nested);
        // Return a mutable copy (PostgREST returns frozen objects)
        if (rows.length > 0) {
          const copy = { ...rows[0] };
          result = copy;
        } else {
          result = res.data || null;
        }
        break;
      }

      // ─── updateMany ─────────────────────────────────────────────────────
      case 'updateMany': {
        const params = buildReadParams({ where });
        const res = await supabaseRequest('PATCH', REST_BASE + tableName, params, data);
        if (res.status < 200 || res.status >= 300) {
          return { error: { message: res.data?.message || 'UpdateMany failed', code: res.status } };
        }
        result = { count: Array.isArray(res.data) ? res.data.length : 0 };
        break;
      }

      // ─── delete ─────────────────────────────────────────────────────────
      case 'delete': {
        const params = buildReadParams({ where });
        if (selectStr) params.push(['select', selectStr]);
        const res = await supabaseRequest('DELETE', REST_BASE + tableName, params);
        if (res.status < 200 || res.status >= 300) {
          return { error: { message: res.data?.message || 'Delete failed', code: res.status } };
        }
        let rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        if (rows.length) rows = await resolveNested(rows, nested);
        result = rows[0] || res.data || null;
        break;
      }

      // ─── deleteMany ─────────────────────────────────────────────────────
      case 'deleteMany': {
        const params = buildReadParams({ where });
        const res = await supabaseRequest('DELETE', REST_BASE + tableName, params);
        if (res.status < 200 || res.status >= 300) {
          return { error: { message: res.data?.message || 'DeleteMany failed', code: res.status } };
        }
        result = { count: Array.isArray(res.data) ? res.data.length : 0 };
        break;
      }

      // ─── count ──────────────────────────────────────────────────────────
      case 'count': {
        const params = buildReadParams({ where });
        params.push(['select', '*']);
        const res = await supabaseRequest('HEAD', REST_BASE + tableName, params);
        if (res.status < 200 || res.status >= 300) {
          const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'Count failed');
          return { error: { message: msg, code: res.status } };
        }
        result = res.data;
        break;
      }

      // ─── aggregate ──────────────────────────────────────────────────────
      case 'aggregate': {
        const aggResult: Record<string, any> = {};
        if (_count) {
          const params = buildReadParams({ where });
          params.push(['select', '*']);
          const res = await supabaseRequest('HEAD', REST_BASE + tableName, params);
          const total = typeof res.data === 'number' ? res.data : 0;

          if (_count === true || (typeof _count === 'object' && _count._all)) {
            aggResult._count = { _all: total };
          } else if (typeof _count === 'object') {
            aggResult._count = {};
            for (const field of Object.keys(_count)) {
              if (_count[field] === true) {
                const fp = buildReadParams({ where });
                fp.push(['select', field]);
                fp.push([field, 'not.is.null']);
                const fr = await supabaseRequest('HEAD', REST_BASE + tableName, fp);
                aggResult._count[field] = typeof fr.data === 'number' ? fr.data : 0;
              }
            }
          }
        }
        result = aggResult;
        break;
      }

      // ─── groupBy ────────────────────────────────────────────────────────
      case 'groupBy': {
        const groupCols = Array.isArray(by) ? by : [by];
        const params = buildReadParams({ where, select: groupCols.join(',') });
        const res = await supabaseRequest('GET', REST_BASE + tableName, params);
        let rows: any[] = Array.isArray(res.data) ? res.data : [];

        if (_count && rows.length > 0) {
          // Client-side count per group
          const allParams = buildReadParams({ where, select: groupCols.join(',') });
          const allRes = await supabaseRequest('GET', REST_BASE + tableName, allParams);
          const allRows: any[] = Array.isArray(allRes.data) ? allRes.data : [];
          const countMap = new Map<string, number>();
          for (const row of allRows) {
            const key = groupCols.map(c => String(row[c])).join('|');
            countMap.set(key, (countMap.get(key) || 0) + 1);
          }
          for (const row of rows) {
            const key = groupCols.map(c => String(row[c])).join('|');
            row._count = countMap.get(key) || 0;
          }
        }

        result = rows;
        break;
      }

      default:
        return { error: { message: `Unknown method: ${method}`, code: 400 } };
    }

    const elapsed = Math.round(performance.now() - start);
    const wherePreview = JSON.stringify(where).slice(0, 80);
    console.log(`${logTag} where=${wherePreview} → 200 ${elapsed}ms`);
    return result;
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - start);
    console.log(`${logTag} → 500 ${elapsed}ms ${err.message}`);
    return { error: { message: err.message || 'Internal error', code: 500 } };
  }
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'supabase-proxy', port: PORT }));
    return;
  }

  // Main query endpoint
  if (req.method === 'POST' && req.url === '/query') {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const result = await handleQuery(body);
        const isError = result && typeof result === 'object' && 'error' in result;
        res.writeHead(isError ? (result.error.code || 500) : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message || 'Bad request', code: 400 } }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'Not found', code: 404 } }));
});

server.listen(PORT, () => {
  console.log(`[Supabase Proxy] Running on port ${PORT}`);
  console.log(`[Supabase Proxy] Connected to ${SUPABASE_URL}`);
});