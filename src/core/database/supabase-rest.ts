/**
 * SupabaseREST — a drop-in replacement for Prisma's db client
 * that uses the Supabase PostgREST API over HTTPS/IPv4.
 *
 * Supports the most common Prisma patterns:
 *   db.complaint.findFirst({ where, orderBy, select })
 *   db.complaint.findMany({ where, orderBy, skip, take })
 *   db.complaint.count({ where })
 *   db.complaint.create({ data })
 *   db.complaint.update({ where, data })
 *   db.complaint.delete({ where })
 *
 * Uses a JavaScript Proxy so any db.xxx table works automatically.
 */

import { getSupabaseAdmin } from './supabase'

// ─── Where → Supabase filters ───────────────────────────────────

type FilterTuple = [string, string, string] // [column, operator, value]

function buildFilters(
  where: Record<string, unknown> | undefined,
  prefix = ''
): FilterTuple[] {
  if (!where) return []
  const filters: FilterTuple[] = []

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined || val === null) continue
    const col = prefix ? `${prefix}.${key}` : key

    if (typeof val === 'string') {
      filters.push([col, 'eq', val])
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      filters.push([col, 'eq', String(val)])
    } else if (val instanceof Date) {
      filters.push([col, 'eq', val.toISOString()])
    } else if (Array.isArray(val)) {
      if (val.length > 0) filters.push([col, 'in', val.map(String).join(',')])
    } else if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, unknown>
      if ('contains' in obj && typeof obj.contains === 'string') {
        filters.push([col, 'ilike', `%${obj.contains}%`])
      } else if ('startsWith' in obj && typeof obj.startsWith === 'string') {
        filters.push([col, 'ilike', `${obj.startsWith}%`])
      } else if ('endsWith' in obj && typeof obj.endsWith === 'string') {
        filters.push([col, 'ilike', `%${obj.endsWith}`])
      } else if ('in' in obj && Array.isArray(obj.in)) {
        if (obj.in.length > 0) filters.push([col, 'in', obj.in.map(String).join(',')])
      } else if ('not' in obj) {
        if (obj.not === null) {
          filters.push([col, 'not.is', 'null'])
        } else {
          filters.push([col, 'neq', String(obj.not)])
        }
      } else if ('gt' in obj) {
        filters.push([col, 'gt', String(obj.gt)])
      } else if ('gte' in obj) {
        filters.push([col, 'gte', String(obj.gte)])
      } else if ('lt' in obj) {
        filters.push([col, 'lt', String(obj.lt)])
      } else if ('lte' in obj) {
        filters.push([col, 'lte', String(obj.lte)])
      } else if ('AND' in obj) {
        // Flatten AND — just add all nested filters
        for (const sub of obj.AND as Record<string, unknown>[]) {
          filters.push(...buildFilters(sub, prefix))
        }
      } else if ('OR' in obj) {
        // OR needs special PostgREST syntax: or(col1.eq.val1,col2.eq.val2)
        const orParts: string[] = []
        for (const sub of obj.OR as Record<string, unknown>[]) {
          for (const [fCol, fOp, fVal] of buildFilters(sub, prefix)) {
            orParts.push(`${fCol}.${fOp}.${fVal}`)
          }
        }
        if (orParts.length > 0) {
          filters.push(['__or__', 'or', orParts.join(',')])
        }
      } else if ('NOT' in obj) {
        const notFilters = buildFilters(obj.NOT as Record<string, unknown>, prefix)
        for (const [fCol, fOp, fVal] of notFilters) {
          filters.push([fCol, `not.${fOp}`, fVal])
        }
      }
      // Ignores unknown nested keys
    }
  }
  return filters
}

function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: FilterTuple[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  for (const [col, op, val] of filters) {
    if (col === '__or__') {
      query = query.or(val)
    } else {
      query = query.filter(`${col}.${op}.${val}`)
    }
  }
  return query
}

// ─── OrderBy ────────────────────────────────────────────────────

function buildOrderBy(orderBy: unknown): string {
  if (!orderBy) return ''
  if (Array.isArray(orderBy)) {
    return orderBy
      .map((o: Record<string, unknown>) => {
        const k = Object.keys(o)[0]
        const v = o[k]
        return `${k}.${v === 'desc' ? 'desc' : 'asc'}`
      })
      .join(',')
  }
  if (typeof orderBy === 'object' && orderBy !== null) {
    const k = Object.keys(orderBy)[0]
    const v = (orderBy as Record<string, unknown>)[k]
    return `${k}.${v === 'desc' ? 'desc' : 'asc'}`
  }
  return ''
}

// ─── Data serialization ─────────────────────────────────────────

function serialize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (v instanceof Date) out[k] = v.toISOString()
    else if (Array.isArray(v) && v.length > 0 && v[0] instanceof Date) {
      out[k] = (v as Date[]).map(d => d.toISOString())
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── Query builder (returned by db.tableName) ───────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaOptions = Record<string, any>

class TableProxy {
  constructor(private table: string) {}

  async findFirst(opts: PrismaOptions = {}) {
    const sb = getSupabaseAdmin()
    const selectStr = buildSelect(opts.select, opts.include)
    let q = sb.from(this.table).select(selectStr)
    q = applyFilters(q, buildFilters(opts.where))
    if (opts.orderBy) q = q.order(buildOrderBy(opts.orderBy))
    const { data, error } = await q.limit(1)
    if (error) throw dbError(this.table, 'findFirst', error)
    return data?.[0] ?? null
  }

  async findMany(opts: PrismaOptions = {}) {
    const sb = getSupabaseAdmin()
    const selectStr = buildSelect(opts.select, opts.include)
    let q = sb.from(this.table).select(selectStr)
    q = applyFilters(q, buildFilters(opts.where))
    if (opts.orderBy) q = q.order(buildOrderBy(opts.orderBy))
    if (opts.skip != null && opts.take != null) {
      q = q.range(opts.skip, opts.skip + opts.take - 1)
    } else if (opts.take != null) {
      q = q.limit(opts.take)
    }
    const { data, error } = await q
    if (error) throw dbError(this.table, 'findMany', error)
    return data ?? []
  }

  async findUnique(opts: PrismaOptions) {
    return this.findFirst({ ...opts })
  }

  async findFirstOrThrow(opts: PrismaOptions) {
    const row = await this.findFirst(opts)
    if (!row) throw new Error(`[${this.table}] Record not found`)
    return row
  }

  async count(opts: PrismaOptions = {}) {
    const sb = getSupabaseAdmin()
    let q = sb.from(this.table).select('*', { count: 'exact', head: true })
    q = applyFilters(q, buildFilters(opts.where))
    const { count, error } = await q
    if (error) throw dbError(this.table, 'count', error)
    return count ?? 0
  }

  async create(opts: PrismaOptions) {
    const sb = getSupabaseAdmin()
    const selectStr = buildSelect(opts.select, opts.include)
    const { data, error } = await sb
      .from(this.table)
      .insert(serialize(opts.data))
      .select(selectStr || '*')
      .single()
    if (error) throw dbError(this.table, 'create', error)
    return data
  }

  async update(opts: PrismaOptions) {
    const sb = getSupabaseAdmin()
    const selectStr = buildSelect(opts.select, opts.include)
    let q = sb.from(this.table).update(serialize(opts.data)).select(selectStr || '*').single()
    q = applyFilters(q, buildFilters(opts.where))
    const { data, error } = await q
    if (error) throw dbError(this.table, 'update', error)
    return data
  }

  async delete(opts: PrismaOptions) {
    const sb = getSupabaseAdmin()
    let q = sb.from(this.table).delete().select('*').single()
    q = applyFilters(q, buildFilters(opts.where))
    const { data, error } = await q
    if (error) throw dbError(this.table, 'delete', error)
    return data
  }

  async upsert(opts: PrismaOptions) {
    const sb = getSupabaseAdmin()
    const conflictCols = Object.keys(opts.where || {})
    const { data, error } = await sb
      .from(this.table)
      .upsert(serialize(opts.create), {
        onConflict: conflictCols.join(','),
        ignoreDuplicates: false,
      })
      .select()
      .single()
    if (error) throw dbError(this.table, 'upsert', error)
    return data
  }

  async deleteMany(opts: PrismaOptions = {}) {
    const sb = getSupabaseAdmin()
    let q = sb.from(this.table).delete()
    q = applyFilters(q, buildFilters(opts.where))
    const { data, error } = await q
    if (error) throw dbError(this.table, 'deleteMany', error)
    return { count: Array.isArray(data) ? data.length : 0 }
  }

  async updateMany(opts: PrismaOptions) {
    const sb = getSupabaseAdmin()
    let q = sb.from(this.table).update(serialize(opts.data))
    q = applyFilters(q, buildFilters(opts.where))
    const { data, error } = await q
    if (error) throw dbError(this.table, 'updateMany', error)
    return { count: Array.isArray(data) ? data.length : 0 }
  }

  async createMany(opts: PrismaOptions) {
    const sb = getSupabaseAdmin()
    const rows = Array.isArray(opts.data) ? opts.data : [opts.data]
    const { data, error } = await sb
      .from(this.table)
      .insert(rows.map(serialize))
      .select()
    if (error) throw dbError(this.table, 'createMany', error)
    return { count: Array.isArray(data) ? data.length : 0 }
  }

  async groupBy(_opts: PrismaOptions) {
    // PostgREST doesn't natively support GROUP BY.
    // Fall back to fetch-all + in-memory grouping for small datasets.
    throw new Error(`[SupabaseDB] groupBy not supported. Use raw query via Supabase RPC.`)
  }

  async aggregate(_opts: PrismaOptions) {
    throw new Error(`[SupabaseDB] aggregate not supported.`)
  }
}

// ─── Select builder (handles Prisma include/select) ──────────────

function buildSelect(
  select: Record<string, unknown> | undefined,
  include: Record<string, unknown> | undefined
): string {
  // If no select or include, fetch all columns
  if (!select && !include) return '*'

  // If explicit select fields, use them
  if (select && Object.keys(select).length > 0) {
    return Object.keys(select).join(',')
  }

  // If include (relations), build PostgREST embedded select
  if (include && Object.keys(include).length > 0) {
    const parts: string[] = ['*']
    for (const [rel, val] of Object.entries(include)) {
      if (val === true) {
        parts.push(`${rel}(*)`)
      } else if (typeof val === 'object') {
        const nestedSelect = buildSelect(
          (val as Record<string, unknown>).select as Record<string, unknown> | undefined,
          (val as Record<string, unknown>).include as Record<string, unknown> | undefined
        )
        parts.push(`${rel}(${nestedSelect})`)
      }
    }
    return parts.join(',')
  }

  return '*'
}

// ─── Error helper ───────────────────────────────────────────────

function dbError(
  table: string,
  operation: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any
): Error {
  const msg = error?.message || String(error)
  const code = error?.code || 'UNKNOWN'

  // Map common PostgREST errors to Prisma-like codes for compatibility
  const prismaCode = mapErrorCode(code, msg)

  const err = new Error(msg)
  ;(err as Record<string, unknown>).code = prismaCode
  ;(err as Record<string, unknown>).table = table
  ;(err as Record<string, unknown>).operation = operation
  return err
}

function mapErrorCode(code: string, msg: string): string {
  if (code === '23505' || msg.includes('unique') || msg.includes('duplicate'))
    return 'P2002' // Unique constraint
  if (code === '23503' || msg.includes('foreign key'))
    return 'P2003' // Foreign key
  if (code === '23502' || msg.includes('not-null'))
    return 'P2011' // Not null
  if (code === '42P01' || msg.includes('does not exist'))
    return 'P2021' // Table not found
  if (msg.includes('relation') && msg.includes('does not exist'))
    return 'P2021'
  return code
}

// ─── Main db export (Proxy) ──────────────────────────────────────

/**
 * Drop-in replacement for Prisma's `db` client.
 *
 * Usage:
 *   import { db } from '@/core/database/db'
 *   const complaints = await db.complaint.findMany({ where: { status: 'NEW' } })
 */
const tableCache = new Map<string, TableProxy>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = new Proxy({} as any, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(_target, prop: string | symbol, _receiver: any) {
    if (typeof prop === 'string' && prop !== 'then' && prop !== 'toJSON' && prop !== 'Symbol(Symbol.toPrimitive)') {
      if (!tableCache.has(prop)) {
        tableCache.set(prop, new TableProxy(prop))
      }
      return tableCache.get(prop)
    }
    return undefined
  },
})

/**
 * Transaction support — runs sequentially (PostgREST has no multi-statement tx).
 */
export async function $transaction<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}

/**
 * Disconnect — no-op for Supabase REST.
 */
export async function $disconnect(): Promise<void> {}