/**
 * SQLite-compatible seed script.
 * Usage: bun run prisma/seed-sqlite.ts
 */
import { config } from "dotenv";
config({ override: true });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "file:./db/custom.db";
console.log(`[Seed] Using database: ${dbUrl}`);

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const NOW = new Date();

async function main() {
  // 1. Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: "demo.facilitypro.com" },
    update: {},
    create: {
      id: "tenant-demo",
      name: "FacilityPro Demo",
      domain: "demo.facilitypro.com",
      email: "admin@facilitypro.com",
      phone: "+6738888888",
      plan: "professional",
      address: "Brunei Darussalam",
      createdAt: NOW,
      updatedAt: NOW,
    },
  });
  console.log(`[Seed] Tenant: ${tenant.id} (${tenant.name})`);

  // 2. Create departments FIRST (foreign key for users)
  const deptNames = [
    "General Operations",
    "Maintenance",
    "Electrical",
    "Plumbing",
    "HVAC",
    "Housekeeping",
    "Security",
    "IT Support",
  ];

  for (const name of deptNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.department.upsert({
      where: { id: `dept-${slug}` },
      update: {},
      create: { id: `dept-${slug}`, name, tenantId: tenant.id, createdAt: NOW, updatedAt: NOW },
    });
  }
  console.log(`[Seed] Created ${deptNames.length} departments`);

  // 3. Create demo users with known password: Admin@123
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const demoUsers = [
    { id: "user-admin",      email: "admin@facilitypro.com",      name: "Admin User",       role: "super_admin", deptId: "dept-general-operations" },
    { id: "user-manager",    email: "manager@facilitypro.com",    name: "Manager User",     role: "manager",     deptId: "dept-general-operations" },
    { id: "user-supervisor", email: "supervisor@facilitypro.com", name: "Supervisor User",   role: "supervisor",  deptId: "dept-maintenance" },
    { id: "user-tech1",      email: "tech1@facilitypro.com",      name: "Technician One",    role: "technician",  deptId: "dept-maintenance" },
    { id: "user-finance",    email: "finance@facilitypro.com",    name: "Finance User",      role: "finance",     deptId: "dept-general-operations" },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: { passwordHash, departmentId: u.deptId, updatedAt: NOW },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        tenantId: tenant.id,
        departmentId: u.deptId,
        passwordHash,
        isActive: true,
        profileCompleted: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    console.log(`[Seed] User: ${u.id} (${u.email}) — ${u.role}`);
  }

  // 4. Create inventory categories
  const invCategories = [
    "Electrical Components",
    "Plumbing Supplies",
    "HVAC Parts",
    "Safety Equipment",
    "Cleaning Supplies",
    "Tools & Hardware",
    "Office Supplies",
    "IT Equipment",
  ];

  for (const name of invCategories) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.inventoryCategory.upsert({
      where: { id: `invcat-${slug}` },
      update: {},
      create: { id: `invcat-${slug}`, name, tenantId: tenant.id, createdAt: NOW, updatedAt: NOW },
    });
  }
  console.log(`[Seed] Created ${invCategories.length} inventory categories`);

  // 5. Create a warehouse
  await prisma.warehouse.upsert({
    where: { id: "wh-main" },
    update: {},
    create: {
      id: "wh-main",
      name: "Main Warehouse",
      code: "WH-001",
      type: "main",
      tenantId: tenant.id,
      createdAt: NOW,
      updatedAt: NOW,
    },
  });
  console.log(`[Seed] Created 1 warehouse`);

  console.log("\n✅ Seed complete — demo accounts (password: Admin@123):");
  console.log("   admin@facilitypro.com     — Super Admin");
  console.log("   manager@facilitypro.com   — Manager");
  console.log("   supervisor@facilitypro.com— Supervisor");
  console.log("   tech1@facilitypro.com     — Technician");
  console.log("   finance@facilitypro.com   — Finance");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });