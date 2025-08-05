import { env } from "@/utils/env.js";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-out",
  schema: "./src/drizzle/src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL!,
  },
});
