/**
 * Lightweight Supabase database client shim.
 *
 * Replaces the heavy supabase-db.ts (which OOMs Turbopack) with a thin
 * HTTP proxy to the supabase-service mini-service on port 3001.
 *
 * This file is small enough for Turbopack to compile without OOM.
 * The actual Supabase REST adapter runs in a separate process.
 */

const SB = 'http://127.0.0.1:3001';

async function query(table: string, method: string, args?: any): Promise<any> {
  const res = await fetch(`${SB}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, method, args }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Supabase ${res.status}`);
  }
  return data;
}

function makeTable(name: string): any {
  return new Proxy({} as any, {
    get(_t: any, prop: string) {
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      return (...a: any[]) => query(name, prop, a[0]);
    },
  });
}

export const supabaseDb = new Proxy({} as any, {
  get(_t: any, prop: string) {
    if (prop === 'then' || typeof prop === 'symbol') return undefined;
    return makeTable(prop);
  },
});