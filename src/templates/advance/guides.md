# Advance Express Template Guide

This guide provides a detailed overview of the advanced Express.js template structure, explaining the purpose of each directory and file, and where to add your code.

## Project Structure

```
.
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── controllers/
│   │       │   ├── health.controller.ts
│   │       │   └── user.controller.ts
│   │       ├── docs/
│   │       │   └── openapi.ts
│   │       ├── routes/
│   │       │   ├── health.routes.ts
│   │       │   └── user.route.ts
│   │       ├── schemas/
│   │       │   └── user.schema.ts
│   │       └── validators/
│   │           └── user.validators.ts
│   ├── drizzle/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── auth-schema.ts
│   ├── docs/
│   │   └── docs.route.ts
│   ├── middlewares/
│   │   ├── swaggerMiddleware.ts
│   │   └── auth.middleware.ts
│   ├── services/
│   ├── types/
│   │   └── express.d.ts
│   ├── utils/
│   │   ├── api-response.ts
│   │   ├── env.ts
│   │   ├── openapiRegistry.ts
│   │   ├── try-catch.ts
│   │   └── auth.ts
│   ├── index.ts
│   └── zod-extend.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── ...
```

## File Breakdown and Usage

- **`src/index.ts`**:
  - The main entry point of your Express application.
  - Initializes security middleware (`helmet`, `cors`), mounts Better Auth handler, injects global auth context, then applies `express.json()` and routes.
  - Important order: `helmet`/`cors` → `app.all("/api/auth/*auth", toNodeHandler(auth))` → `installAuth(app)` → `express.json()` → routes.
  - **Where to add code**: Global middleware and mounting routers. Avoid adding direct route handlers here.

- **`src/api/v1/`**:
  - This directory encapsulates version 1 of your API. For new API versions (e.g., `v2`), you would create a new `v2` directory.
  - **`controllers/`**:
    - Contains the business logic for your API endpoints. Controllers receive validated input, interact with services/database, and send responses.
    - **Where to add code**: Implement the core logic for each API endpoint (e.g., `user.controller.ts` for user-related operations).
  - **`docs/openapi.ts`**:
    - Configures the OpenAPI (Swagger) document for API v1. It defines API info, server URLs, and imports all routes and schemas to be included in the documentation.
    - **Where to add code**: Update API metadata, add new server URLs, or configure security schemes. Ensure all new routes and schemas are imported here to be included in the documentation.
  - **`routes/`**:
    - Defines the API endpoints and links them to their respective controller functions. These files use `express-zod-safe` for request validation and `@asteasolutions/zod-to-openapi` to register paths for documentation.
    - **Where to add code**: Define new API routes (e.g., `user.route.ts` for user-related routes). Each route should specify its method (GET, POST, etc.), path, validation schemas, and the controller function to handle the request.
  - **`schemas/`**:
    - Contains Zod schemas that define the structure and validation rules for request bodies, query parameters, and response payloads.
    - **Where to add code**: Define new Zod schemas for any data structures used in your API requests or responses. These schemas are crucial for both validation and OpenAPI documentation generation.
  - **`validators/`**:
    - Contains middleware functions that use Zod schemas to validate incoming request data (params, query, body).
    - **Where to add code**: Create new validation middleware for your routes, leveraging the schemas defined in `src/api/v1/schemas/`.

- **`src/drizzle/`**:
  - Contains Drizzle ORM setup and database schema.
  - **`index.ts`**: Exposes a Drizzle DB instance (e.g., `better-sqlite3`) using `env.DATABASE_URL`.
  - **`schema.ts`**: Exports your database schema (now re-exporting from `auth-schema.ts`). Add non-auth tables alongside.
  - **`auth-schema.ts`**: Better Auth core tables (`user`, `session`, `account`, `verification`).
    - **Where to add code**: Add/extend non-auth tables in `schema.ts` and migrate accordingly.

- **`src/docs/docs.route.ts`**:
  - Handles the serving of the OpenAPI (Swagger UI) documentation.
  - **Where to add code**: Typically, you won't need to modify this file unless you change the documentation's base path or add new versions of documentation.

- **`src/middlewares/swaggerMiddleware.ts`**:
  - Provides middleware functions for serving the OpenAPI JSON and setting up Swagger UI.
  - **Where to add code**: Rarely modified, unless you need to customize how Swagger UI is served or how the OpenAPI JSON is generated/accessed.

- **`src/middlewares/auth.middleware.ts`**:
  - Provides Better Auth helpers: `attachAuth`, `requireAuth`, and `withAuth`, plus `installAuth(app)` to globally inject `req.auth`.
  - **Where to add code**: Use `requireAuth` to protect routes or `attachAuth` for optional session.

- **`src/services/`**:
  - This directory contains reusable services that handle business logic, external integrations, and other cross-cutting concerns.
  
  - **`valkey.ts`**: Production-ready Valkey (Redis) client with TypeScript support.
    - **Features**:
      - Type-safe operations with Zod schema validation
      - Automatic JSON serialization/deserialization
      - TTL support with sensible defaults
      - Connection pooling and error handling
    - **Usage**:
      ```typescript
      import { ValkeyGlideStore } from '@/services/valkey';
      import { z } from 'zod';
      
      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email()
      });
      
      const userStore = await ValkeyGlideStore.createFromEnv(userSchema, {
        prefix: 'user:',
        defaultTTLSeconds: 300 // 5 minutes
      });
      
      // Basic operations
      await userStore.set('123', { id: '123', name: 'John', email: 'john@example.com' });
      const user = await userStore.get('123');
      await userStore.del('123');
      ```

  - **`logger.ts`**: Configurable logging service with multiple log levels and pretty-printing.
    - **Features**:
      - Multiple log levels: debug, info, warn, error
      - JSON formatting in production, colored output in development
      - Contextual logging with structured data
      - Performance-optimized for production
    - **Usage**:
      ```typescript
      import { createLogger } from '@/services/logger';
      
      // Create a logger instance with context
      const logger = createLogger('UserService');
      
      // Log messages with different levels
      logger.debug('Debug message', { userId: 123 });
      logger.info('User logged in', { userId: 123 });
      logger.warn('Unusual activity detected', { userId: 123 });
      logger.error('Failed to process request', { error: err });
      
      // In development, logs are colored and formatted for readability
      // In production, logs are output as JSON for better parsing
      ```
    - **Configuration**:
      - `LOG_LEVEL`: Set the minimum log level (debug, info, warn, error)
      - `NODE_ENV`: Automatically configures formatting based on environment

  - **Where to add code**: 
    - Create new service files for reusable business logic
    - Use the logger for all application logging needs
    - Use Valkey for caching, rate limiting, and distributed locking

- **`src/types/express.d.ts`**:
  - Contains custom TypeScript type declarations for Express.js, such as extending the `Request` object.
  - **Where to add code**: Add custom properties to Express request/response objects or define global types relevant to Express.

- **`src/utils/`**:
  - This directory is for general utility functions and helper modules.
  - **`api-response.ts`**: Helper functions for consistent API response formatting.
    - **Where to add code**: Modify or extend functions for custom response structures.
  - **`env.ts`**: Handles environment variable loading and validation.
    - **Where to add code**: Define your application's environment variables and their validation schemas here.
  - **`openapiRegistry.ts`**: A shared registry instance for collecting OpenAPI definitions.
    - **Where to add code**: Rarely modified, as it's a core component for `zod-to-openapi` integration.
  - **`try-catch.ts`**: A utility for wrapping asynchronous Express route handlers to simplify error handling.
    - **Where to add code**: Use this wrapper around your async route handlers to automatically catch errors.
  - **`auth.ts`**: Better Auth server instance configured with Drizzle and providers.
    - **Where to add code**: Configure providers (e.g., GitHub), and ensure env vars are set.

- **`src/zod-extend.ts`**:
  - Extends Zod with custom types or functionalities.
  - **Where to add code**: If you need to add custom Zod methods or types globally, define them here.

## Getting Started

1.  **Define Environment Variables**: Update `.env` with your application's configuration (e.g., database connection strings, API keys).
2.  **Define Database Schema**: If using Drizzle ORM, define your tables in `src/drizzle/schema.ts` (auth tables live in `auth-schema.ts`).
3.  **Apply Schema Changes**: Use your Drizzle workflow (e.g., `drizzle-kit push` or your scripts) to apply schema changes.
4.  **Create API Endpoints**:
    - Define Zod schemas for request/response data in `src/api/v1/schemas/`.
    - Implement the business logic in `src/api/v1/controllers/`.
    - Define the API routes and link them to controllers and validators in `src/api/v1/routes/`.
    - Ensure new routes and schemas are imported in `src/api/v1/docs/openapi.ts` for documentation.
5.  **View Documentation**: Start your application and navigate to `http://localhost:3000/docs/v1` to view the interactive API documentation.

## Core Services

### Logging

The application uses a structured logging system with the following features:

- **Log Levels**:
  - `debug`: Detailed debug information (only shown when `LOG_LEVEL=debug`)
  - `info`: General application flow information
  - `warn`: Warnings that don't prevent operation but might indicate issues
  - `error`: Errors that affect functionality

- **Environment Variables**:
  ```env
  LOG_LEVEL=info  # Set to 'debug' for verbose logging
  NODE_ENV=development  # Affects log formatting
  ```

### Caching with Valkey

The application uses Valkey (Redis) for caching with the following features:

- **Configuration**:
  ```env
  VALKEY_HOST=127.0.0.1
  VALKEY_PORT=6379
  VALKEY_TLS=false
  USER_CACHE_TTL=300  # 5 minutes
  ```

- **Best Practices**:
  - Always set appropriate TTL for cached items
  - Use consistent key patterns (e.g., `user:123`)
  - Invalidate cache on data updates
  - Handle cache misses gracefully

- **Example Usage**:
  ```typescript
  // In a service
  async function getUser(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
    
    const user = await db.queryUser(id);
    if (user) {
      await cache.set(cacheKey, user, { ttl: 300 });
    }
    return user;
  }
  ```

## Authentication & CORS

- **Environment variables** (`.env`):
  - `DATABASE_URL`: path/connection string
  - `PORT`: server port
  - `NODE_ENV`: development | production | test
  - `CORS_ORIGINS`: comma-separated allowed origins, e.g. `http://localhost:5173,https://example.com`
  - `BETTER_AUTH_SECRET`: 32+ chars secret for Better Auth
  - `BETTER_AUTH_URL`: base URL of your app (e.g., `http://localhost:3000`)
  - `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` (optional, if using GitHub provider)

- **Better Auth setup**:
  - Server instance: `src/utils/auth.ts` (uses Drizzle adapter and env vars).
  - Handler: in `src/index.ts`, mounted at `app.all("/api/auth/*auth", toNodeHandler(auth))`.
  - Global injector: `installAuth(app)` adds `req.auth = { session, user }` to every request.
  - CORS: configured via `cors(corsOptions)` using `env.CORS_ORIGINS`. Ensure CORS runs before the Better Auth handler.

- **Protecting routes**:
  - Import `requireAuth` and add to routes that need authentication, e.g.:

    ```ts
    import { requireAuth } from "@/middlewares/auth.middleware.js";
    router.put("/:id", validateUpdateUser, requireAuth, userController.updateUser);
    router.delete("/:id", validateDeleteUser, requireAuth, userController.deleteUser);
    ```

  - For optional auth (no 401):

    ```ts
    import { attachAuth } from "@/middlewares/auth.middleware.js";
    router.get("/me", attachAuth, (req, res) => res.json({ user: req.auth?.user ?? null }));
    ```

## Auth patterns (types + runtime)

- **Files**:
  - Runtime middleware: `src/middlewares/auth.middleware.ts`
  - Types: `src/types/type.ts`

- **Two ways to protect routes**:
  - Middleware style (classic):
    - Route: add `requireAuth`.
    - Controller: type your handler parameter as `AuthedRequest<Params, ResBody, ReqBody, ReqQuery>` to get `req.auth` typed.
    - Example:
      ```ts
      // route
      router.put("/:id", validateUpdateUser, requireAuth, userController.updateUser);

      // controller
      import type { AuthedRequest } from "@/types/type.js";
      export const updateUser = async (
        req: AuthedRequest<{ id: string }, any, UpdateUserInput>,
        res: Response
      ) => { /* use req.auth.user */ };
      ```

  - Wrapper style (recommended):
    - Wrap handler with `withRequiredAuth` to enforce auth and narrow `req`.
    - Controller type: `AuthedHandler<...>` or explicit `AuthedRequest` in param.
    - Example:
      ```ts
      // route
      import { withRequiredAuth } from "@/middlewares/auth.middleware.js";
      router.delete("/:id", validateDeleteUser, withRequiredAuth(userController.deleteUser));

      // controller
      import type { AuthedHandler } from "@/types/type.js";
      export const deleteUser: AuthedHandler<{ id: string }> = async (req, res) => {
        const caller = req.auth.user; // fully typed
      };
      ```

- **Why two patterns?**
  - Middleware runs at runtime; TypeScript can’t infer prior middleware on a specific route. Using `AuthedRequest` in controllers and/or the `withRequiredAuth` wrapper gives compile-time safety.

- **Common TS error and fix**:
  - If you pass an `AuthedHandler` directly to `router.METHOD` you may see an overload error.
  - Quick fix: wrap → `router.put("/x", withRequiredAuth(controller))`.

## Environment variables example

```env
DATABASE_URL="./dev.db"
PORT=3000
NODE_ENV=development
BETTER_AUTH_SECRET="change-me-32+chars"
CORS_ORIGINS=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_GITHUB_CLIENT_ID=dummy
BETTER_AUTH_GITHUB_CLIENT_SECRET=dummy
```

## Notes on database schema

- Auth tables are defined in `src/drizzle/auth-schema.ts` and re-exported in `src/drizzle/schema.ts`.
- Add your own tables in `schema.ts` and run your migration/push workflow to sync the database.

## Q&A: Creating a New API Endpoint

**Q: I want to create a new API endpoint (e.g., for `products`). What steps should I follow?**

**A:** Follow these steps to create a new API endpoint in the advanced template, ensuring proper integration with Zod, Drizzle, and OpenAPI documentation:

1.  **Define Schema (`src/api/v1/schemas/product.schema.ts`)**:
    Create a new Zod schema file (e.g., `product.schema.ts`) in `src/api/v1/schemas/` to define the structure and validation rules for your product data (e.g., `ProductSchema`, `CreateProductSchema`, `UpdateProductSchema`).

    ```typescript
    // src/api/v1/schemas/product.schema.ts
    import { z } from "zod";

    export const productSchema = z.object({
      id: z.string().uuid(),
      name: z.string().min(3),
      price: z.number().positive(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    });

    export const createProductSchema = z.object({
      name: z.string().min(3),
      price: z.number().positive(),
    });

    export const updateProductSchema = createProductSchema.partial();

    export const productParamsSchema = z.object({
      id: z.string().uuid(),
    });
    ```

    **Tip**: For `GET`, `PUT`, or `DELETE` operations that involve an `id` in the URL parameters, define a separate schema for the parameters (e.g., `ProductIdParam`). You typically don't include the `id` in the request body for these operations if it's already in the URL.

2.  **Create Validator (`src/api/v1/validators/product.validators.ts`)**:
    Create a validator file (e.g., `product.validators.ts`) in `src/api/v1/validators/` to define middleware for validating incoming request data using your Zod schemas.

    ```typescript
    // src/api/v1/validators/product.validators.ts
    import validateRequest from "express-zod-safe";
    import {
      createProductSchema,
      updateProductSchema,
      productParamsSchema,
    } from "../schemas/product.schema.js";

    export const validateCreateProduct = validateRequest({ body: createProductSchema });
    export const validateUpdateProduct = validateRequest({
      params: productParamsSchema,
      body: updateProductSchema,
    });
    export const validateGetProduct = validateRequest({ params: productParamsSchema });
    export const validateDeleteProduct = validateRequest({ params: productParamsSchema });
    ```

    **Tip**: `express-zod-safe` allows you to validate `params`, `query`, and `body` separately. This ensures that only the expected parts of the request are validated against their respective schemas.

3.  **Implement Controller (`src/api/v1/controllers/product.controller.ts`)**:
    Create a controller file (e.g., `product.controller.ts`) in `src/api/v1/controllers/` to handle the business logic for your product endpoints. Use `tryCatch` for error handling and `api-response` for consistent responses. Integrate with Drizzle ORM for database operations.

    ```typescript
    // src/api/v1/controllers/product.controller.ts
    import { db } from "@/drizzle/index.js";
    import { productsTable } from "@/drizzle/schema.js";
    import { sendError, sendSuccess } from "@/utils/api-response.js";
    import { tryCatch } from "@/utils/try-catch";
    import { eq } from "drizzle-orm";
    import { Request, Response } from "express";

    export const createProduct = async (req: Request, res: Response) => {
      const { data, error } = await tryCatch(
        db
          .insert(productsTable)
          .values({
            name: req.body.name,
            price: req.body.price,
          })
          .returning(),
      );
      if (error) return sendError(res, error.message, "CREATE_PRODUCT_FAILED", 400);
      return sendSuccess(res, data, 201);
    };

    export const listProducts = async (_req: Request, res: Response) => {
      const { data, error } = await tryCatch(
        db.select().from(productsTable),
      );
      if (error) return sendError(res, error.message, "FETCH_PRODUCTS_FAILED", 500);
      return sendSuccess(res, data);
    };

    export const getProduct = async (req: Request<{ id: string }>, res: Response) => {
      const { data, error } = await tryCatch(
        db.select().from(productsTable).where(eq(productsTable.id, req.params.id)),
      );
      if (error) return sendError(res, error.message, "FETCH_PRODUCT_FAILED", 400);
      if (!data || data.length === 0)
        return sendError(res, "Product not found", "PRODUCT_NOT_FOUND", 404);
      return sendSuccess(res, data[0]);
    };
    ```

    **Tip**:
    - **Error Handling Pattern**: Always wrap your asynchronous database operations (or any potentially failing async code) with `tryCatch`. This utility returns an object `{ data, error }`.
    - **Consistent Responses**: After `tryCatch`, check for `error`. If an error exists, use `sendError(res, error.message, "ERROR_CODE", statusCode)` for standardized error responses. Otherwise, use `sendSuccess(res, data, statusCode)` for successful responses.
    - **Drizzle ORM**: Ensure you import `db` from `@/drizzle/index.js` and your relevant schema/table from `@/drizzle/schema.js`. Use Drizzle's methods like `insert().values().returning()` to get the inserted data back.

4.  **Define Routes (`src/api/v1/routes/product.route.ts`)**:
    Create a route file (e.g., `product.route.ts`) in `src/api/v1/routes/`. Define your API paths, link them to the controller functions, and register them with the OpenAPI registry.

    ```typescript
    // src/api/v1/routes/product.route.ts
    import { Router } from "express";
    import { z } from "zod";
    import { registry } from "@/utils/openapiRegistry.js";
    import {
      createProduct,
      listProducts,
      getProduct,
    } from "@/api/v1/controllers/product.controller.js";
    import {
      validateCreateProduct,
      validateGetProduct,
    } from "@/api/v1/validators/product.validators.js";
    import {
      createProductSchema,
      productSchema,
      productParamsSchema,
    } from "@/api/v1/schemas/product.schema.js";

    const productRouter = Router();

    registry.registerPath({
      method: "post",
      path: "/api/v1/products",
      summary: "Create a new product",
      request: {
        body: {
          content: {
            "application/json": { schema: createProductSchema },
          },
        },
      },
      responses: {
        201: {
          description: "Product created successfully",
          content: {
            "application/json": { schema: productSchema },
          },
        },
      },
    });

    registry.registerPath({
      method: "get",
      path: "/api/v1/products/:id",
      summary: "Get a product by ID",
      request: { params: productParamsSchema },
      responses: {
        200: { content: { "application/json": { schema: productSchema } } },
        404: { description: "Product not found" },
      },
    });

    // Express routes mounted under /api/v1/products in src/index.ts
    productRouter.post("/", validateCreateProduct, createProduct);
    productRouter.get("/", listProducts);
    productRouter.get("/:id", validateGetProduct, getProduct);

    export default productRouter;
    ```

    **Tip**:
    - Use `router.route("/path").get(handler).post(handler)` to chain different HTTP methods for the same path.
    - Ensure you register each path with `registry.registerPath()` for OpenAPI documentation. This includes defining the method, path, tags, summary, request body (with schema), and responses (with schema).
    - For paths with parameters (e.g., `/products/{id}`), define the parameter in the `path` string and also in the `parameters` array within `registry.registerPath()`.

5.  **Update OpenAPI Documentation (`src/api/v1/docs/openapi.ts`)**:
    Import your new route file into `src/api/v1/docs/openapi.ts` to ensure your new endpoints are included in the generated OpenAPI documentation.

    ```typescript
    // src/api/v1/docs/openapi.ts
    // ... existing imports ...
    import "@/api/v1/routes/product.route"; // Add this line
    // import "@/api/v1/schemas/product.schema"; // Optional: if you split schemas

    export function generateOpenApiDocument() {
      // ...
    }
    ```

    **Tip**: Always import your new route files into `src/api/v1/docs/openapi.ts` to ensure they are reflected in your API documentation. This step is crucial for keeping your documentation up-to-date with your API's functionality.

6.  **Mount Routes in `src/index.ts`**:
    Finally, import and mount your new product routes in `src/index.ts` under the appropriate API version.

    ```typescript
    // src/index.ts
    // ... existing imports ...
    import productRoutes from "@/api/v1/routes/product.route.js"; // Add this line

    // ...
    // API V1 Routes
    app.use("/api/v1", healthRoutes);
    app.use("/api/v1/users", userRoutes);
    app.use("/api/v1/products", productRoutes); // Add this line
    // ...
    ```

    </content>
