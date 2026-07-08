/**
 * Push schema to Supabase via the session-mode pooler (port 6543).
 *
 * The direct connection (port 5432) is unreachable from some networks
 * (IPv6-only DNS, firewalled), so we use the Supabase Supavisor pooler
 * in session mode which supports DDL.
 *
 * Usage:
 *   bun run scripts/init-supabase-pooler.ts YOUR_DB_PASSWORD
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env
const envPath = resolve(import.meta.dir, '..', '.env');
config({ path: envPath, override: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = SUPABASE_URL?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL not set or invalid in .env');
  process.exit(1);
}

const dbPassword = process.argv[2];
if (!dbPassword) {
  console.error('Usage: bun run scripts/init-supabase-pooler.ts YOUR_DB_PASSWORD');
  process.exit(1);
}

// Regions to try (Singapore first since user is in Asia/Singapore)
const REGIONS = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-south-1',
  'us-east-1',
  'us-west-1',
  'eu-west-1',
  'eu-central-1',
];

async function tryConnect(region: string): Promise<Pool | null> {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connStr = `postgresql://postgres.${projectRef}:${dbPassword}@${host}:6543/postgres?sslmode=require`;
  
  const pool = new Pool({
    connectionString: connStr,
    max: 1,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    // Quick test query
    await client.query('SELECT 1 as ok');
    client.release();
    console.log(`✅ Connected via ${host}`);
    return pool;
  } catch {
    await pool.end().catch(() => {});
    return null;
  }
}

async function main() {
  console.log(`\n🚀 Supabase Schema Setup (via Pooler)`);
  console.log(`   Project: ${projectRef}`);
  console.log('');

  // Read SQL
  const sqlPath = resolve(import.meta.dir, '..', 'supabase-schema.sql');
  let sql: string;
  try {
    sql = readFileSync(sqlPath, 'utf-8');
  } catch {
    console.error('Error: supabase-schema.sql not found.');
    process.exit(1);
  }

  // Try each region until one connects
  console.log('Probing regions for accessible pooler...\n');
  let pool: Pool | null = null;
  let connectedRegion = '';

  for (const region of REGIONS) {
    process.stdout.write(`   Trying ${region}...`);
    pool = await tryConnect(region);
    if (pool) {
      connectedRegion = region;
      console.log(' ✅');
      break;
    }
    console.log(' ❌');
  }

  if (!pool) {
    console.error('\n❌ Could not connect to any Supabase region. Check password and network.');
    process.exit(1);
  }

  console.log('');

  // Get a client for DDL execution
  const client = await pool.connect();

  // Execute statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.startsWith('◇'));

  let executed = 0;
  let errors = 0;
  const errorDetails: string[] = [];
  const startTime = Date.now();

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt);
      executed++;
      if ((i + 1) % 50 === 0 || i === statements.length - 1) {
        process.stdout.write(`   ${i + 1}/${statements.length}...\r`);
      }
    } catch (err) {
      errors++;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errors <= 10) {
        errorDetails.push(`#${i + 1}: ${errMsg.slice(0, 150)}`);
      }
    }
  }

  const elapsed = Date.now() - startTime;

  client.release();
  await pool.end();

  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`✅ Done in ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`   Region:   ${connectedRegion}`);
  console.log(`   Executed: ${executed}/${statements.length} statements`);
  if (errors > 0) {
    console.log(`   Errors:   ${errors}`);
    errorDetails.forEach(d => console.log(`     ${d}`));
  }
  console.log('');

  // Output the pooler connection string for .env
  const poolerUrl = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${connectedRegion}.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`;
  console.log('📋 Copy this as your DATABASE_URL in .env:');
  console.log('');
  console.log(`DATABASE_URL=${poolerUrl}`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});