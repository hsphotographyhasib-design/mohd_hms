import { prisma } from './prisma'

/**
 * Database client singleton.
 * Uses Prisma 7 with PrismaPg adapter → Prisma Postgres.
 * Re-exports the singleton from lib/prisma.ts for backward compatibility
 * with the 99 files that import { db } from '@/lib/db'.
 */
export const db = prisma

// Re-export types for convenience
export type { PrismaClient } from '../../generated/prisma/client'