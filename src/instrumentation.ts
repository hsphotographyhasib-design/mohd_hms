// Next.js instrumentation - runs once when the server starts
// This warms up the Prisma/Turso connection before any API requests

export async function register() {
  try {
    const { db } = await import('@/lib/db')
    // Trigger connection by running a lightweight query
    await db.$queryRaw`SELECT 1`
    console.log('[Instrumentation] Database connection initialized')
  } catch (err) {
    console.error('[Instrumentation] Database initialization failed:', err)
  }
}