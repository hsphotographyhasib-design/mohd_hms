/**
 * Database client — auto-switches between Supabase REST API and local Prisma/SQLite.
 *
 * When USE_SUPABASE=true, uses the Supabase REST adapter (works from any network).
 * Otherwise, dynamically loads Prisma/SQLite only when first needed.
 *
 * All 100+ API routes import { db } from '@/lib/db' — no changes needed.
 */

import { supabaseDb } from './supabase-db';

/**
 * Lazy Prisma proxy — uses require() to load prisma.ts only on first
 * property access. This ensures importing db.ts never triggers the
 * SQLite adapter or any native module loading when USE_SUPABASE=true.
 */
let _prismaCache: any = undefined;

function _ensurePrisma(): any {
  if (!_prismaCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./prisma');
    _prismaCache = mod.prisma();
  }
  return _prismaCache;
}

const _lazyPrisma = new Proxy({} as any, {
  get(_target, prop, receiver) {
    const client = _ensurePrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, prop) {
    return prop in _ensurePrisma();
  },
});

export const db: any =
  process.env.USE_SUPABASE === 'true'
    ? supabaseDb
    : _lazyPrisma;

// Lazy type re-export (never evaluated at runtime)
export type { PrismaClient } from "../../generated/prisma/client";