/**
 * Standalone Supabase seeding script.
 * Usage: bun run scripts/seed-supabase.ts
 *
 * Seeds: tenant, system settings, departments, service categories.
 * Idempotent — safe to run multiple times.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TENANT_DOMAIN = 'app.mohdhms.com';

const SETTINGS = [
  { key: 'company_name', value: 'MOHD.HMS ENTERPRISE' },
  { key: 'default_currency', value: 'MYR' },
  { key: 'timezone', value: 'Asia/Singapore' },
  { key: 'date_format', value: 'DD/MM/YYYY' },
  { key: 'complaint_auto_number', value: 'CMP-0001' },
  { key: 'work_order_auto_number', value: 'WO-0001' },
  { key: 'invoice_auto_number', value: 'INV-0001' },
  { key: 'quotation_auto_number', value: 'QUO-0001' },
];

const DEPARTMENTS = ['Operations', 'Maintenance', 'Electrical', 'HVAC', 'Plumbing'];

const SERVICE_CATEGORIES = ['HVAC', 'Electrical', 'Plumbing', 'General Maintenance', 'Fire Protection', 'Civil Works'];

async function upsert(table: string, data: Record<string, unknown>, matchKeys: string[]) {
  const { data: existing, error: findErr } = await admin
    .from(table)
    .select('id')
    .match(Object.fromEntries(matchKeys.map(k => [k, data[k]])))
    .limit(1)
    .single();

  if (findErr && findErr.code !== 'PGRST116') {
    // PGRST116 = no rows returned, that's fine
    console.error(`  [ERROR] Finding ${table}:`, findErr.message);
    return null;
  }

  if (existing) {
    console.log(`  ✓ ${table} "${matchKeys.map(k => data[k]).join(', ')}" already exists (id: ${existing.id})`);
    return existing.id;
  }

  const { data: created, error } = await admin.from(table).insert(data).select('id').single();
  if (error) {
    console.error(`  ✗ Failed to create ${table}:`, error.message);
    return null;
  }
  console.log(`  ✓ Created ${table}: ${JSON.stringify(matchKeys.map(k => data[k]))} (id: ${created.id})`);
  return created.id;
}

async function main() {
  console.log('Seeding MOHD.HMS ENTERPRISE database...\n');

  // 1. Tenant
  console.log('1. Creating tenant...');
  const tenantId = await upsert('Tenant', {
    name: 'MOHD.HMS ENTERPRISE',
    domain: TENANT_DOMAIN,
    plan: 'enterprise',
    maxUsers: 999,
    isActive: true,
  }, ['domain']);

  if (!tenantId) {
    console.error('FATAL: Could not create tenant. Aborting.');
    process.exit(1);
  }

  // 2. System Settings
  console.log('\n2. Creating system settings...');
  for (const s of SETTINGS) {
    await upsert('SystemSetting', { key: s.key, value: s.value }, ['key']);
  }

  // 3. Departments
  console.log('\n3. Creating departments...');
  for (const name of DEPARTMENTS) {
    await upsert('Department', { tenantId, name, isActive: true }, ['tenantId', 'name']);
  }

  // 4. Service Categories
  console.log('\n4. Creating service categories...');
  for (let i = 0; i < SERVICE_CATEGORIES.length; i++) {
    await upsert('ServiceCategory', {
      tenantId,
      name: SERVICE_CATEGORIES[i],
      sortOrder: i,
      isActive: true,
    }, ['tenantId', 'name']);
  }

  // 5. Summary
  console.log('\n--- Seed Complete ---');
  const { count: tenantCount } = await admin.from('Tenant').select('*', { count: 'exact', head: true });
  const { count: settingsCount } = await admin.from('SystemSetting').select('*', { count: 'exact', head: true });
  const { count: deptCount } = await admin.from('Department').select('*', { count: 'exact', head: true });
  const { count: catCount } = await admin.from('ServiceCategory').select('*', { count: 'exact', head: true });
  const { count: userCount } = await admin.from('User').select('*', { count: 'exact', head: true });

  console.log(`Tenants: ${tenantCount}`);
  console.log(`System Settings: ${settingsCount}`);
  console.log(`Departments: ${deptCount}`);
  console.log(`Service Categories: ${catCount}`);
  console.log(`Users: ${userCount}`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});