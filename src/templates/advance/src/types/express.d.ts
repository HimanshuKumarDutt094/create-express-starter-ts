// src/types/express.d.ts
import { ParamsDictionary } from "express-serve-static-core";

declare global {
  namespace Express {
    interface Request {
      params: ParamsDictionary & {
        id: number;
      };
      // Populated by our Better Auth middleware
      auth?: {
        session: unknown | null;
        user: unknown | null;
      };
    }
  }
}
