// src/api/v1/docs/openapi.ts
import { registry } from "@/utils/openapiRegistry.js"; // Import the shared registry
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

// Import schemas and routes to ensure they are registered with the OpenAPI registry
import "@/api/v1/routes/user.route";
import "@/api/v1/schemas/user.schema";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const openApiDocument = generator.generateDocument({
    openapi: "3.1.0", // Specify OpenAPI version. Use '3.1.0' with OpenApiGeneratorV31
    info: {
      version: "1.0.0",
      title: "User API Documentation",
      description:
        "A dummy API for user management, demonstrating type-safe development with TypeScript, Zod v4, OpenAPI, and Redoc.",
    },
    servers: [
      {
        url: "/", // Base path for API endpoints
        description: "API V1 Server",
      },
    ],
    // Add security schemes, tags, etc. here if needed
  });
  return openApiDocument;
}
