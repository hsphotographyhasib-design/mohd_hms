import { db } from '@/core/database/db';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Auto-sync missing columns from the Prisma schema into the actual database.
 *
 * For SQLite: uses sqlite_master and pragma_table_info to introspect the
 * current schema and add any missing columns via ALTER TABLE.
 *
 * For Supabase: makes ONE lightweight PostgREST request per table
 * (select=col1,col2,...&limit=0) to verify all expected columns exist.
 * If a column is missing, logs the exact ALTER TABLE SQL to run manually.
 * No automatic column creation on Supabase (schema managed via migrations).
 */

// Map Prisma scalar types → SQLite column types
const PRISMA_TO_SQLITE: Record<string, string> = {
  String: 'TEXT',
  Int: 'INTEGER',
  Float: 'REAL',
  Boolean: 'INTEGER',
  DateTime: 'TEXT', // SQLite stores datetimes as TEXT
  BigInt: 'INTEGER',
  Json: 'TEXT',      // SQLite stores JSON as TEXT
  Bytes: 'BLOB',
  Decimal: 'REAL',
};

// Map Prisma scalar types → PostgreSQL column types (for Supabase)
const PRISMA_TO_PG: Record<string, string> = {
  String: 'TEXT',
  Int: 'INTEGER',
  Float: 'DOUBLE PRECISION',
  Boolean: 'BOOLEAN',
  DateTime: 'TIMESTAMP WITH TIME ZONE',
  BigInt: 'BIGINT',
  Json: 'JSONB',
  Bytes: 'BYTEA',
  Decimal: 'DECIMAL',
};

// Cache: table → set of column names (lowercase) already verified
const _synced = new Map<string, Set<string>>();
let _globalSynced = false;

// ---------- schema parsing ----------

interface ColumnDef {
  name: string;
  sqliteType: string;
  pgType: string;
  nullable: boolean;
  hasDefault: boolean;
}

/** Parse prisma/schema.prisma and return model→columns map */
function parseSchemaModels(): Map<string, ColumnDef[]> {
  const models = new Map<string, ColumnDef[]>();
  let current = '';

  try {
    const content = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf-8');
    const scalars = new Set(Object.keys(PRISMA_TO_SQLITE));

    for (const line of content.split('\n')) {
      const t = line.trim();
      const mMatch = t.match(/^model\s+(\w+)\s*\{/);
      if (mMatch) { current = mMatch[1]; models.set(current, []); continue; }
      if (t === '}' && current) { current = ''; continue; }
      if (!current || t.startsWith('@@') || t.startsWith('//')) continue;

      const fMatch = t.match(/^(\w+)\s+(\w+)(\[\])?/);
      if (!fMatch) continue;

      const [, name, type, isList] = fMatch;
      if (!scalars.has(type) || isList) continue;

      models.get(current)!.push({
        name,
        sqliteType: PRISMA_TO_SQLITE[type] || 'TEXT',
        pgType: PRISMA_TO_PG[type] || 'TEXT',
        nullable: t.includes('?'),
        hasDefault: t.includes('@default('),
      });
    }
  } catch {
    // Schema not readable — silently skip
  }

  return models;
}

// ---------- DB introspection (SQLite) ----------

async function getExistingTablesSQLite(): Promise<Map<string, string>> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `;
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.name.toLowerCase(), r.name);
  return map;
}

async function getExistingColumnsSQLite(table: string): Promise<Set<string>> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    PRAGMA table_info("${table}")
  `;
  return new Set(rows.map((r) => r.name.toLowerCase()));
}

// ---------- sync logic ----------

function isSupabase(): boolean {
  return !!(process.env.USE_SUPABASE === 'true' ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV === 'production'));
}

const SAFE_DEFAULTS: Record<string, string> = {
  TEXT: "DEFAULT ''",
  INTEGER: 'DEFAULT 0',
  REAL: 'DEFAULT 0',
  BLOB: "DEFAULT ''",
};

async function syncTableColumnsSQLite(
  actualTable: string,
  expectedColumns: ColumnDef[]
): Promise<{ added: number; errors: string[]; existing: Set<string> }> {
  let existing: Set<string>;
  try {
    existing = await getExistingColumnsSQLite(actualTable);
  } catch {
    return { added: 0, errors: ['Cannot read columns'], existing: new Set() };
  }

  let added = 0;
  const errors: string[] = [];

  for (const col of expectedColumns) {
    if (existing.has(col.name.toLowerCase())) continue;

    // Try NOT NULL with safe default first
    if (!col.nullable) {
      const def = SAFE_DEFAULTS[col.sqliteType] || '';
      try {
        const sql = `ALTER TABLE "${actualTable}" ADD COLUMN "${col.name}" ${col.sqliteType} NOT NULL ${def}`;
        await db.$executeRawUnsafe(sql);
        added++;
        continue;
      } catch {
        // Fall through to nullable attempt
      }
    }

    // Fallback: nullable column
    try {
      const sql = `ALTER TABLE "${actualTable}" ADD COLUMN "${col.name}" ${col.sqliteType}`;
      await db.$executeRawUnsafe(sql);
      added++;
    } catch (e) {
      errors.push(`${col.name}: ${(e as Error).message.slice(0, 80)}`);
    }
  }

  return { added, errors, existing };
}

// ---------- public API ----------

/**
 * Lightweight Supabase column verification.
 * Makes ONE request per table to check if all expected columns exist.
 * Uses PostgREST `select=col1,col2,...&limit=0` — PostgREST validates column
 * names even with limit=0 and returns 400 if any are missing.
 */
async function verifySupabaseColumns(table: string, expectedColumns: ColumnDef[]): Promise<Set<string>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return new Set(expectedColumns.map(c => c.name.toLowerCase()));

  const colNames = expectedColumns.map(c => c.name);
  if (colNames.length === 0) return new Set();

  try {
    const selectStr = colNames.join(',');
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${selectStr}&limit=0`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'count=exact',
      },
    });

    if (res.ok) {
      // All columns exist — cache them
      return new Set(colNames.map(c => c.toLowerCase()));
    }

    if (res.status === 400) {
      // Parse the error to find which column is missing
      const errorBody = await res.json().catch(() => ({}));
      const msg = (errorBody as any).message || (errorBody as any).error || String(errorBody);

      // PostgREST error: "Could not find the 'total' column in the 'Invoice' table in the schema."
      const missingMatch = msg.match(/'([\w]+)'\s*(?:column|field)/i);
      if (missingMatch) {
        const missingName = missingMatch[1];
        const colDef = expectedColumns.find(c => c.name.toLowerCase() === missingName.toLowerCase());
        const pgType = colDef?.pgType || 'TEXT';
        const nullable = colDef?.nullable ?? true;
        const defaultVal = nullable ? '' : " NOT NULL DEFAULT ''";
        const sql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${missingName}" ${pgType}${defaultVal};`;
        console.warn(`[db-sync] Supabase missing column: ${table}.${missingName}`);
        console.warn(`[db-sync]   Run: ${sql}`);
      } else {
        console.warn(`[db-sync] Supabase ${table} column check failed (400): ${msg.slice(0, 200)}`);
      }
    }
  } catch (err) {
    // Network error — don't block startup, assume columns exist
    console.warn(`[db-sync] Could not verify Supabase columns for ${table}:`, (err as Error).message);
  }

  // Optimistically assume all columns exist
  return new Set(colNames.map(c => c.toLowerCase()));
}

/**
 * Ensure a specific table exists and its columns match the Prisma schema.
 * Safe to call repeatedly — skips already-synced columns.
 *
 * @param tableName The Prisma model name (e.g. "Complaint")
 */
export async function ensureTableSync(tableName: string): Promise<void> {
  // Check local cache
  const cached = _synced.get(tableName.toLowerCase());
  if (cached) return; // Already synced at least once

  // On Supabase (production), verify columns with a lightweight single-request check.
  if (isSupabase()) {
    const schemaModels = parseSchemaModels();
    const columns = schemaModels.get(tableName);
    if (columns) {
      const existing = await verifySupabaseColumns(tableName, columns);
      _synced.set(tableName.toLowerCase(), existing);
    }
    return;
  }

  const schemaModels = parseSchemaModels();
  const columns = schemaModels.get(tableName);
  if (!columns || columns.length === 0) return;

  const tables = await getExistingTablesSQLite();
  const actualTable = tables.get(tableName.toLowerCase());
  if (!actualTable) return; // Table doesn't exist — Prisma will handle creation
  const result = await syncTableColumnsSQLite(actualTable, columns);

  // Cache the ACTUALLY EXISTING columns (not the expected ones)
  _synced.set(tableName.toLowerCase(), result.existing);

  if (result.added > 0 || result.errors.length > 0) {
    console.log(
      `[db-sync] ${tableName}: added ${result.added} columns${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
    );
  }
}

/**
 * Check if a specific column exists in a table. Uses cached sync data when available.
 */
export function hasColumn(tableName: string, columnName: string): boolean {
  const cached = _synced.get(tableName.toLowerCase());
  if (cached) return cached.has(columnName.toLowerCase());
  // If not yet synced, assume it exists (optimistic)
  return true;
}

/**
 * Sync ALL tables. Call once at app startup or on first API hit.
 * Sets a global flag to prevent redundant full scans.
 */
export async function ensureAllTablesSynced(): Promise<void> {
  if (_globalSynced) return;
  _globalSynced = true;

  const schemaModels = parseSchemaModels();

  // On Supabase, verify columns with a single lightweight request per table
  if (isSupabase()) {
    // Run verifications concurrently (1 request per table, not 70 per table)
    const checks = [...schemaModels.entries()].map(async ([model, columns]) => {
      const existing = await verifySupabaseColumns(model, columns);
      _synced.set(model.toLowerCase(), existing);
    });
    await Promise.allSettled(checks);
    return;
  }

  // SQLite: batch sync
  const tables = await getExistingTablesSQLite();
  for (const [model, columns] of schemaModels) {
    const actualTable = tables.get(model.toLowerCase());
    if (!actualTable) continue;
    const result = await syncTableColumnsSQLite(actualTable, columns);
    _synced.set(model.toLowerCase(), result.existing);
    if (result.added > 0) {
      console.log(`[db-sync] ${model}: added ${result.added} columns`);
    }
  }
}