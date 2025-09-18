// src/types/express.d.ts
import { Session, User } from "better-auth";
import { ParamsDictionary } from "express-serve-static-core";

declare global {
  namespace Express {
    interface Request {
      params: ParamsDictionary & {
        id: string; // Changed from number to string to match route params
      };
      // Populated by our Better Auth middleware
      auth?: {
        session: Session | null;
        user: User | null;
      };
    }
  }
}
