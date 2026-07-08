import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const dynamic = 'force-dynamic';

/**
 * One-time setup: Push the Prisma schema to a fresh Supabase database.
 *
 * POST body: { "dbPassword": "your-supabase-db-password" }
 *
 * Connects directly to the Supabase PostgreSQL host and executes
 * the generated DDL (supabase-schema.sql) to create all tables.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { dbPassword } = body;

    if (!dbPassword || typeof dbPassword !== 'string') {
      return NextResponse.json({ error: 'dbPassword is required' }, { status: 400 });
    }

    const sqlPath = resolve(process.cwd(), 'supabase-schema.sql');
    let sql: string;
    try {
      sql = readFileSync(sqlPath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'supabase-schema.sql not found' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL not set' }, { status: 400 });
    }

    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid NEXT_PUBLIC_SUPABASE_URL' }, { status: 400 });
    }

    const projectRef = match[1];
    const directUrl = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;

    console.log(`[Supabase Init] Connecting to db.${projectRef}.supabase.co...`);

    const pool = new Pool({
      connectionString: directUrl,
      max: 1,
      connectionTimeoutMillis: 15000,
      ssl: { rejectUnauthorized: false },
    });

    let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      await pool.end();
      const msg = connErr instanceof Error ? connErr.message : String(connErr);
      if (msg.includes('password authentication failed')) {
        return NextResponse.json(
          { error: 'Wrong password. Get it from: Supabase Dashboard → Settings → Database → Database password' },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: `Connection failed: ${msg}` }, { status: 500 });
    }

    try {
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 5 && !s.startsWith('◇'));

      let executed = 0;
      const errors: string[] = [];

      for (const statement of statements) {
        try {
          await client.query(statement);
          executed++;
        } catch (stmtErr) {
          const errMsg = stmtErr instanceof Error ? stmtErr.message : String(stmtErr);
          console.warn(`[Supabase Init] ${errMsg.slice(0, 120)}`);
          errors.push(errMsg);
        }
      }

      return NextResponse.json({
        success: true,
        message: errors.length > 0
          ? `Schema applied with ${errors.length} errors (may be ordering-related)`
          : 'All tables created successfully!',
        executed,
        total: statements.length,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
        elapsedMs: Date.now() - startTime,
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Setup failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}