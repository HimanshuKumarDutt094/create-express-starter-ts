import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
export const env = createEnv({
  server: {
    PORT: z.string().default("3000"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string().min(1, {
      message: "AUTH_SECRET is required for Better Auth",
    }),
    // Comma-separated list of allowed origins for CORS, e.g. "http://localhost:5173,https://example.com"
    CORS_ORIGINS: z.string().optional().default(""),
    BETTER_AUTH_URL: z.string(),
    BETTER_AUTH_GITHUB_CLIENT_ID: z.string().nonempty(),
    BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string().nonempty(),
    // Cache configuration
    USER_CACHE_TTL: z.string().default("300"), // 5 minutes in seconds
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  },
  runtimeEnvStrict: {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_GITHUB_CLIENT_ID: process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
    BETTER_AUTH_GITHUB_CLIENT_SECRET: process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    USER_CACHE_TTL: process.env.USER_CACHE_TTL,
    LOG_LEVEL: process.env.LOG_LEVEL,
  },
});
