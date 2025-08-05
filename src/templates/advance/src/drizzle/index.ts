import { env } from "@/utils/env.js";
import { drizzle } from "drizzle-orm/better-sqlite3";

// You can specify any property from the better-sqlite3 connection options
export const db = drizzle({ connection: { source: env.DATABASE_URL } });
