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
import { createLogger } from "./services/logger";
import "./zod-extend.js";

const logger = createLogger("Server");

// Initialize Express
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;
    
    if (statusCode >= 500) {
      logger.error(logMessage, { 
        ip, 
        status: statusCode,
        duration,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: method !== 'GET' ? req.body : undefined
      });
    } else if (statusCode >= 400) {
      logger.warn(logMessage, { 
        ip, 
        status: statusCode,
        duration
      });
    } else {
      logger.info(logMessage, { 
        ip, 
        status: statusCode,
        duration
      });
    }
  });
  
  next();
});

// Security headers
app.use(helmet());

// Secure CORS
const corsOrigins = env.CORS_ORIGINS || '';
const allowedOrigins = corsOrigins
  ? corsOrigins.split(',').map((o: string) => o.trim()).filter(Boolean)
  : [];

logger.info('CORS allowed origins', { allowedOrigins });

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
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Apply CORS for Better Auth endpoints and mount Better Auth handler BEFORE express.json()
app.use("/api/auth", cors(corsOptions));
// For Express v5, catch-all may require a splat: "/api/auth/*splat". Using wildcard path works in most setups.
app.all("/api/auth{/*auth}", toNodeHandler(auth));

// Inject req.auth (session, user) globally AFTER Better Auth handler
installAuth(app);

// Middleware to parse JSON bodies (must be AFTER Better Auth + injector)
app.use(express.json());
// Initialize stores and start the server
const startServer = async () => {
  try {
    // API V1 Routes
    app.use("/api/v1", healthRoutes);
    app.use("/api/v1/users", userRoutes);

    // Documentation - only mount in non-production
    if (env.NODE_ENV !== "production") {
      app.use("/docs", docsRouter);
    }

    // Start the server
    const port = env.PORT || 3000;
    
    // Create a promise that resolves when the server starts
    return new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
      const server = app.listen(port, () => {
        const baseUrl = `http://localhost:${port}`;
        logger.info(`Server running on ${baseUrl}`);
        if (env.NODE_ENV !== "production") {
          logger.info(`API Documentation: ${baseUrl}/docs`);
        }
        logger.info("If you modify src/drizzle/src/db/schema.ts, remember to run 'pnpm db:push' to apply schema changes.");
        resolve(server);
      });

      // Handle server errors
      server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.syscall !== "listen") {
          reject(error);
          return;
        }

        // Handle specific listen errors with friendly messages
        switch (error.code) {
          case "EACCES":
            logger.error(`Port ${port} requires elevated privileges`, { error });
            reject(error);
            break;
          case "EADDRINUSE":
            logger.error(`Port ${port} is already in use`, { error });
            reject(error);
            break;
          default:
            reject(error);
        }
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    throw error; // Let the global error handler deal with this
  }
};

// Start the server
let httpServer: ReturnType<typeof app.listen> | null = null;
const server = startServer().then(server => {
  httpServer = server;
  return server;
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error(`Unhandled Rejection at: ${promise}`, { error });
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  // Force close the server after 10 seconds
  const timer = setTimeout(() => {
    logger.warn('Forcing server shutdown');
    process.exit(1);
  }, 10000);

  // Ensure the server is started before trying to close it
  server.then(server => {
    server.close(() => {
      clearTimeout(timer);
      logger.info('Server closed');
      process.exit(0);
    });
  }).catch(error => {
    logger.error('Error during server shutdown', { error });
    clearTimeout(timer);
    process.exit(1);
  });
});

export { app, server };
