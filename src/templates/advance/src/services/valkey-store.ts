import { ZodType } from "zod";
import { env } from "@/utils/env.js";
import { userSchema, type User } from "../api/v1/schemas/user.schema.js";
import { ValkeyGlideStore } from "./valkey.js";
import { createLogger } from "./logger";

const logger = createLogger("ValkeyStore");

// Initialize Valkey store with environment variables
const createStore = async <T>({
  schema,
  prefix,
  defaultTTLSeconds,
}: {
  schema: ZodType<T>;
  prefix: string;
  defaultTTLSeconds?: number;
}) => {
  try {
    const store = await ValkeyGlideStore.createFromEnv(schema, {
      prefix: `${env.NODE_ENV}:${prefix}`,
      defaultTTLSeconds,
    });
    logger.info(`Store initialized`, { prefix });
    return store;
  } catch (error) {
    logger.error(`Failed to initialize store`, { prefix, error });
    throw error;
  }
};

// Create user store instance
export const userStore = await createStore({
  schema: userSchema.omit({ id: true }),
  prefix: "user:",
  defaultTTLSeconds: env.USER_CACHE_TTL ? parseInt(env.USER_CACHE_TTL, 10) : 300,
});

// Export store types for type safety
export type { User } from "../api/v1/schemas/user.schema.js";

// For backward compatibility
export async function initStores() {
  console.log("Stores are now auto-initialized on import");
}

export interface Stores {
  userStore: ValkeyGlideStore<Omit<User, "id">>;
}
