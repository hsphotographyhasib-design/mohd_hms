import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Only load .env if it exists (Vercel sets env vars via dashboard, not .env file)
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  config({ path: envPath, override: false });
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});