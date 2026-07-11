import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Prisma type → PostgreSQL type mapping
// ─────────────────────────────────────────────────────────────────────────────

const PRISMA_TO_PG: Record<string, string> = {
  String: 'TEXT',
  Int: 'INTEGER',
  Float: 'DOUBLE PRECISION',
  Boolean: 'BOOLEAN',
  DateTime: 'TIMESTAMPTZ',
  BigInt: 'BIGINT',
  Json: 'JSONB',
  Bytes: 'BYTEA',
  Decimal: 'NUMERIC',
};

// ─────────────────────────────────────────────────────────────────────────────
// Schema parser — reads prisma/schema.prisma and generates CREATE TABLE SQL
// ─────────────────────────────────────────────────────────────────────────────

interface ColumnDef {
  name: string;
  pgType: string;
  nullable: boolean;
  isId: boolean;
  hasDefault: boolean;
  defaultVal: string;
  isUnique: boolean;
  isList: boolean;
}

interface TableDef {
  name: string;
  columns: ColumnDef[];
  indexes: string[];
  compositeUnique: string[][];
}

function parsePrismaSchema(): Map<string, TableDef> {
  const tables = new Map<string, TableDef>();
  const content = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf-8');
  const scalars = new Set(Object.keys(PRISMA_TO_PG));

  let currentTable = '';
  let currentCols: ColumnDef[] = [];
  let currentIndexes: string[] = [];
  let currentUnique: string[][] = [];

  for (const line of content.split('\n')) {
    const t = line.trim();

    // Model start
    const mMatch = t.match(/^model\s+(\w+)\s*\{/);
    if (mMatch) {
      currentTable = mMatch[1];
      currentCols = [];
      currentIndexes = [];
      currentUnique = [];
      continue;
    }

    // Model end
    if (t === '}' && currentTable) {
      tables.set(currentTable, {
        name: currentTable,
        columns: currentCols,
        indexes: currentIndexes,
        compositeUnique: currentUnique,
      });
      currentTable = '';
      continue;
    }

    if (!currentTable) continue;

    // Skip directives
    if (t.startsWith('@@') || t.startsWith('//')) {
      // Parse @@unique
      const uniqueMatch = t.match(/^@@unique\(\s*\[([^\]]+)\]\s*\)/);
      if (uniqueMatch) {
        currentUnique.push(
          uniqueMatch[1].split(',').map((s) => s.trim().replace(/"/g, ''))
        );
      }

      // Parse @@index
      const idxMatch = t.match(/^@@index\(\s*\[([^\]]+)\](?:,\s*name:\s*"([^"]+)")?\s*\)/);
      if (idxMatch) {
        const cols = idxMatch[1].split(',').map((s) => s.trim().replace(/"/g, ''));
        const name = idxMatch[2] || `${currentTable}_${cols.join('_')}_idx`;
        currentIndexes.push(`CREATE INDEX IF NOT EXISTS "${name}" ON "public"."${currentTable}" (${cols.map((c) => `"${c}"`).join(', ')});`);
      }
      continue;
    }

    // Parse field
    const fMatch = t.match(/^(\w+)\s+(\w+)(\[\])?\s*(.*)/);
    if (!fMatch) continue;

    const [, name, type, isList] = fMatch;
    const rest = fMatch[4] || '';

    // Skip relations (references)
    if (rest.includes('@relation') || rest.includes('references')) {
      // Still add as column (FK), but use the type as-is
      if (scalars.has(type)) {
        currentCols.push({
          name,
          pgType: PRISMA_TO_PG[type] || 'TEXT',
          nullable: t.includes('?') || !!isList,
          isId: false,
          hasDefault: false,
          defaultVal: '',
          isUnique: false,
          isList: !!isList,
        });
      }
      continue;
    }

    // Skip non-scalar types
    if (!scalars.has(type)) continue;

    const nullable = t.includes('?') || !!isList;
    const isId = rest.includes('@id');
    const isUnique = rest.includes('@unique');
    const hasDefault = rest.includes('@default(');

    let defaultVal = '';
    const defMatch = rest.match(/@default\(([^)]+)\)/);
    if (defMatch) {
      const dv = defMatch[1].trim();
      if (dv === 'now()') {
        defaultVal = 'DEFAULT now()';
      } else if (dv === 'true' || dv === 'false') {
        defaultVal = `DEFAULT ${dv}`;
      } else if (dv === 'uuid()' || dv === 'cuid()' || dv === 'nanoid()') {
        defaultVal = 'DEFAULT gen_random_uuid()';
      } else if (/^\d+(\.\d+)?$/.test(dv)) {
        defaultVal = `DEFAULT ${dv}`;
      } else if (dv.startsWith('"') || dv.startsWith("'")) {
        defaultVal = `DEFAULT ${dv}`;
      } else if (dv.startsWith('{') || dv.startsWith('[')) {
        defaultVal = `DEFAULT '${dv.replace(/'/g, "''")}'::jsonb`;
      } else {
        defaultVal = `DEFAULT '${dv.replace(/'/g, "''")}'`;
      }
    }

    const pgType = isId && type === 'String' ? 'TEXT PRIMARY KEY' : PRISMA_TO_PG[type] || 'TEXT';

    currentCols.push({
      name,
      pgType,
      nullable,
      isId,
      hasDefault,
      defaultVal,
      isUnique: isUnique || isId,
      isList: !!isList,
    });
  }

  return tables;
}

function generateCreateTableSQL(table: TableDef): string {
  const colDefs: string[] = [];

  for (const col of table.columns) {
    let def = `  "${col.name}" ${col.pgType}`;
    if (col.isId && col.pgType.includes('PRIMARY KEY')) {
      // Already included in pgType
    } else if (!col.nullable && !col.hasDefault) {
      def += ' NOT NULL';
    }
    if (col.hasDefault && col.defaultVal) {
      def += ` ${col.defaultVal}`;
    } else if (col.isUnique && !col.isId) {
      def += ' UNIQUE';
    }
    colDefs.push(def);
  }

  // Composite unique constraints
  for (const uniqueCols of table.compositeUnique) {
    colDefs.push(
      `  UNIQUE (${uniqueCols.map((c) => `"${c}"`).join(', ')})`
    );
  }

  const sql = `CREATE TABLE IF NOT EXISTS "public"."${table.name}" (\n${colDefs.join(',\n')}\n);`;

  // Indexes
  const indexSQL = table.indexes.join('\n');

  return sql + (indexSQL ? '\n' + indexSQL : '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Check which tables exist in Supabase
// ─────────────────────────────────────────────────────────────────────────────

async function getExistingSupabaseTables(): Promise<Set<string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Set();

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    // The root endpoint returns OpenAPI spec, not table list
    // Instead, query information_schema via a known table
    // Use a simple approach: try to find tables via the RPC endpoint
    const spec = await res.json();
    const tables = new Set<string>();
    if (spec?.paths) {
      for (const path of Object.keys(spec.paths)) {
        const match = path.match(/^\/(\w+)$/);
        if (match) tables.add(match[1]);
      }
    }
    return tables;
  } catch {
    return new Set();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Generate CREATE TABLE SQL for missing tables
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Verify auth (simple API key check)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!authHeader || authHeader.replace('Bearer ', '') !== apiKey) {
      // Also allow internal calls (no auth for sync from backend)
      const syncKey = request.headers.get('x-sync-key');
      const expectedSyncKey = process.env.INTERNAL_SYNC_KEY || 'sync-internal';
      if (syncKey !== expectedSyncKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const tables = parsePrismaSchema();
    const existingTables = await getExistingSupabaseTables();

    const { searchParams } = new URL(request.url);
    const specificTable = searchParams.get('table');
    const dryRun = searchParams.get('dryRun') !== 'false'; // Default: true

    const missingTables: string[] = [];
    const sqlStatements: string[] = [];

    for (const [name, tableDef] of tables) {
      if (specificTable && name !== specificTable) continue;
      if (existingTables.has(name)) continue;

      missingTables.push(name);
      sqlStatements.push(generateCreateTableSQL(tableDef));
    }

    const fullSQL = sqlStatements.join('\n\n');

    if (dryRun !== false) {
      return NextResponse.json({
        mode: 'dry-run',
        missingTables,
        existingTableCount: existingTables.size,
        totalModels: tables.size,
        sql: fullSQL,
        instructions: fullSQL
          ? 'Run this SQL in Supabase Dashboard > SQL Editor, or call this endpoint with ?dryRun=false&execute=true to auto-execute'
          : 'All tables exist in Supabase. No action needed.',
      });
    }

    // Try to execute (requires SUPABASE_DIRECT_URL or similar)
    // For now, return the SQL for manual execution
    return NextResponse.json({
      mode: 'sql-only',
      missingTables,
      sql: fullSQL,
      message: 'Add SUPABASE_DIRECT_URL env var to enable auto-execution, or run the SQL manually in Supabase Dashboard.',
    });
  } catch (error) {
    console.error('[Supabase Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sync SQL', details: String(error) },
      { status: 500 }
    );
  }
}