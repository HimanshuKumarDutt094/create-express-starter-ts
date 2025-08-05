"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/zod-extend.ts
var zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
var zod_1 = require("zod");
// IMPORTANT: Extend Zod with OpenAPI capabilities once at the application's entry point.
// This adds the .openapi() method to all Zod schemas.
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
