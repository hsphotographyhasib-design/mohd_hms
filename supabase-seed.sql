-- ============================================================================
-- Seed Data for MOHD.HMS ENTERPRISE
-- Run this AFTER supabase-schema.sql
-- ============================================================================

BEGIN;

-- ============ 1. DEFAULT TENANT ============
INSERT INTO "Tenant" ("id", "name", "domain", "address", "phone", "email", "isActive", "plan", "maxUsers", "createdAt", "updatedAt")
VALUES (
  'tenant_default_001',
  'MOHD HMS Enterprise',
  'mohd-hms.supabase.co',
  'Brunei Darussalam',
  '+673-000-0000',
  'admin@mohdhms.com',
  true,
  'enterprise',
  500,
  now(),
  now()
)
ON CONFLICT ("id") DO NOTHING;

-- ============ 2. DEPARTMENTS ============
INSERT INTO "Department" ("id", "tenantId", "name", "description", "isActive", "createdAt", "updatedAt") VALUES
('dept_001', 'tenant_default_001', 'Management', 'Senior management and administration', true, now(), now()),
('dept_002', 'tenant_default_001', 'Operations', 'Field operations and service delivery', true, now(), now()),
('dept_003', 'tenant_default_001', 'Finance', 'Accounting, billing and financial management', true, now(), now()),
('dept_004', 'tenant_default_001', 'Human Resources', 'Employee management and HR operations', true, now(), now()),
('dept_005', 'tenant_default_001', 'Technical Services', 'Technical support and engineering', true, now(), now())
ON CONFLICT ("id") DO NOTHING;

-- ============ 3. INVENTORY CATEGORIES ============
INSERT INTO "InventoryCategory" ("id", "tenantId", "name", "code", "description", "displayOrder", "isActive", "createdAt", "updatedAt") VALUES
('ic_001', 'tenant_default_001', 'HVAC Parts', 'HVAC', 'Air conditioning and ventilation parts', 1, true, now(), now()),
('ic_002', 'tenant_default_001', 'Electrical Components', 'ELEC', 'Wiring, switches, breakers and electrical parts', 2, true, now(), now()),
('ic_003', 'tenant_default_001', 'Plumbing Supplies', 'PLMB', 'Pipes, fittings, valves and plumbing materials', 3, true, now(), now()),
('ic_004', 'tenant_default_001', 'Generator Parts', 'GEN', 'Generator components and spare parts', 4, true, now(), now()),
('ic_005', 'tenant_default_001', 'Tools & Equipment', 'TOOL', 'Hand tools, power tools and test equipment', 5, true, now(), now()),
('ic_006', 'tenant_default_001', 'Safety Equipment', 'SAFETY', 'PPE, safety gear and protective equipment', 6, true, now(), now())
ON CONFLICT ("id") DO NOTHING;

-- ============ 4. DEFAULT WAREHOUSE ============
INSERT INTO "Warehouse" ("id", "tenantId", "name", "code", "address", "isActive", "createdAt", "updatedAt") VALUES
('wh_001', 'tenant_default_001', 'Main Warehouse', 'WH-MAIN', 'Main storage facility', true, now(), now())
ON CONFLICT ("id") DO NOTHING;

COMMIT;