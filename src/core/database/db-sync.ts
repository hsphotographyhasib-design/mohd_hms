import { db } from '@/core/database/db';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Auto-sync missing columns from the Prisma schema into the actual database.
 *
 * For SQLite: uses sqlite_master and pragma_table_info to introspect the
 * current schema and add any missing columns via ALTER TABLE.
 *
 * For Supabase: uses information_schema.columns to detect missing columns.
 * Adds them via the Supabase REST RPC endpoint if a migration function exists,
 * otherwise logs a warning and strips the field from queries.
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

// ---------- DB introspection (Supabase) ----------

function isSupabase(): boolean {
  return !!(process.env.USE_SUPABASE === 'true' ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV === 'production'));
}

async function getExistingColumnsSupabase(table: string): Promise<Set<string>> {
  try {
    const rows = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = ${table}
    `;
    return new Set(rows.map((r) => r.column_name.toLowerCase()));
  } catch {
    console.warn(`[db-sync] Could not introspect Supabase table "${table}"`);
    return new Set();
  }
}

/**
 * Try to add a missing column to a Supabase table via direct SQL.
 * Uses the Supabase REST API's /rpc endpoint with a generic migration helper.
 * Falls back gracefully if the RPC function doesn't exist.
 */
async function addSupabaseColumn(table: string, col: ColumnDef): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return false;

  const sql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.pgType}${col.nullable ? '' : ' NOT NULL DEFAULT \'{}\''};`;

  // Try using the db_add_column RPC function if it exists
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/db_add_column`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_table_name: table,
        p_column_name: col.name,
        p_column_type: col.pgType,
        p_nullable: col.nullable,
      }),
    });
    if (res.ok) return true;
  } catch {
    // RPC function doesn't exist — fall through
  }

  // Try direct SQL via pg endpoint (available on self-hosted Supabase)
  try {
    const pgUrl = supabaseUrl.replace('/rest/v1', '');
    const res = await fetch(`${pgUrl}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) return true;
  } catch {
    // pg endpoint not available
  }

  return false;
}

// ---------- sync logic ----------

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

async function syncTableColumnsSupabase(
  table: string,
  expectedColumns: ColumnDef[]
): Promise<{ added: number; errors: string[]; existing: Set<string> }> {
  let existing: Set<string>;
  try {
    existing = await getExistingColumnsSupabase(table);
  } catch {
    return { added: 0, errors: ['Cannot read Supabase columns'], existing: new Set() };
  }

  let added = 0;
  const errors: string[] = [];

  for (const col of expectedColumns) {
    if (existing.has(col.name.toLowerCase())) continue;

    const ok = await addSupabaseColumn(table, col);
    if (ok) {
      added++;
      console.log(`[db-sync] Supabase ${table}: added column "${col.name}" (${col.pgType})`);
    } else {
      errors.push(`${col.name}: could not add to Supabase (no RPC/pg endpoint)`);
      console.warn(`[db-sync] Supabase ${table}: missing column "${col.name}" — add manually: ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.pgType}${col.nullable ? '' : ' NOT NULL DEFAULT \'{}\''};`);
    }
  }

  return { added, errors, existing };
}

// ---------- public API ----------

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

  const schemaModels = parseSchemaModels();
  const columns = schemaModels.get(tableName);
  if (!columns || columns.length === 0) return;

  let result: { added: number; errors: string[]; existing: Set<string> };

  if (isSupabase()) {
    result = await syncTableColumnsSupabase(tableName, columns);
  } else {
    const tables = await getExistingTablesSQLite();
    const actualTable = tables.get(tableName.toLowerCase());
    if (!actualTable) return; // Table doesn't exist — Prisma will handle creation
    result = await syncTableColumnsSQLite(actualTable, columns);
  }

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

  if (isSupabase()) {
    // Supabase: sync each table individually
    for (const [model, columns] of schemaModels) {
      const result = await syncTableColumnsSupabase(model, columns);
      _synced.set(model.toLowerCase(), result.existing);
      if (result.added > 0) {
        console.log(`[db-sync] ${model}: added ${result.added} columns`);
      }
    }
  } else {
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
}