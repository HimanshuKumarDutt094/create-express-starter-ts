/* eslint-disable @typescript-eslint/no-explicit-any */
import { GlideClient, GlideString, SetOptions, TimeUnit } from "@valkey/valkey-glide";
import { ZodType, z } from "zod";
import { createLogger } from "./logger";

const logger = createLogger("Valkey");

// (removed unused SetOptions; Glide client options vary by version)

/**
 * Valkey/Glide-backed typed store.
 * Stores values as { __sv: number, payload: T } and validates with a Zod schema.
 */

export interface StoreOpts {
  prefix?: string;
  defaultTTLSeconds?: number | null; // null = no expiry by default
  throwOnParse?: boolean; // throw if schema.parse fails on get
  schemaVersion?: number; // a small integer
  deleteCorrupt?: boolean; // delete keys that fail parse on get
  // Allow serializer to return a GlideString (string | Buffer) if desired
  keySerializer?: (k: string) => GlideString;
}

export class ValkeyGlideStore<T> {
  private client: GlideClient;
  private schema: ZodType<T>;
  private prefix: string;
  private defaultTTL: number | null;
  private throwOnParse: boolean;
  private schemaVersion: number;
  private deleteCorrupt: boolean;
  private keySerializer: (k: string) => GlideString;

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
    this.keySerializer =
      opts.options?.keySerializer ?? ((k) => `${this.prefix}${k}` as GlideString);
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

  private sKey(k: string): GlideString {
    return this.keySerializer(k);
  }

  // Convert a GlideString (string | Buffer) to UTF-8 string safely
  private glideToUtf8(s: GlideString | null): string {
    if (s == null) return "";
    return typeof s === "string" ? s : s.toString();
  }

  private isEnvelope(v: unknown): v is { __sv: number; payload: unknown } {
    return typeof v === "object" && v !== null && "__sv" in (v as any) && "payload" in (v as any);
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
    const cacheKeyStr = this.glideToUtf8(cacheKey);

    logger.debug(`Setting key: ${cacheKeyStr}`, { key: cacheKeyStr, ttl });

    try {
      if (ttl != null) {
        try {
          // prefer atomic set with expiry when supported
          const setOpts: SetOptions = {
            expiry: { type: TimeUnit.Seconds, count: Math.floor(ttl) },
          } as SetOptions;
          await this.client.set(this.sKey(key), envelope, setOpts);
          logger.debug(`Successfully set key with TTL (atomic)`, { key: cacheKeyStr, ttl });
        } catch (_e) {
          // fallback to set + expire when atomic set with expiry isn't supported
          await this.client.set(this.sKey(key), envelope);
          await this.client.expire(this.sKey(key), Math.floor(ttl));
          logger.debug(`Successfully set key with TTL (fallback)`, { key: cacheKeyStr, ttl });
        }
      } else {
        await this.client.set(this.sKey(key), envelope);
        logger.debug(`Successfully set key without TTL`, { key: cacheKeyStr });
      }
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[VALKEY] Error setting key ${cacheKeyStr}: ${errorMessage}`);
      logger.debug("Full error object:", { error });
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  }

  async get(key: string): Promise<T | null> {
    if (this.closed) throw new Error("store closed");
    const cacheKey = this.sKey(key);
    const cacheKeyStr = this.glideToUtf8(cacheKey);
    logger.debug(`Getting key`, { key: cacheKeyStr });

    try {
      const raw: GlideString | null = await this.client.get(cacheKey);
      if (raw == null) {
        logger.debug(`Cache miss`, { key: cacheKeyStr });
        return null;
      }
      const s = this.glideToUtf8(raw);
      try {
        const parsed: unknown = JSON.parse(s);
        if (!this.isEnvelope(parsed)) {
          logger.error(`[VALKEY] Invalid cache format for key: ${cacheKeyStr}`);
          throw new Error("envelope-mismatch");
        }
        const payload = parsed.payload;
        const result = this.schema.safeParse(payload);
        if (!result.success) {
          logger.error(`[VALKEY] Schema validation failed for key ${cacheKeyStr}:`, result.error);
          if (this.deleteCorrupt) {
            try {
              logger.warn(`Deleting corrupted cache entry`, { key: cacheKeyStr });
              await this.client.del([this.sKey(key)]);
            } catch (delError) {
              logger.error(`[VALKEY] Failed to delete corrupted key ${cacheKeyStr}:`, delError);
            }
          }
          if (this.throwOnParse) throw result.error;
          return null;
        }
        logger.debug(`Successfully retrieved and validated key`, { key: cacheKeyStr });
        return result.data;
      } catch (parseError: unknown) {
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        logger.error(`[VALKEY] Error parsing cache data for key ${cacheKeyStr}: ${msg}`);
        if (this.deleteCorrupt) {
          try {
            logger.warn(`Deleting corrupted cache entry`, { key: cacheKeyStr });
            await this.client.del([this.sKey(key)]);
          } catch (delError: unknown) {
            const dmsg = delError instanceof Error ? delError.message : String(delError);
            logger.error(`[VALKEY] Failed to delete corrupted key ${cacheKeyStr}: ${dmsg}`);
          }
        }
        if (this.throwOnParse) {
          if (parseError instanceof Error) throw parseError;
          throw new Error(String(parseError));
        }
        return null;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[VALKEY] Error getting key ${cacheKeyStr}: ${msg}`);
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  }

  async del(key: string) {
    return this.client.del([this.sKey(key)]);
  }

  async setIfAbsent(key: string, value: T, ttlSeconds?: number | null) {
    const parsed = this.schema.parse(value);
    const envelope = JSON.stringify(this.wrap(parsed));
    if (ttlSeconds != null) {
      try {
        const setOpts: SetOptions = {
          expiry: { type: TimeUnit.Seconds, count: Math.floor(ttlSeconds) },
          onlyIfNotExists: true,
        } as SetOptions;
        const res = await this.client.set(this.sKey(key), envelope, setOpts);
        if (res == null) return false;
        if (typeof res === "string") return res === "OK";
        if (typeof res === "boolean") return res;
        if (typeof res === "number") return res === 1;
        if (Buffer.isBuffer(res)) return res.toString() === "OK";
        return !!res;
      } catch (_e) {
        // fallback to setnx then expire
      }
    }
    // Glide client does not expose a single-key `setnx`; use `msetnx` with a single entry
    const keyStr = this.glideToUtf8(this.sKey(key));
    const nxRes = await this.client.msetnx({ [keyStr]: envelope });
    if (nxRes && ttlSeconds != null) {
      await this.client.expire(this.sKey(key), Math.floor(ttlSeconds));
    }
    return nxRes;
  }

  async getOrSet(key: string, factory: () => Promise<T>, opts?: { ttlSeconds?: number | null }) {
    const existing = await this.get(key);
    if (existing != null) return existing;
    const val = await factory();
    await this.set(key, val, { ttlSeconds: opts?.ttlSeconds });
    return val;
  }

  async ttl(key: string) {
    return this.client.ttl(this.sKey(key));
  }

  async incrBy(key: string, amount = 1) {
    try {
      const res = await this.client.incrBy(this.sKey(key), amount);
      return typeof res === "number" ? res : Number(res);
    } catch (error) {
      logger.error(`[VALKEY] incrBy error for key ${this.glideToUtf8(this.sKey(key))}:`, error);
      throw error;
    }
  }

  async expire(key: string, seconds: number) {
    try {
      return await this.client.expire(this.sKey(key), Math.floor(seconds));
    } catch (error) {
      logger.error(`[VALKEY] expire error for key ${this.glideToUtf8(this.sKey(key))}:`, error);
      throw error;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.client.close();
  }
}

// small helper type for convenience when importing in other files
export type InferSchema<T extends ZodType<any>> = z.infer<T>;
export default ValkeyGlideStore;
