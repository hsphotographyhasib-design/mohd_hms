import { db } from '@/lib/db';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Auto-sync missing columns from the Prisma schema into the actual database.
 *
 * Prisma generates SQL that references ALL columns defined in the schema,
 * even when using `include` or `select`. If the real DB table is missing
 * columns that the schema declares, every query will fail with
 * "column does not exist" (P2022).
 *
 * This utility detects those missing columns and adds them via ALTER TABLE
 * so that Prisma queries succeed immediately — no manual /api/setup/sync-schema
 * POST needed.
 */

// Map Prisma scalar types → PostgreSQL column types
const PRISMA_TO_PG: Record<string, string> = {
  String: 'text',
  Int: 'integer',
  Float: 'double precision',
  Boolean: 'boolean',
  DateTime: 'timestamp(3)',
  BigInt: 'bigint',
  Json: 'jsonb',
  Bytes: 'bytea',
  Decimal: 'numeric',
};

// Cache: table → set of column names (lowercase) already verified
const _synced = new Map<string, Set<string>>();
let _globalSynced = false;

// ---------- schema parsing ----------

interface ColumnDef {
  name: string;
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
    const scalars = new Set(Object.keys(PRISMA_TO_PG));

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
        pgType: PRISMA_TO_PG[type] || 'text',
        nullable: t.includes('?'),
        hasDefault: t.includes('@default('),
      });
    }
  } catch {
    // Schema not readable — silently skip
  }

  return models;
}

// ---------- DB introspection ----------

async function getExistingTables(): Promise<Map<string, string>> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.tablename.toLowerCase(), r.tablename);
  return map;
}

async function getExistingColumns(table: string): Promise<Set<string>> {
  const rows = await db.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  return new Set(rows.map((r) => r.column_name.toLowerCase()));
}

// ---------- sync logic ----------

const SAFE_DEFAULTS: Record<string, string> = {
  text: "DEFAULT ''",
  integer: 'DEFAULT 0',
  boolean: 'DEFAULT false',
  'double precision': 'DEFAULT 0',
  numeric: 'DEFAULT 0',
  'timestamp(3)': 'DEFAULT CURRENT_TIMESTAMP',
  bigint: 'DEFAULT 0',
  jsonb: "DEFAULT '{}'",
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
      const def = SAFE_DEFAULTS[col.pgType] || 'DEFAULT NULL';
      try {
        const sql = `ALTER TABLE "${actualTable}" ADD COLUMN "${col.name}" ${col.pgType} NOT NULL ${def}`;
        await db.$executeRawUnsafe(sql);
        added++;
        continue;
      } catch {
        // Fall through to nullable attempt
      }
    }

    // Fallback: nullable column
    try {
      const sql = `ALTER TABLE "${actualTable}" ADD COLUMN "${col.name}" ${col.pgType}`;
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
 * If the table doesn't exist, it will be created.
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

  const tables = await getExistingTables();
  let actualTable = tables.get(tableName.toLowerCase());

  // If table doesn't exist, try to create it via Prisma Migrate-compatible SQL
  if (!actualTable) {
    try {
      const colDefs = columns
        .filter((c) => c.name !== 'id') // id is handled by @id @default(cuid())
        .map((c) => {
          const def = c.hasDefault || !c.nullable ? ` NOT NULL${SAFE_DEFAULTS[c.pgType] || ''}` : '';
          return `"${c.name}" ${c.pgType}${def}`;
        })
        .join(',\n    ');

      const sql = `CREATE TABLE IF NOT EXISTS "public"."${tableName}" (
    "id" TEXT NOT NULL PRIMARY KEY,
    ${colDefs}
  )`;
      await db.$executeRawUnsafe(sql);
      console.log(`[db-sync] ${tableName}: table created`);
      // Refresh tables map
      const updated = await getExistingTables();
      actualTable = updated.get(tableName.toLowerCase());
    } catch (e) {
      console.error(`[db-sync] ${tableName}: failed to create table — ${(e as Error).message.slice(0, 120)}`);
      return;
    }
  }

  if (!actualTable) return;

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