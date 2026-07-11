/// <reference types="bun-types" />
/**
 * Standalone script to push the Prisma schema to a fresh Supabase database.
 *
 * Usage:
 *   bun run scripts/init-supabase.ts YOUR_DB_PASSWORD
 *
 * The DB password is found in:
 *   Supabase Dashboard → Settings → Database → Database password
 *
 * This script connects directly to the Supabase PostgreSQL host,
 * reads supabase-schema.sql, and executes all CREATE TABLE statements.
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
  console.error('Usage: bun run scripts/init-supabase.ts YOUR_DB_PASSWORD');
  console.error('');
  console.error('Get your password from:');
  console.error('  Supabase Dashboard → your project → Settings → Database → Database password');
  console.error('  (click "Reset database password" if you forgot it)');
  process.exit(1);
}

const directUrl = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;

async function main() {
  console.log(`\n🚀 Supabase Schema Setup`);
  console.log(`   Project: ${projectRef}`);
  console.log(`   Host:    db.${projectRef}.supabase.co`);
  console.log('');

  // Read SQL
  const sqlPath = resolve(import.meta.dir, '..', 'supabase-schema.sql');
  let sql: string;
  try {
    sql = readFileSync(sqlPath, 'utf-8');
  } catch {
    console.error('Error: supabase-schema.sql not found.');
    console.error('Generate it first with:');
    console.error('  DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > supabase-schema.sql');
    process.exit(1);
  }

  // Connect
  const pool = new Pool({
    connectionString: directUrl,
    max: 1,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to database...');
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected!\n');
  } catch (err) {
    await pool.end();
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('password authentication failed')) {
      console.error('❌ Authentication failed. Check your database password.');
    } else {
      console.error(`❌ Connection failed: ${msg}`);
    }
    process.exit(1);
  }

  // Execute statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.startsWith('◇'));

  let executed = 0;
  let errors = 0;
  const startTime = Date.now();

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt);
      executed++;
      // Progress indicator every 50 statements
      if ((i + 1) % 50 === 0) {
        process.stdout.write(`   ${i + 1}/${statements.length}...\r`);
      }
    } catch (err) {
      errors++;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errors <= 5) {
        console.error(`   ⚠ Statement ${i + 1} failed: ${errMsg.slice(0, 100)}`);
      }
    }
  }

  const elapsed = Date.now() - startTime;

  client.release();
  await pool.end();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Done in ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`   Executed: ${executed}/${statements.length} statements`);
  if (errors > 0) {
    console.log(`   Errors:   ${errors} (may be constraint ordering — usually OK)`);
  }
  console.log('');

  // Show next steps
  console.log('📋 Next steps:');
  console.log('');
  console.log('1. Get your pooler connection string from:');
  console.log('   Supabase Dashboard → Settings → Database → Connection string → Transaction mode');
  console.log(`   It should look like:`);
  console.log(`   postgresql://postgres.${projectRef}:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`);
  console.log('');
  console.log('2. Set it as DATABASE_URL in your .env file');
  console.log('3. Restart the dev server: bun run dev');
  console.log('');
  console.log('4. Seed the database:');
  console.log('   bun run scripts/seed-supabase.ts');
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});