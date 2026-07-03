// Next.js instrumentation - runs once when the server starts
// Note: DB warm-up is deferred to first API request to avoid
// pulling Node-only modules (Prisma/pg) into Edge Runtime analysis.

export const runtime = 'nodejs'

export async function register() {
  console.log('[Instrumentation] Server started')
}