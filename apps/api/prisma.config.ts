import { config } from "dotenv";
import { join } from "path";

import { existsSync } from "fs";

let envPath = join(process.cwd(), ".env");
if (!existsSync(envPath)) {
  envPath = join(process.cwd(), "../../.env");
}
config({ path: envPath });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});