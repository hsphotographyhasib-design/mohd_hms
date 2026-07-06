-- ============================================================================
-- Seed Data for MOHD.HMS ENTERPRISE
-- Run this AFTER supabase-schema.sql
-- ============================================================================

BEGIN;

-- ============ 1. DEFAULT TENANT ============
INSERT INTO "Tenant" ("id", "name", "domain", "logo", "address", "phone", "email", "isActive", "plan", "maxUsers", "createdAt", "updatedAt")
VALUES (
  'tenant_default_001',
  'MOHD HMS Enterprise',
  'mohd-hms.supabase.co',
  NULL,
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

-- ============ 2. SYSTEM SETTINGS ============
INSERT INTO "SystemSetting" ("id", "tenantId", "key", "value", "description", "createdAt", "updatedAt") VALUES
('ss_001', 'tenant_default_001', 'company_name', 'MOHD HMS Enterprise', 'Company display name', now(), now()),
('ss_002', 'tenant_default_001', 'company_logo', NULL, 'Company logo URL', now(), now()),
('ss_003', 'tenant_default_001', 'default_currency', 'BND', 'Default currency for invoices', now(), now()),
('ss_004', 'tenant_default_001', 'tax_rate', '0', 'Default tax rate (%)', now(), now()),
('ss_005', 'tenant_default_001', 'invoice_prefix', 'INV/HMS', 'Invoice number prefix', now(), now()),
('ss_006', 'tenant_default_001', 'quotation_prefix', 'QTN/HMS', 'Quotation number prefix', now(), now()),
('ss_007', 'tenant_default_001', 'work_order_prefix', 'WO/HMS', 'Work order number prefix', now(), now()),
('ss_008', 'tenant_default_001', 'complaint_sla_minutes', '15', 'SLA for technician acceptance (minutes)', now(), now())
ON CONFLICT ("id") DO NOTHING;

-- ============ 3. DEPARTMENTS ============
INSERT INTO "Department" ("id", "tenantId", "name", "description", "headId", "isActive", "createdAt", "updatedAt") VALUES
('dept_001', 'tenant_default_001', 'Management', 'Senior management and administration', NULL, true, now(), now()),
('dept_002', 'tenant_default_001', 'Operations', 'Field operations and service delivery', NULL, true, now(), now()),
('dept_003', 'tenant_default_001', 'Finance', 'Accounting, billing and financial management', NULL, true, now(), now()),
('dept_004', 'tenant_default_001', 'Human Resources', 'Employee management and HR operations', NULL, true, now(), now()),
('dept_005', 'tenant_default_001', 'Technical Services', 'Technical support and engineering', NULL, true, now(), now())
ON CONFLICT ("id") DO NOTHING;

-- ============ 4. SERVICE CATEGORIES ============
INSERT INTO "ServiceCategory" ("id", "tenantId", "name", "code", "description", "isActive", "displayOrder", "createdAt", "updatedAt") VALUES
('sc_001', 'tenant_default_001', 'HVAC', 'HVAC', 'Heating, Ventilation & Air Conditioning services', true, 1, now(), now()),
('sc_002', 'tenant_default_001', 'Electrical', 'ELEC', 'Electrical installation, maintenance & repair', true, 2, now(), now()),
('sc_003', 'tenant_default_001', 'Plumbing', 'PLMB', 'Plumbing and piping systems', true, 3, now(), now()),
('sc_004', 'tenant_default_001', 'Generator', 'GEN', 'Generator installation and maintenance', true, 4, now(), now()),
('sc_005', 'tenant_default_001', 'Mechanical', 'MECH', 'Mechanical systems and equipment', true, 5, now(), now()),
('sc_006', 'tenant_default_001', 'Fire Protection', 'FIRE', 'Fire alarm and suppression systems', true, 6, now(), now())
ON CONFLICT ("id") DO NOTHING;

-- ============ 5. INVENTORY CATEGORIES ============
INSERT INTO "InventoryCategory" ("id", "tenantId", "name", "code", "description", "displayOrder", "isActive", "createdAt", "updatedAt") VALUES
('ic_001', 'tenant_default_001', 'HVAC Parts', 'HVAC', 'Air conditioning and ventilation parts', 1, true, now(), now()),
('ic_002', 'tenant_default_001', 'Electrical Components', 'ELEC', 'Wiring, switches, breakers and electrical parts', 2, true, now(), now()),
('ic_003', 'tenant_default_001', 'Plumbing Supplies', 'PLMB', 'Pipes, fittings, valves and plumbing materials', 3, true, now(), now()),
('ic_004', 'tenant_default_001', 'Generator Parts', 'GEN', 'Generator components and spare parts', 4, true, now(), now()),
('ic_005', 'tenant_default_001', 'Tools & Equipment', 'TOOL', 'Hand tools, power tools and test equipment', 5, true, now(), now()),
('ic_006', 'tenant_default_001', 'Safety Equipment', 'SAFETY', 'PPE, safety gear and protective equipment', 6, true, now(), now())
ON CONFLICT ("id") DO NOTHING;

-- ============ 6. DEFAULT WAREHOUSE ============
INSERT INTO "Warehouse" ("id", "tenantId", "name", "code", "address", "managerId", "isActive", "createdAt", "updatedAt") VALUES
('wh_001', 'tenant_default_001', 'Main Warehouse', 'WH-MAIN', 'Main storage facility', NULL, true, now(), now())
ON CONFLICT ("id") DO NOTHING;

COMMIT;