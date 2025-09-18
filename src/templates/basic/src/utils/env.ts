import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
export const env = createEnv({
  server: {
    PORT: z.string().default("3000"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnvStrict: {
    PORT: process.env.port,
    NODE_ENV: process.env.NODE_ENV,
  },
});
