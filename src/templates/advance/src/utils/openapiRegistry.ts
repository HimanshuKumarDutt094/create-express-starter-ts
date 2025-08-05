// src/utils/openapiRegistry.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

// Export a single instance of OpenAPIRegistry to be used across the application
export const registry = new OpenAPIRegistry();
