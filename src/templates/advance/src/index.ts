import express from "express";
import { env } from "@/utils/env.js";
import healthRoutes from "@/api/v1/routes/health.routes.js";
import userRoutes from "@/api/v1/routes/user.route.js";
import "./zod-extend.js";
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// API V1 Routes
app.use("/api/v1", healthRoutes);
app.use("/api/v1/users", userRoutes);

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
