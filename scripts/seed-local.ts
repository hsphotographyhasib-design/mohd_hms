import { Database } from 'bun:sqlite';
import { hash } from 'bcryptjs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const dbPath = resolve(process.cwd(), 'db/dev.db');
const db = new Database(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = OFF');

console.log('Seeding database:', dbPath);

// 1. Tenant
const tenantId = randomUUID();
db.prepare(`INSERT OR IGNORE INTO Tenant (id, name, domain, plan, maxUsers, isActive, createdAt, updatedAt)
  VALUES (?, 'MOHD.HMS ENTERPRISE', 'mohd-hms.facilitypro.com', 'enterprise', 999, 1, datetime('now'), datetime('now'))`).run(tenantId);
console.log('✓ Tenant');

// 2. Departments
const depts = ['Operations', 'Maintenance', 'Electrical', 'HVAC', 'Plumbing'];
const insertDept = db.prepare(`INSERT INTO Department (id, tenantId, name, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))`);
for (const name of depts) insertDept.run(randomUUID(), tenantId, name);
console.log('✓ Departments:', depts.length);

// 3. Admin User
const passwordHash = await hash('admin123', 12);
const userId = randomUUID();
db.prepare(`INSERT INTO "User" (id, tenantId, email, passwordHash, name, role, employeeNumber, isActive, profileCompleted, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, 'Super Admin', 'super_admin', 'EMP001', 1, 1, datetime('now'), datetime('now'))`).run(userId, tenantId, 'admin@mohd-hms.com', passwordHash);
console.log('✓ Admin User: admin@mohd-hms.com / admin123');

// 4. Sample customer
const customerId = randomUUID();
db.prepare(`INSERT INTO Customer (id, tenantId, name, phone, customerNumber, isActive, createdAt, updatedAt)
  VALUES (?, ?, 'Test Facility', '+60123456789', 'CUST001', 1, datetime('now'), datetime('now'))`).run(customerId, tenantId);
console.log('✓ Sample Customer');

db.exec('PRAGMA foreign_keys = ON');
console.log('\n=== Seed Complete ===');
db.close();
