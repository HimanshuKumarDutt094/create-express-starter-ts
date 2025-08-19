// Shared request/controller types
// These types help you get full typing in controllers while composing with Express generics.

import type { Request, Response, NextFunction, RequestHandler } from "express";

// Derive Better Auth types from our configured instance without runtime import
type AuthInstance = typeof import("@/utils/auth.js")["auth"];
export type Session = NonNullable<Awaited<ReturnType<AuthInstance["api"]["getSession"]>>>;
export type AuthUser = NonNullable<Session["user"]>;

/**
 * Generic Express handler type preserving route generics.
 */
export type Handler<
  P = Request["params"],
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  // eslint-disable-next-line @typescript-eslint/ban-types
  Locals extends Record<string, any> = Record<string, any>
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction
) => any;

/**
 * A Request where `auth` is guaranteed to be present.
 *
 * Use this in controllers that are protected by `requireAuth` middleware
 * or wrapped with a `withRequiredAuth` helper so that you get
 * compile-time access to `req.auth.session` and `req.auth.user`.
 */
export type AuthedRequest<
  P = Request["params"],
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  // eslint-disable-next-line @typescript-eslint/ban-types
  Locals extends Record<string, any> = Record<string, any>
> = Request<P, ResBody, ReqBody, ReqQuery, Locals> & {
  auth: {
    session: Session; // Better Auth session object
    user: AuthUser; // Better Auth user object
  };
};

/**
 * Controller/handler signature where `req` is guaranteed to be authenticated.
 *
 * Usage:
 *  - Type protected controllers as `AuthedHandler<Params, ResBody, ReqBody, ReqQuery, Locals>`
 *  - In your route, wrap with `withRequiredAuth(controller)` to enforce auth at runtime
 *    and provide compile-time narrowing for `req.auth`.
 *
 * Common error and quick fix:
 *  - If you pass an `AuthedHandler` directly to `router.METHOD(...)` you may see an
 *    overload error because Express expects a plain `RequestHandler`.
 *  - Quick fix: wrap the handler → `withRequiredAuth(yourController)`.
 */
export type AuthedHandler<
  P = Request["params"],
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  // eslint-disable-next-line @typescript-eslint/ban-types
  Locals extends Record<string, any> = Record<string, any>
> = (
  req: AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction
) => any;

/**
 * Type signature for a helper that converts an `AuthedHandler` into
 * an Express `RequestHandler` by performing the auth check up front.
 *
 * Example impl lives in middleware (not here):
 *   const withRequiredAuth: WithRequiredAuth = (handler) => (req, res, next) => {
 *     // check session, 401 if missing, else call handler(req as AuthedRequest, ...)
 *   };
 *
 * Tip:
 *  - If you see an overload error when passing an `AuthedHandler` to a route,
 *    this wrapper is the intended fix: `router.put("/x", withRequiredAuth(h))`.
 */
// Practical, non-generic wrapper type to avoid conflicts with Express' internal generics
export type WithRequiredAuth = (
  handler: AuthedHandler<any, any, any, any, any>
) => RequestHandler;
