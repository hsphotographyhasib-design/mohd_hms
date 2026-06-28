import { config } from "dotenv";
config({ override: true });
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: "app.example.com" },
    update: {},
    create: {
      name: "Demo Company",
      domain: "app.example.com",
      email: "admin@example.com",
      phone: "+1234567890",
      plan: "professional",
    },
  });

  // Seed a default user (compound unique: tenantId_email)
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@example.com" } },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
      tenantId: tenant.id,
      passwordHash: "$2b$10$placeholder_hash_replace_me",
      isActive: true,
      profileCompleted: true,
    },
  });

  // Seed a department
  await prisma.department.upsert({
    where: { id: "dept-general" },
    update: {},
    create: {
      id: "dept-general",
      name: "General Operations",
      tenantId: tenant.id,
    },
  });

  console.log("✅ Seed complete — tenant, user, and department created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });