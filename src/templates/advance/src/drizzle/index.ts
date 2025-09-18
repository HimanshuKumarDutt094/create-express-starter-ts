import { env } from "@/utils/env.js";
import { drizzle } from "drizzle-orm/better-sqlite3";
// import { drizzle } from "drizzle-orm/neon-http";
// import { neon } from "@neondatabase/serverless";

// const sql = neon(env.DATABASE_URL!);
// export const db = drizzle({ client: sql });

// You can specify any property from the better-sqlite3 connection options
export const db = drizzle({ connection: { source: env.DATABASE_URL } });
