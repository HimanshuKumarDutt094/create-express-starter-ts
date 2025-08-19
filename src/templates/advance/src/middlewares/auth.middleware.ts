import { sendError } from "@/utils/api-response.js";
import { auth } from "@/utils/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import type { Application, NextFunction, Request, RequestHandler, Response } from "express";
import type { AuthedRequest, WithRequiredAuth } from "@/types/type.js";

export type AuthContext = {
  // Using the Better Auth server API
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any | null;
};

// Attaches auth context to req.auth (session and user if available)
export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).auth = {
      session,
      user: session?.user ?? null,
    } as AuthContext;
  } catch {
    // swallow errors to avoid blocking other middlewares; req.auth remains undefined/null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).auth = { session: null, user: null } as AuthContext;
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
export const requireAuth: RequestHandler = async (req, res, next) => {
  await attachAuth(req, res, async (err?: any) => {
    if (err) return next(err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authCtx = (req as any).auth as AuthContext | undefined;
    if (!authCtx?.session) {
      return sendError(res as any, "Unauthorized", "UNAUTHORIZED", 401);
    }
    return next();
  });
};

/**
 * Strongly-typed wrapper that requires auth, then invokes the handler with
 * `req` narrowed to `AuthedRequest<...>` so you get `req.auth.user/session`
 * fully typed in your controller.
 */
export const withRequiredAuth: WithRequiredAuth = ((handler) => {
  const wrapped: RequestHandler = async (req, res, next) => {
    await attachAuth(req, res, async (err?: any) => {
      if (err) return next(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authCtx = (req as any).auth as AuthContext | undefined;
      if (!authCtx?.session) {
        return sendError(res as any, "Unauthorized", "UNAUTHORIZED", 401);
      }
      return (handler as any)(req as AuthedRequest, res, next);
    });
  };
  // Cast to the generic signature to satisfy different route generics
  return wrapped as unknown as ReturnType<WithRequiredAuth>;
}) as WithRequiredAuth;

// Higher-order helper to wrap handlers
export function withAuth(
  handler: (req: Request, res: Response, next: NextFunction) => any,
  { required = true }: { required?: boolean } = {}
): RequestHandler {
  return async (req, res, next) => {
    await attachAuth(req, res, async (err?: any) => {
      if (err) return next(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authCtx = (req as any).auth as AuthContext | undefined;
      if (required && !authCtx?.session) {
        return sendError(res as any, "Unauthorized", "UNAUTHORIZED", 401);
      }
      return handler(req, res, next);
    });
  };
}

// Helper to install global auth injector middleware on an app instance
export function installAuth(app: Application) {
  app.use(attachAuth);
}
