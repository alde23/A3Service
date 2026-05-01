import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env") });

console.log("DIRECT_URL:", process.env.DIRECT_URL?.substring(0, 20));

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});