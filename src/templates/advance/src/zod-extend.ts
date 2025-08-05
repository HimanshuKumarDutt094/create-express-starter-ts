// src/zod-extend.ts
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// IMPORTANT: Extend Zod with OpenAPI capabilities once at the application's entry point.
// This adds the .openapi() method to all Zod schemas.
extendZodWithOpenApi(z);
