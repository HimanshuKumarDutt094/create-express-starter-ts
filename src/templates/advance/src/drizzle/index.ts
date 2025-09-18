import { env } from "@/utils/env.js";
import { drizzle } from "drizzle-orm/better-sqlite3";

export const db = drizzle({ connection: { source: env.DATABASE_URL } });
