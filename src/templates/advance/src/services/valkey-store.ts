import { env } from "@/utils/env.js";
import { ZodType } from "zod";
import { userSchema, type User } from "../api/v1/schemas/user.schema.js";
import { createLogger } from "./logger";
import { ValkeyGlideStore } from "./valkey.js";

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

// Rate limit store: uses a minimal schema (we store raw numbers as strings in Valkey)
// We create a lightweight wrapper that uses the same Valkey client to perform atomic incr/expire operations.
// To get access to a client, we create a store with a trivial schema and then use its methods.
const counterSchema = {} as any;
export const rateLimitStore = await (async () => {
  const s = await ValkeyGlideStore.createFromEnv(counterSchema as any, {
    prefix: `${env.NODE_ENV}:ratelimit:`,
    defaultTTLSeconds: null,
  }).catch((err) => {
    logger.warn("Failed to initialize rateLimitStore, falling back to in-memory counters", { err });
    return null as any;
  });
  return s as ValkeyGlideStore<any> | null;
})();

// Export store types for type safety
export type { User } from "../api/v1/schemas/user.schema.js";

// For backward compatibility
export async function initStores() {
  console.log("Stores are now auto-initialized on import");
}

export interface Stores {
  userStore: ValkeyGlideStore<Omit<User, "id">>;
  rateLimitStore?: ValkeyGlideStore<any> | null;
}
