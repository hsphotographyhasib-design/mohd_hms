/* eslint-disable @typescript-eslint/no-require-imports */
import type { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | undefined

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || ''

  // Turso / libSQL remote database (Vercel production)
  if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://')) {
    const authToken = process.env.DATABASE_AUTH_TOKEN || ''
    // Embed auth token directly in the URL
    const fullUrl = authToken
      ? `${dbUrl}?authToken=${encodeURIComponent(authToken)}`
      : dbUrl

    // Set env var as safety net before any Prisma module loads
    process.env.DATABASE_URL = fullUrl

    const { PrismaClient } = require('@prisma/client')
    const { createClient } = require('@libsql/client')
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')

    const libsql = createClient({ url: fullUrl })
    const adapter = new PrismaLibSQL(libsql)

    // Pass datasourceUrl EXPLICITLY — Prisma uses this instead of reading env
    return new PrismaClient({
      adapter,
      datasourceUrl: fullUrl,
      log: [],
    })
  }

  // Local SQLite file (development)
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