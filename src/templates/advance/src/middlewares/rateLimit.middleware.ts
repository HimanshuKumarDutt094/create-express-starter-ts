import { rateLimitStore } from "@/services/valkey-store.js";
import { env } from "@/utils/env.js";
import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

// Global rate limiter using express-rate-limit with environment-aware defaults
export const globalRateLimiter = rateLimit({
  windowMs: env.NODE_ENV === "production" ? 15 * 60 * 1000 : 60 * 1000, // 15 minutes prod, 1 minute dev
  max: env.NODE_ENV === "production" ? 100 : 1000, // 100 req per window in prod, higher in dev
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP as the key by default
    return req.ip;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

// Valkey-backed spam protection for bursty requests to the same URL.
// Falls back to in-memory counters if Valkey is not available.
const spamWindowSeconds = 5; // 5 seconds
const spamThreshold = env.NODE_ENV === "production" ? 5 : 20; // tighter in prod

export async function spamProtection(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
    // Normalize URL to avoid query string e.g., /api/v1/users?foo=bar -> /api/v1/users
    const url = req.originalUrl?.split("?")[0] || req.originalUrl || "/";
    const key = `${ip}:${req.method}:${url}`;

    // If Valkey store is available, use atomic incr + expire
    if (rateLimitStore) {
      try {
        const current = await rateLimitStore.incrBy(key, 1);
        // set TTL on first increment (if ttl is -1 or unspecified)
        const ttl = await rateLimitStore.ttl(key);
        if ((ttl == null || ttl < 0) && spamWindowSeconds > 0) {
          await rateLimitStore.expire(key, spamWindowSeconds);
        }
        if (current > spamThreshold) {
          return res.status(429).json({
            error: "Too many requests (spam detected)",
            code: "SPAM_PROTECTION_TRIGGERED",
          });
        }
        return next();
      } catch (err) {
        // If valkey fails for any reason, fall back to in-memory below
        // eslint-disable-next-line no-console
        console.warn("Valkey rate limit check failed, falling back to memory", err);
      }
    }

    // Fallback: in-memory counters (best-effort only)
    type Entry = { count: number; firstTs: number };
    const spamStore = (spamProtection as any)._store || new Map<string, Entry>();
    (spamProtection as any)._store = spamStore;

    const now = Date.now();
    const existing = spamStore.get(key);
    if (!existing) {
      spamStore.set(key, { count: 1, firstTs: now });
      return next();
    }

    if (now - existing.firstTs <= spamWindowSeconds * 1000) {
      existing.count += 1;
    } else {
      existing.count = 1;
      existing.firstTs = now;
    }
    spamStore.set(key, existing);

    // periodic cleanup
    if (!(spamProtection as any)._cleanupScheduled) {
      (spamProtection as any)._cleanupScheduled = true;
      setInterval(() => {
        const now = Date.now();
        for (const [k, entry] of spamStore.entries()) {
          if (now - entry.firstTs > spamWindowSeconds * 6 * 1000) {
            spamStore.delete(k);
          }
        }
      }, spamWindowSeconds * 6 * 1000).unref?.();
    }

    if (existing.count > spamThreshold) {
      return res.status(429).json({
        error: "Too many requests (spam detected)",
        code: "SPAM_PROTECTION_TRIGGERED",
      });
    }

    return next();
  } catch (err) {
    return next();
  }
}
