// src/api/docs/docs.router.ts
import {
  getSwaggerUiSetup,
  openApiJsonHandlerV1,
  swaggerUiMiddleware,
} from "@/middlewares/swaggerMiddleware.js";
import { Router } from "express";

const router = Router();

// Redirect root /docs to /docs/v1
router.get("/", (req, res) => {
  res.redirect("/docs/v1");
});

// V1 OpenAPI JSON and Swagger UI
router.get("/v1/openapi.json", openApiJsonHandlerV1);
router.use(
  "/v1",
  swaggerUiMiddleware,
  getSwaggerUiSetup("/docs/v1/openapi.json"),
);

// // V2 OpenAPI JSON and Swagger UI (for tRPC)
// router.get("/v2/openapi.json", openApiJsonHandlerV2);
// router.use(
//   "/v2",
//   swaggerUiMiddleware,
//   getSwaggerUiSetup("/docs/v2/openapi.json"),
// );

export default router;
