import { db } from "@/drizzle/index.js";
import { env } from "@/utils/env.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// Better Auth server instance configured to use Drizzle (SQLite via better-sqlite3)
// NOTE: Ensure you create the required tables. See Better Auth docs:
// https://www.better-auth.com/docs/installation and /docs/adapters/drizzle
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    // If you generate the schema with Better Auth CLI, remove custom mapping.
    // You can also pass { usePlural: true } if you pluralize table names.
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    },
  },
});
