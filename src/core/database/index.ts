// Database barrel export

// Primary database client (auto-switches Supabase / Prisma)
export { db, withRetry, getDbFriendlyMessage, getErrorInfo, getErrorHeaders } from './db';
export type { PrismaClient } from '../../../generated/prisma/client';

// Schema sync utilities
export { ensureTableSync, ensureAllTablesSynced } from './db-sync';

// Database utility functions (retry, error formatting)
export { withRetry as dbUtilsRetry, getDbFriendlyMessage as getDbFriendlyMessageFromUtils, getErrorHeaders as getDbErrorHeaders, getErrorInfo as getDbErrorInfo } from './db-utils';
export type { DbErrorInfo } from './db-utils';

// Prisma singleton
export { findDatabaseUrl, prisma, isPrismaTimeout, isPrismaTransient } from './prisma';

// Supabase clients
export { getSupabaseClient, getSupabaseAdmin, isSupabaseConfigured } from './supabase';

// Supabase client shim (lightweight proxy to supabase-service)
export { supabaseDb as supabaseDbClient } from './supabase-client';

// Supabase DB adapter (Prisma-compatible via supabase-service mini-service)
export { supabaseDb } from './supabase-db';

// Supabase DB adapter (full, direct REST — standalone, no mini-service)
export { supabaseDb as supabaseDbFull } from './supabase-db.full';

// Supabase REST adapter (uses @supabase/supabase-js SDK)
export { db as supabaseRestDb, $transaction as supabaseRestTransaction, $disconnect as supabaseRestDisconnect } from './supabase-rest';