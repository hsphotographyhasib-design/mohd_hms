import { NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export const dynamic = 'force-dynamic';

/**
 * Database schema sync endpoint.
 * Reads the Prisma schema file and adds any missing columns to existing tables.
 * Works on Vercel serverless (no CLI needed — uses raw ALTER TABLE).
 *
 * GET  /api/setup/sync-schema — shows missing columns (read-only)
 * POST /api/setup/sync-schema — adds missing columns
 */

// Map Prisma scalar types to PostgreSQL column types
function prismaTypeToPg(prismaType: string): string {
  const map: Record<string, string> = {
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
  return map[prismaType] || 'text';
}

// Parse Prisma schema to extract model → columns mapping
function parseSchemaModels(): Map<string, { name: string; type: string; nullable: boolean; hasDefault: boolean }[]> {
  const models = new Map<string, { name: string; type: string; nullable: boolean; hasDefault: boolean }[]>();
  let currentModel = '';

  try {
    const schemaContent = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf-8');
    const prismaScalars = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'BigInt', 'Json', 'Bytes', 'Decimal']);

    for (const line of schemaContent.split('\n')) {
      const trimmed = line.trim();

      const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
      if (modelMatch) { currentModel = modelMatch[1]; models.set(currentModel, []); continue; }
      if (trimmed === '}' && currentModel) { currentModel = ''; continue; }
      if (!currentModel || trimmed.startsWith('@@') || trimmed.startsWith('//')) continue;

      // Parse field: name Type? @default(...)
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?/);
      if (!fieldMatch) continue;

      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const isList = !!fieldMatch[3];

      // Skip relations (non-scalar types)
      if (!prismaScalars.has(fieldType)) continue;
      // Skip list types (stored differently)
      if (isList) continue;

      const nullable = trimmed.includes('?');
      const hasDefault = trimmed.includes('@default(');
      models.get(currentModel)!.push({ name: fieldName, type: prismaTypeToPg(fieldType), nullable, hasDefault });
    }
  } catch {
    // Schema file not readable
  }

  return models;
}

async function getExistingColumns(table: string): Promise<Set<string>> {
  const rows = await db.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  return new Set(rows.map(r => r.column_name.toLowerCase()));
}

async function getExistingTables(): Promise<Map<string, string>> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.tablename.toLowerCase(), r.tablename);
  return map;
}

export async function POST() {
  const startTime = performance.now();
  const results: { table: string; added: string[]; errors: string[] }[] = [];

  try {
    const schemaModels = parseSchemaModels();
    const tables = await getExistingTables();

    for (const [model, columns] of schemaModels) {
      const actualTable = tables.get(model.toLowerCase());
      if (!actualTable) continue;

      const existingCols = await getExistingColumns(actualTable);
      const added: string[] = [];
      const errors: string[] = [];

      for (const col of columns) {
        if (existingCols.has(col.name.toLowerCase())) continue;

        // Determine safe default for NOT NULL columns
        let defaultClause = '';
        if (!col.nullable) {
          const defaults: Record<string, string> = {
            'text': "DEFAULT ''",
            'integer': 'DEFAULT 0',
            'boolean': 'DEFAULT false',
            'double precision': 'DEFAULT 0',
            'numeric': 'DEFAULT 0',
            'timestamp(3)': 'DEFAULT CURRENT_TIMESTAMP',
            'bigint': 'DEFAULT 0',
            'jsonb': "DEFAULT '{}'",
          };
          defaultClause = defaults[col.type] || 'DEFAULT NULL';
        }

        try {
          const sql = `ALTER TABLE "${actualTable}" ADD COLUMN "${col.name}" ${col.type} ${col.nullable ? '' : 'NOT NULL'} ${defaultClause}`.replace(/\s+/g, ' ').trim();
          await db.$executeRawUnsafe(sql);
          added.push(col.name);
        } catch (e) {
          // If NOT NULL fails, try as nullable
          if (!col.nullable) {
            try {
              const sql = `ALTER TABLE "${actualTable}" ADD COLUMN "${col.name}" ${col.type}`;
              await db.$executeRawUnsafe(sql);
              added.push(col.name);
            } catch (e2) {
              errors.push(`${col.name}: ${(e2 as Error).message.slice(0, 100)}`);
            }
          } else {
            errors.push(`${col.name}: ${(e as Error).message.slice(0, 100)}`);
          }
        }
      }

      if (added.length > 0 || errors.length > 0) {
        results.push({ table: actualTable, added, errors });
      }
    }

    const totalAdded = results.reduce((s, r) => s + r.added.length, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

    return NextResponse.json({
      success: totalErrors === 0,
      message: totalAdded > 0 ? `Added ${totalAdded} missing columns across ${results.length} tables.` : 'Schema is already in sync.',
      columnsAdded: totalAdded,
      errors: totalErrors,
      details: results,
      durationMs: Math.round(performance.now() - startTime),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const schemaModels = parseSchemaModels();
    const tables = await getExistingTables();

    const missingTables: string[] = [];
    const needsSync: { model: string; table: string; missingColumns: string[] }[] = [];

    for (const [model, columns] of schemaModels) {
      const actualTable = tables.get(model.toLowerCase());
      if (!actualTable) { missingTables.push(model); continue; }

      const existingCols = await getExistingColumns(actualTable);
      const missing = columns.filter(c => !existingCols.has(c.name.toLowerCase())).map(c => c.name);
      if (missing.length > 0) {
        needsSync.push({ model, table: actualTable, missingColumns: missing });
      }
    }

    return NextResponse.json({
      ready: missingTables.length === 0 && needsSync.length === 0,
      totalTables: tables.size,
      missingTables,
      tablesWithMissingColumns: needsSync,
    });
  } catch (error) {
    return NextResponse.json({ ready: false, error: getDbFriendlyMessage(error) }, { status: 500 });
  }
}