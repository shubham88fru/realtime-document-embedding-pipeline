import { defineConfig } from "prisma/config";

import { loadEnvFiles } from "./scripts/load-env-files";

// Prisma 7 does not load .env files on its own.
loadEnvFiles();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
