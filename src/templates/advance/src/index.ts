import healthRoutes from "@/api/v1/routes/health.routes.js";
import userRoutes from "@/api/v1/routes/user.route.js";
import docsRouter from "@/docs/docs.route.js";
import { env } from "@/utils/env.js";
import express from "express";
import helmet from "helmet";
import "./zod-extend.js";
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(helmet());
app.get("/", (_, res) => {
  res.send("Hello, World!");
});
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
  console.log(`Documentation is available at http://localhost:${PORT}/docs/v1`);
});

export default app;
