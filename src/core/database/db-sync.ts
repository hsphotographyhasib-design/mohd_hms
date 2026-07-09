import { db } from '@/core/database/db';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Auto-sync missing columns from the Prisma schema into the actual database.
 *
 * For SQLite, uses sqlite_master and pragma_table_info to introspect the
 * current schema and add any missing columns via ALTER TABLE.
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

// Cache: table → set of column names (lowercase) already verified
const _synced = new Map<string, Set<string>>();
let _globalSynced = false;

// ---------- schema parsing ----------

interface ColumnDef {
  name: string;
  sqliteType: string;
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

async function getExistingTables(): Promise<Map<string, string>> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `;
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.name.toLowerCase(), r.name);
  return map;
}

async function getExistingColumns(table: string): Promise<Set<string>> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    PRAGMA table_info("${table}")
  `;
  return new Set(rows.map((r) => r.name.toLowerCase()));
}

// ---------- sync logic ----------

const SAFE_DEFAULTS: Record<string, string> = {
  TEXT: "DEFAULT ''",
  INTEGER: 'DEFAULT 0',
  REAL: 'DEFAULT 0',
  BLOB: "DEFAULT ''",
};

async function syncTableColumns(
  actualTable: string,
  expectedColumns: ColumnDef[]
): Promise<{ added: number; errors: string[] }> {
  let existing: Set<string>;
  try {
    existing = await getExistingColumns(actualTable);
  } catch {
    return { added: 0, errors: ['Cannot read columns'] };
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

  return { added, errors };
}

// ---------- public API ----------

/**
 * Ensure a specific table exists and its columns match the Prisma schema.
 * Safe to call repeatedly — skips already-synced columns.
 *
 * @param tableName The Prisma model name (e.g. "Complaint")
 */
export async function ensureTableSync(tableName: string): Promise<void> {
  // No-op when using Supabase — schema is managed via Supabase migrations
  if (process.env.USE_SUPABASE === 'true' ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV === 'production')) return;

  // Check local cache
  const cached = _synced.get(tableName.toLowerCase());
  if (cached) return; // Already synced at least once

  const schemaModels = parseSchemaModels();
  const columns = schemaModels.get(tableName);
  if (!columns || columns.length === 0) return;

  const tables = await getExistingTables();
  let actualTable = tables.get(tableName.toLowerCase());

  if (!actualTable) return; // Table doesn't exist yet — Prisma will handle creation

  const result = await syncTableColumns(actualTable, columns);

  // Cache even if there were errors (so we don't retry every request)
  _synced.set(tableName.toLowerCase(), new Set(columns.map((c) => c.name.toLowerCase())));

  if (result.added > 0 || result.errors.length > 0) {
    console.log(
      `[db-sync] ${tableName}: added ${result.added} columns${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
    );
  }
}

/**
 * Sync ALL tables. Call once at app startup or on first API hit.
 * Sets a global flag to prevent redundant full scans.
 */
export async function ensureAllTablesSynced(): Promise<void> {
  // No-op when using Supabase — schema is managed via Supabase migrations
  if (process.env.USE_SUPABASE === 'true') return;

  if (_globalSynced) return;
  _globalSynced = true;

  const schemaModels = parseSchemaModels();
  const tables = await getExistingTables();

  for (const [model, columns] of schemaModels) {
    const actualTable = tables.get(model.toLowerCase());
    if (!actualTable) continue;

    const result = await syncTableColumns(actualTable, columns);
    _synced.set(model.toLowerCase(), new Set(columns.map((c) => c.name.toLowerCase())));

    if (result.added > 0) {
      console.log(`[db-sync] ${model}: added ${result.added} columns`);
    }
  }
}