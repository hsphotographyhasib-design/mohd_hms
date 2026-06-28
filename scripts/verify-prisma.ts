import { config } from "dotenv";
config({ override: true });
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantCount = await prisma.tenant.count();
  const userCount = await prisma.user.count();
  const departmentCount = await prisma.department.count();

  console.log(`Tenants: ${tenantCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`Departments: ${departmentCount}`);
  console.log("✅ Connected.");
}

main()
  .catch((e) => {
    console.error("❌ Connection failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });