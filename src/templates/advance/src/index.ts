import healthRoutes from "@/api/v1/routes/health.routes.js";
import userRoutes from "@/api/v1/routes/user.route.js";
import docsRouter from "@/docs/docs.route.js";
import { installAuth } from "@/middlewares/auth.middleware.js";
import { auth } from "@/utils/auth.js";
import { env } from "@/utils/env.js";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import "./zod-extend.js";
const app = express();

// Security headers
app.use(helmet());

// Secure CORS
const allowedOrigins = (env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser tools
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS: Origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
};

// Apply CORS for Better Auth endpoints and mount Better Auth handler BEFORE express.json()
app.use("/api/auth", cors(corsOptions));
// For Express v5, catch-all may require a splat: "/api/auth/*splat". Using wildcard path works in most setups.
app.all("/api/auth/*auth", toNodeHandler(auth));

// Inject req.auth (session, user) globally AFTER Better Auth handler
installAuth(app);

// Middleware to parse JSON bodies (must be AFTER Better Auth + injector)
app.use(express.json());
// API V1 Routes
app.use("/api/v1", healthRoutes);

app.use("/api/v1/users", userRoutes);

// Mount documentation routes under /docs only in development
if (env.NODE_ENV !== "production") {
  app.use("/docs", docsRouter);
}

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (env.NODE_ENV !== "production")
    console.log(
      `Documentation is available at http://localhost:${PORT}/docs/v1`,
    );
  console.log(
    "If you modify src/drizzle/src/db/schema.ts, remember to run 'pnpm db:push' to apply schema changes.",
  );
});

export default app;
