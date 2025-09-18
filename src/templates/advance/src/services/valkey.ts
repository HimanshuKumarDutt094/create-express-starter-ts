/* eslint-disable @typescript-eslint/no-explicit-any */
import { GlideClient, TimeUnit } from "@valkey/valkey-glide";
import type express from "express";
import { ZodType, z } from "zod";
import { createLogger } from "./logger";

const logger = createLogger("Valkey");

type SetOptions = {
  ex?: number;
  px?: number;
  nx?: boolean;
  xx?: boolean;
  keepttl?: boolean;
};

/**
 * Valkey/Glide-backed typed store.
 * Stores values as { __sv: number, payload: T } and validates with a Zod schema.
 */

export type StoreOpts = {
  prefix?: string;
  defaultTTLSeconds?: number | null; // null = no expiry by default
  throwOnParse?: boolean; // throw if schema.parse fails on get
  schemaVersion?: number; // a small integer
  deleteCorrupt?: boolean; // delete keys that fail parse on get
  keySerializer?: (k: string) => string;
};

export class ValkeyGlideStore<T> {
  private client: GlideClient;
  private schema: ZodType<T>;
  private prefix: string;
  private defaultTTL: number | null;
  private throwOnParse: boolean;
  private schemaVersion: number;
  private deleteCorrupt: boolean;
  private keySerializer: (k: string) => string;

  private closed = false;

  private constructor(opts: {
    client: GlideClient;
    schema: ZodType<T>;
    options?: Partial<StoreOpts>;
  }) {
    this.client = opts.client;
    this.schema = opts.schema;
    this.prefix = opts.options?.prefix ?? "app:";
    this.defaultTTL = opts.options?.defaultTTLSeconds ?? null;
    this.throwOnParse = !!opts.options?.throwOnParse;
    this.schemaVersion = opts.options?.schemaVersion ?? 1;
    this.deleteCorrupt = opts.options?.deleteCorrupt ?? true;
    this.keySerializer = opts.options?.keySerializer ?? ((k) => `${this.prefix}${k}`);
  }

  // factory to create client from env (convenience for Express)
  static async createFromEnv<T>(schema: ZodType<T>, options?: Partial<StoreOpts>) {
    // Expect VALKEY_URL or VALKEY_HOST:PORT and optional TLS/auth
    const host = process.env.VALKEY_HOST ?? "127.0.0.1";
    const port = process.env.VALKEY_PORT ? Number(process.env.VALKEY_PORT) : 6379;
    const useTLS = process.env.VALKEY_TLS === "true";
    const username = process.env.VALKEY_USERNAME;
    const password = process.env.VALKEY_PASSWORD;

    logger.info("Creating Valkey client", {
      host,
      port,
      useTLS,
      hasUsername: !!username,
      hasPassword: !!password,
      nodeEnv: process.env.NODE_ENV,
    });

    const client = await GlideClient.createClient({
      addresses: [
        {
          host,
          port,
        },
      ],
      useTLS,
      requestTimeout: 5000,
      ...(username && password
        ? {
            credentials: {
              username,
              password,
            },
          }
        : {}),
    });
    try {
      await client.set("test-connection", "test-value");
      const testVal = await client.get("test-connection");
      logger.debug("Connection test successful", { testValue: testVal });
    } catch (error) {
      logger.error("Connection test failed", { error });
      throw new Error(
        `Failed to connect to Valkey: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return new ValkeyGlideStore<T>({ client, schema, options });
  }

  static fromClient<T>(client: GlideClient, schema: ZodType<T>, options?: Partial<StoreOpts>) {
    return new ValkeyGlideStore<T>({ client, schema, options });
  }

  private sKey(k: string) {
    return this.keySerializer(k);
  }
  private wrap(value: T) {
    return {
      __sv: this.schemaVersion,
      payload: value,
    };
  }
  async set(key: string, value: T, opts?: { ttlSeconds?: number | null }) {
    if (this.closed) throw new Error("store closed");
    const parsed = this.schema.parse(value); // throws on invalid
    const envelope = JSON.stringify(this.wrap(parsed));
    const ttl = opts?.ttlSeconds ?? this.defaultTTL;
    const cacheKey = this.sKey(key);

    logger.debug(`Setting key: ${cacheKey}`, { key: cacheKey, ttl });

    try {
      if (ttl != null) {
        await this.client.set(cacheKey, envelope);
        await this.client.expire(cacheKey, Math.floor(ttl));
        logger.debug(`Successfully set key with TTL`, { key: cacheKey, ttl });
      } else {
        await this.client.set(cacheKey, envelope);
        logger.debug(`Successfully set key without TTL`, { key: cacheKey });
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[VALKEY] Error setting key ${cacheKey}:`, errorMessage);
      logger.error("Full error:", error);
      throw error;
    }
  }

  async get(key: string): Promise<T | null> {
    if (this.closed) throw new Error("store closed");
    const cacheKey = this.sKey(key);
    logger.debug(`Getting key`, { key: cacheKey });

    try {
      const raw: string | null = await (this.client as any).get(cacheKey);
      if (raw == null) {
        logger.debug(`Cache miss`, { key: cacheKey });
        return null;
      }
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null || !('payload' in parsed)) {
          logger.error(`[VALKEY] Invalid cache format for key: ${cacheKey}`);
          throw new Error('envelope-mismatch');
        }
        const payload = parsed.payload;
        const validated = this.schema.parse(payload);
        logger.debug(`Successfully retrieved and validated key`, { key: cacheKey });
        return validated;
      } catch (parseError) {
        logger.error(`[VALKEY] Error parsing cache data for key ${cacheKey}:`, parseError);
        if (this.deleteCorrupt) {
          try {
            logger.warn(`Deleting corrupted cache entry`, { key: cacheKey });
            await (this.client as any).del(cacheKey);
          } catch (delError) {
            logger.error(`[VALKEY] Failed to delete corrupted key ${cacheKey}:`, delError);
          }
        }
        if (this.throwOnParse) throw parseError;
        return null;
      }
    } catch (error) {
      logger.error(`[VALKEY] Error getting key ${cacheKey}:`, error);
      throw error;
    }
  }

  async del(key: string) {
    return (this.client as any).del(this.sKey(key));
  }

  async setIfAbsent(key: string, value: T, ttlSeconds?: number | null) {
    const parsed = this.schema.parse(value);
    const envelope = JSON.stringify(this.wrap(parsed));
    if (ttlSeconds != null) {
      try {
        const setOpts: SetOptions = {
          // some GLIDE wrappers have only conditional flags; using expiry + condition NX if supported
          expiry: { type: TimeUnit.Seconds, count: Math.floor(ttlSeconds) },
          onlyIfNotExists: true,
        } as any;
        const res = await (this.client as any).set(this.sKey(key), envelope, setOpts);
        return res === "OK" || res === true;
      } catch (e) {
        // fallback: SETNX then EXPIRE
      }
    }
    const nx = await (this.client as any).setnx(this.sKey(key), envelope);
    if (nx === 1 && ttlSeconds != null) {
      await (this.client as any).expire(this.sKey(key), Math.floor(ttlSeconds));
    }
    return nx === 1;
  }

  async getOrSet(key: string, factory: () => Promise<T>, opts?: { ttlSeconds?: number | null }) {
    const existing = await this.get(key);
    if (existing != null) return existing;
    const val = await factory();
    await this.set(key, val, { ttlSeconds: opts?.ttlSeconds });
    return val;
  }

  async ttl(key: string) {
    return (this.client as any).ttl(this.sKey(key));
  }

  async incrBy(key: string, amount = 1) {
    try {
      const res = await (this.client as any).incrby(this.sKey(key), amount);
      return typeof res === "number" ? res : Number(res);
    } catch (error) {
      logger.error(`[VALKEY] incrBy error for key ${this.sKey(key)}:`, error);
      throw error;
    }
  }

  async expire(key: string, seconds: number) {
    try {
      return await (this.client as any).expire(this.sKey(key), Math.floor(seconds));
    } catch (error) {
      logger.error(`[VALKEY] expire error for key ${this.sKey(key)}:`, error);
      throw error;
    }
  }

  expressMiddleware(locKey = "valkeyStore") {
    return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!req.app.locals) {
        logger.warn("expressMiddleware: req.app.locals is not defined");
        req.app.locals = {};
      }
      req.app.locals[locKey] = this;
      next();
    };
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    try {
      await (this.client as any).quit?.();
      await (this.client as any).close?.();
    } catch {}
  }
}

// small helper type for convenience when importing in other files
export type InferSchema<T extends ZodType<any>> = z.infer<T>;
export default ValkeyGlideStore;
