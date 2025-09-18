import { rateLimitStore } from "@/services/valkey-store.js";
import { env } from "@/utils/env.js";
import { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Global rate limiter using express-rate-limit with environment-aware defaults
export const globalRateLimiter = rateLimit({
  windowMs: env.NODE_ENV === "production" ? 15 * 60 * 1000 : 60 * 1000, // 15 minutes prod, 1 minute dev
  max: env.NODE_ENV === "production" ? 100 : 1000, // 100 req per window in prod, higher in dev
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use express-rate-limit's helper so IPv6 addresses are handled correctly
    // Pass the IP string to the helper as recommended in the docs
    // ipKeyGenerator expects the request object; pass `req`
    // cast to unknown to satisfy the imported typing in this template
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
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
// Module-level in-memory store and cleanup flag for the fallback path.
interface Entry {
  count: number;
  firstTs: number;
}
const _spamStore = new Map<string, Entry>();
let _spamCleanupScheduled = false;

export async function spamProtection(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    // Normalize URL to avoid query string e.g., /api/v1/users?foo=bar -> /api/v1/users
    const url = req.originalUrl.split("?")[0] || req.originalUrl || "/";
    const key = `${ip}:${req.method}:${url}`;

    // If Valkey store is available, use atomic incr + expire
    if (rateLimitStore) {
      try {
        const current = await rateLimitStore.incrBy(key, 1);
        // set TTL on first increment (if ttl is -1 or unspecified)
        const ttl = await rateLimitStore.ttl(key);
        if (ttl < 0) {
          await rateLimitStore.expire(key, spamWindowSeconds);
        }
        if (current > spamThreshold) {
          return res.status(429).json({
            error: "Too many requests (spam detected)",
            code: "SPAM_PROTECTION_TRIGGERED",
          });
        }
        next();
        return;
      } catch (err) {
        // If valkey fails for any reason, fall back to in-memory below

        console.warn("Valkey rate limit check failed, falling back to memory", err);
      }
    }

    // Fallback: in-memory counters (best-effort only)
    const spamStore = _spamStore;

    const now = Date.now();
    const existing = spamStore.get(key);
    if (!existing) {
      spamStore.set(key, { count: 1, firstTs: now });
      next();
      return;
    }

    if (now - existing.firstTs <= spamWindowSeconds * 1000) {
      existing.count += 1;
    } else {
      existing.count = 1;
      existing.firstTs = now;
    }
    spamStore.set(key, existing);

    // periodic cleanup
    if (!_spamCleanupScheduled) {
      _spamCleanupScheduled = true;
      setInterval(
        () => {
          const then = Date.now();
          for (const [k, entry] of spamStore.entries()) {
            if (then - entry.firstTs > spamWindowSeconds * 6 * 1000) {
              spamStore.delete(k);
            }
          }
        },
        spamWindowSeconds * 6 * 1000
      ).unref();
    }

    if (existing.count > spamThreshold) {
      return res.status(429).json({
        error: "Too many requests (spam detected)",
        code: "SPAM_PROTECTION_TRIGGERED",
      });
    }

    next();
    return;
  } catch (err) {
    console.warn("spamProtection error:", err);
    return;
  }
}
