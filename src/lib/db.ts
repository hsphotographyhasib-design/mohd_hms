/* eslint-disable @typescript-eslint/no-require-imports */
import type { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | undefined

/**
 * Purge ALL @prisma/* and .prisma/* entries from the Node require cache.
 * This forces a completely fresh module load on the next require(), ensuring
 * Prisma's generated code reads the current process.env.DATABASE_URL value
 * instead of a stale cached value from a previous warm invocation.
 */
function clearPrismaCache() {
  const cacheKeys = Object.keys(require.cache)
  for (const key of cacheKeys) {
    if (key.includes('@prisma') || key.includes('.prisma')) {
      delete require.cache[key]
    }
  }
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || ''

  // Turso / libSQL remote database (Vercel production)
  if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://')) {
    const authToken = process.env.DATABASE_AUTH_TOKEN || ''
    const fullUrl = authToken
      ? `${dbUrl}?authToken=${encodeURIComponent(authToken)}`
      : dbUrl

    // 1. Nuke any stale Prisma modules from require cache
    clearPrismaCache()

    // 2. Set env var BEFORE Prisma reads it
    process.env.DATABASE_URL = fullUrl

    // 3. Now require — Prisma's generated code reads process.env.DATABASE_URL
    const { PrismaClient } = require('@prisma/client')

    // 4. Create adapter with embedded auth token URL
    const { createClient } = require('@libsql/client')
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')

    const libsql = createClient({ url: fullUrl })
    const adapter = new PrismaLibSQL(libsql)

    return new PrismaClient({
      adapter,
      log: [],
    })
  }

  // Local SQLite file (development)
  clearPrismaCache()
  process.env.DATABASE_URL = dbUrl
  const { PrismaClient } = require('@prisma/client')
  return new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

// Lazy getter — only creates the client when first accessed at runtime
function getDb(): PrismaClient {
  if (_db) return _db
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }
  _db = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  return _db
}

// Proxy that delegates to lazy getter — fully compatible with `db.user.findFirst(...)` syntax
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getDb()
    const val = (client as Record<string | symbol, unknown>)[prop]
    if (typeof val === 'function') return val.bind(client)
    return val
  },
})