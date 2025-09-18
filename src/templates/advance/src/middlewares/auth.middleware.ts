import type { WithRequiredAuth } from "@/types/type.js";
import { sendError } from "@/utils/api-response.js";
import { auth } from "@/utils/auth.js";
import type { Session as BetterSession, User as BetterUser } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Application, Request, RequestHandler } from "express";

export interface AuthContext {
  session: BetterSession | null;
  user: BetterUser | null;
}

// Attaches auth context to req.auth (session and user if available)
export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    req.auth = {
      session,
      user: session?.user ?? null,
    } as AuthContext;
  } catch {
    req.auth = { session: null, user: null } as AuthContext;
  }
  next();
};

/**
 * Ensures a valid session exists.
 *
 * TypeScript note: middleware ordering is a runtime concept, so TS cannot infer
 * that `req.auth` is defined inside your handler just because this middleware
 * ran earlier. For full typing inside handlers, either:
 *  - Type your handler as `AuthedRequest<...>` when using this middleware; or
 *  - Prefer the `withRequiredAuth` wrapper which narrows the handler's `req`.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  attachAuth(req, res, (err?: unknown) => {
    if (err) {
      next(err as unknown as Error);
      return;
    }
    const authCtx = (req as Request & { auth?: AuthContext }).auth;
    if (!authCtx?.session) {
      return sendError(res, "Unauthorized", "UNAUTHORIZED", 401);
    }
    next();
  });
};

/**
 * Strongly-typed wrapper that requires auth, then invokes the handler with
 * `req` narrowed to `AuthedRequest<...>` so you get `req.auth.user/session`
 * fully typed in your controller.
 */
export const withRequiredAuth: WithRequiredAuth = ((handler) => {
  const wrapped: RequestHandler = (req, res, next) => {
    attachAuth(req, res, (err?: unknown) => {
      if (err) {
        next(err as unknown as Error);
        return;
      }
      const authCtx = (req as Request & { auth?: AuthContext }).auth;
      if (!authCtx?.session) {
        return sendError(res, "Unauthorized", "UNAUTHORIZED", 401);
      }
      return (handler as unknown as RequestHandler)(req as unknown as Request, res, next);
    });
  };
  // Cast to the generic signature to satisfy different route generics
  return wrapped as unknown as ReturnType<WithRequiredAuth>;
}) as WithRequiredAuth;

// Higher-order helper to wrap handlers
export function withAuth(
  handler: RequestHandler,
  { required = true }: { required?: boolean } = {}
): RequestHandler {
  return (req, res, next) => {
    attachAuth(req, res, (err?: unknown) => {
      if (err) {
        next(err as unknown as Error);
        return;
      }
      const authCtx = (req as Request & { auth?: AuthContext }).auth;
      if (required && !authCtx?.session) {
        return sendError(res, "Unauthorized", "UNAUTHORIZED", 401);
      }
      return handler(req, res, next);
    });
  };
}

// Helper to install global auth injector middleware on an app instance
export function installAuth(app: Application) {
  app.use(attachAuth);
}
