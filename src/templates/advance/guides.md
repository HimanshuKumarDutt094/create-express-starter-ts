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
│   │   ├── drizle.config.ts
│   │   └── src/
│   │       ├── db/
│   │       │   └── schema.ts
│   │       └── index.ts
│   ├── docs/
│   │   └── docs.route.ts
│   ├── middlewares/
│   │   └── swaggerMiddleware.ts
│   ├── services/
│   ├── types/
│   │   └── express.d.ts
│   ├── utils/
│   │   ├── api-response.ts
│   │   ├── env.ts
│   │   ├── openapiRegistry.ts
│   │   └── try-catch.ts
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
  - Initializes the Express app, applies global middleware (e.g., `express.json()`, `helmet`), and mounts API routes and documentation routes.
  - **Where to add code**: Primarily for global middleware and mounting top-level routers. Avoid adding direct route handlers here.

- **`src/api/v1/`**:
  - This directory encapsulates version 1 of your API. For new API versions (e.g., `v2`), you would create a new `v2` directory.
  - **`controllers/`**:
    - Contains the business logic for your API endpoints. Controllers receive validated input, interact with services/database, and send responses.
    - **Where to add code**: Implement the core logic for each API endpoint (e.g., `user.controller.ts` for user-related operations).
  - **`docs/openapi.ts`**:
    - Configures the OpenAPI (Swagger) document for API v1. It defines API info, server URLs, and imports all routes and schemas to be included in the documentation.
    - **Where to add code**: Update API metadata, add new server URLs, or configure security schemes. Ensure all new routes and schemas are imported here to be included in the documentation.
  - **`routes/`**:
    - Defines the API endpoints and links them to their respective controller functions. These files use `zod-express-middleware` for request validation and `zod-to-openapi` to register paths for documentation.
    - **Where to add code**: Define new API routes (e.g., `user.route.ts` for user-related routes). Each route should specify its method (GET, POST, etc.), path, validation schemas, and the controller function to handle the request.
  - **`schemas/`**:
    - Contains Zod schemas that define the structure and validation rules for request bodies, query parameters, and response payloads.
    - **Where to add code**: Define new Zod schemas for any data structures used in your API requests or responses. These schemas are crucial for both validation and OpenAPI documentation generation.
  - **`validators/`**:
    - Contains middleware functions that use Zod schemas to validate incoming request data (params, query, body).
    - **Where to add code**: Create new validation middleware for your routes, leveraging the schemas defined in `src/api/v1/schemas/`.

- **`src/drizzle/`**:
  - Contains Drizzle ORM related configurations and database schema.
  - **`drizle.config.ts`**: Drizzle Kit configuration file.
    - **Where to add code**: Configure database connection details, schema paths, and migration directories.
  - **`src/db/schema.ts`**: Defines your database schema using Drizzle ORM.
    - **Where to add code**: Define your database tables, columns, and relationships here. After modifying, remember to run `pnpm db:push` to apply changes to the database.

- **`src/docs/docs.route.ts`**:
  - Handles the serving of the OpenAPI (Swagger UI) documentation.
  - **Where to add code**: Typically, you won't need to modify this file unless you change the documentation's base path or add new versions of documentation.

- **`src/middlewares/swaggerMiddleware.ts`**:
  - Provides middleware functions for serving the OpenAPI JSON and setting up Swagger UI.
  - **Where to add code**: Rarely modified, unless you need to customize how Swagger UI is served or how the OpenAPI JSON is generated/accessed.

- **`src/services/`**:
  - This directory is intended for business logic that is independent of the Express request/response cycle. Services can encapsulate interactions with external APIs, complex calculations, or database operations.
  - **Where to add code**: Create new service files for reusable business logic that can be called by controllers or other parts of your application.

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

- **`src/zod-extend.ts`**:
  - Extends Zod with custom types or functionalities.
  - **Where to add code**: If you need to add custom Zod methods or types globally, define them here.

## Getting Started

1.  **Define Environment Variables**: Update `.env` with your application's configuration (e.g., database connection strings, API keys).
2.  **Define Database Schema**: If using Drizzle ORM, define your database tables and relationships in `src/drizzle/src/db/schema.ts`.
3.  **Apply Schema Changes**: After modifying `src/drizzle/src/db/schema.ts`, run `pnpm db:push` to apply the schema changes to your database.
4.  **Create API Endpoints**:
    - Define Zod schemas for request/response data in `src/api/v1/schemas/`.
    - Implement the business logic in `src/api/v1/controllers/`.
    - Define the API routes and link them to controllers and validators in `src/api/v1/routes/`.
    - Ensure new routes and schemas are imported in `src/api/v1/docs/openapi.ts` for documentation.
5.  **View Documentation**: Start your application and navigate to `http://localhost:3000/docs/v1` to view the interactive API documentation.

## Q&A: Creating a New API Endpoint

**Q: I want to create a new API endpoint (e.g., for `products`). What steps should I follow?**

**A:** Follow these steps to create a new API endpoint in the advanced template, ensuring proper integration with Zod, Drizzle, and OpenAPI documentation:

1.  **Define Schema (`src/api/v1/schemas/product.schema.ts`)**:
    Create a new Zod schema file (e.g., `product.schema.ts`) in `src/api/v1/schemas/` to define the structure and validation rules for your product data (e.g., `ProductSchema`, `CreateProductSchema`, `UpdateProductSchema`).

    ```typescript
    // src/api/v1/schemas/product.schema.ts
    import { z } from "zod";
    import { registry } from "@/utils/openapiRegistry";

    export const ProductSchema = registry.register(
      "Product",
      z.object({
        id: z.string().uuid(),
        name: z.string().min(3),
        price: z.number().positive(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      }),
    );

    export const CreateProductSchema = registry.register(
      "CreateProduct",
      z.object({
        name: z.string().min(3),
        price: z.number().positive(),
      }),
    );

    export const UpdateProductSchema = registry.register(
      "UpdateProduct",
      z.object({
        name: z.string().min(3).optional(),
        price: z.number().positive().optional(),
      }),
    );

    export const ProductIdParam = registry.register(
      "ProductIdParam",
      z.object({
        id: z.string().uuid(),
      }),
    );
    ```

    **Tip**: For `GET`, `PUT`, or `DELETE` operations that involve an `id` in the URL parameters, define a separate schema for the parameters (e.g., `ProductIdParam`). You typically don't include the `id` in the request body for these operations if it's already in the URL.

2.  **Create Validator (`src/api/v1/validators/product.validators.ts`)**:
    Create a validator file (e.g., `product.validators.ts`) in `src/api/v1/validators/` to define middleware for validating incoming request data using your Zod schemas.

    ```typescript
    // src/api/v1/validators/product.validators.ts
    import { validateRequest } from "zod-express-middleware";
    import {
      CreateProductSchema,
      UpdateProductSchema,
    } from "../schemas/product.schema";

    export const createProductValidator = validateRequest({
      body: CreateProductSchema,
    });

    export const updateProductValidator = validateRequest({
      body: UpdateProductSchema,
    });

    export const getProductByIdValidator = validateRequest({
      params: ProductIdParam,
    });

    export const deleteProductValidator = validateRequest({
      params: ProductIdParam,
    });
    ```

    **Tip**: `zod-express-middleware` allows you to validate `params`, `query`, and `body` separately. This ensures that only the expected parts of the request are validated against their respective schemas.

3.  **Implement Controller (`src/api/v1/controllers/product.controller.ts`)**:
    Create a controller file (e.g., `product.controller.ts`) in `src/api/v1/controllers/` to handle the business logic for your product endpoints. Use `try-catch` for error handling and `api-response` for consistent responses. Integrate with Drizzle ORM for database operations.

    ```typescript
    // src/api/v1/controllers/product.controller.ts
    import { db } from "@/drizzle/src"; // Assuming your Drizzle DB instance is exported from here
    import { products } from "@/drizzle/src/db/schema"; // Your Drizzle schema
    import { sendError, sendSuccess } from "@/utils/api-response"; // Import sendSuccess and sendError
    import { tryCatch } from "@/utils/try-catch";
    import { Request, Response } from "express";
    import { v4 as uuidv4 } from "uuid";

    export const createProduct = async (req: Request, res: Response) => {
      const { data: newProductData, error } = await tryCatch(
        db
          .insert(products)
          .values({
            id: uuidv4(),
            name: req.body.name,
            price: req.body.price,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .returning(), // Use .returning() to get the inserted data
      );

      if (error) {
        return sendError(res, error.message, "CREATE_PRODUCT_FAILED", 400);
      }
      return sendSuccess(res, newProductData, 201);
    };

    export const getProducts = async (_req: Request, res: Response) => {
      const { data: allProducts, error } = await tryCatch(
        db.select().from(products),
      );

      if (error) {
        return sendError(res, error.message, "FETCH_PRODUCTS_FAILED", 500);
      }
      return sendSuccess(res, allProducts);
    };

    // Add more controller functions for getProductById, updateProduct, deleteProduct etc.
    // Example for getProductById:
    // export const getProductById = async (req: Request, res: Response) => {
    //   const { data: product, error } = await tryCatch(
    //     db.select().from(products).where(eq(products.id, req.params.id)),
    //   );
    //   if (error) {
    //     return sendError(res, error.message, "FETCH_PRODUCT_FAILED", 400);
    //   }
    //   if (!product || product.length === 0) {
    //     return sendError(res, "Product not found", "PRODUCT_NOT_FOUND", 404);
    //   }
    //   return sendSuccess(res, product[0]);
    // };
    ```

    **Tip**:
    - **Error Handling Pattern**: Always wrap your asynchronous database operations (or any potentially failing async code) with `tryCatch`. This utility returns an object `{ data, error }`.
    - **Consistent Responses**: After `tryCatch`, check for `error`. If an error exists, use `sendError(res, error.message, "ERROR_CODE", statusCode)` for standardized error responses. Otherwise, use `sendSuccess(res, data, statusCode)` for successful responses.
    - **Drizzle ORM**: Ensure you import `db` from `src/drizzle/src` and your relevant schema (e.g., `products`). Use Drizzle's methods like `insert().values().returning()` to get the inserted data back.

4.  **Define Routes (`src/api/v1/routes/product.route.ts`)**:
    Create a route file (e.g., `product.route.ts`) in `src/api/v1/routes/`. Define your API paths, link them to the controller functions, and register them with the OpenAPI registry.

    ```typescript
    // src/api/v1/routes/product.route.ts
    import {
      createProduct,
      getProducts,
    } from "@/api/v1/controllers/product.controller";
    import { createProductValidator } from "@/api/v1/validators/product.validators";
    import {
      CreateProductSchema,
      ProductSchema,
    } from "@/api/v1/schemas/product.schema";
    import { registry } from "@/utils/openapiRegistry";
    import { Router } from "express";

    const router = Router();

    registry.registerPath({
      method: "post",
      path: "/products",
      tags: ["Products"],
      summary: "Create a new product",
      request: {
        body: {
          content: {
            "application/json": {
              schema: CreateProductSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: "Product created successfully",
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
                message: z.string(),
                data: ProductSchema,
              }),
            },
          },
        },
      },
    });

    router.route("/products").post(createProductValidator, createProduct);
    router.route("/products").get(getProducts);

    export default router;
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
