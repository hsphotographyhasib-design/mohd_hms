/**
 * Database client — thin wrapper around the Supabase REST adapter.
 *
 * In the Express backend, we always use Supabase (no local Prisma/SQLite).
 * All routes import { db } from '@/lib/db'.
 */

export { supabaseDb as db } from './supabase-db.js';