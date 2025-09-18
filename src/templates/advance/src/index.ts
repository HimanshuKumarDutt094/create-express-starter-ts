import healthRoutes from "@/api/v1/routes/health.routes.js";
import userRoutes from "@/api/v1/routes/user.route.js";
import docsRouter from "@/docs/docs.route.js";
import { installAuth } from "@/middlewares/auth.middleware.js";
import { auth } from "@/utils/auth.js";
import { env } from "@/utils/env.js";
import { toNodeHandler } from "better-auth/node";
import cluster from "cluster";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import os from "os";
import { globalRateLimiter, spamProtection } from "./middlewares/rateLimit.middleware.js";
import { createLogger } from "./services/logger";
import "./zod-extend.js";

const logger = createLogger("Server");

const app = express();

// Minimal request logging middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const msg = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;
    if (statusCode >= 500) {
      logger.error(msg, { ip, status: statusCode, duration, headers: req.headers, query: req.query, params: req.params, body: method !== 'GET' ? req.body : undefined });
    } else if (statusCode >= 400) {
      logger.warn(msg, { ip, status: statusCode, duration });
    } else {
      logger.info(msg, { ip, status: statusCode, duration });
    }
  });
  next();
});

app.use(helmet());

app.use(globalRateLimiter as any);
app.use(spamProtection as any);

const corsOrigins = env.CORS_ORIGINS || '';
const allowedOrigins = corsOrigins ? corsOrigins.split(',').map((o: string) => o.trim()).filter(Boolean) : [];
logger.info('CORS allowed origins', { allowedOrigins });

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use('/api/auth', cors(corsOptions));
app.all('/api/auth{/*auth}', toNodeHandler(auth));

installAuth(app);

app.use(express.json());
// Initialize stores and start the server (worker only)
const startServer = async () => {
  try {
    // API V1 Routes
    app.use("/api/v1", healthRoutes);
    app.use("/api/v1/users", userRoutes);

    // Documentation - only mount in non-production
    if (env.NODE_ENV !== "production") {
      app.use("/docs", docsRouter);
    }

    const port = env.PORT || 3000;

    return new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
      const server = app.listen(port, () => {
        const host = process.env.HOST || 'localhost';
        const baseUrl = env.BETTER_AUTH_URL || `http://${host}:${port}`;
        logger.info(`Server running on ${baseUrl}`);
        if (env.NODE_ENV !== 'production') logger.info(`API Documentation: ${baseUrl}/docs`);
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

if (cluster.isPrimary) {
  const cpus = os.cpus().length || 1;
  logger.info(`Primary ${process.pid} is forking ${cpus} workers`);
  for (let i = 0; i < cpus; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} exited; restarting`);
    cluster.fork();
  });
} else {
  // Worker runs the server and installs process handlers
  const serverPromise = startServer();

  process.on('uncaughtException', (error: Error) => {
    logger.error(`Uncaught Exception: ${error.message}`, { error });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(`Unhandled Rejection at: ${promise}`, { error });
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully');
    const timer = setTimeout(() => {
      logger.warn('Forcing server shutdown');
      process.exit(1);
    }, 10000);

    serverPromise.then(server => {
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
}
