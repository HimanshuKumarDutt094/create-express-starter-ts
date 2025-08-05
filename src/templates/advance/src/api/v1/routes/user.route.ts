import { registry } from "@/utils/openapiRegistry.js";
import { Router } from "express";
import { z } from "zod";
import { userController } from "../controllers/user.controller.js";
import {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
} from "../schemas/user.schema.js";
import {
  validateCreateUser,
  validateDeleteUser,
  validateGetUser,
  validateUpdateUser,
} from "../validators/user.validators.js";

const userRouter = Router();

// --- OpenAPI Path Registration ---
// Register the POST /users endpoint for OpenAPI documentation
registry.registerPath({
  method: "post",
  path: "/api/v1/users",
  summary: "Create a new user",
  description: "Registers a new user in the system.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createUserSchema, // Links to our Zod schema for request body
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created successfully",
      content: {
        "application/json": {
          schema: createUserSchema, // Using createUserSchema as userResponseSchema is not exported
        },
      },
    },
    400: {
      description:
        "Invalid input provided (e.g., missing fields, invalid email)",
      content: {
        "application/json": {
          schema: z
            .object({ errors: z.array(z.any()) })
            .openapi({ description: "Details of validation errors" }),
        },
      },
    },
  },
});

// Register the GET /users endpoint for OpenAPI documentation
registry.registerPath({
  method: "get",
  path: "/api/v1/users",
  summary: "Get all users",
  description: "Retrieves a list of all registered users.",
  responses: {
    200: {
      description: "List of users",
      content: {
        "application/json": {
          schema: z.array(createUserSchema), // Using createUserSchema as userResponseSchema is not exported
        },
      },
    },
  },
});

// Register the GET /users/{id} endpoint for OpenAPI documentation
registry.registerPath({
  method: "get",
  path: "/api/v1/users/:id",
  summary: "Get user by ID",
  description: "Retrieves a single user by their unique identifier.",
  request: {
    params: z.object({ id: userParamsSchema }),
  },
  responses: {
    200: {
      description: "User found and returned",
      content: {
        "application/json": {
          schema: createUserSchema, // Using createUserSchema as userResponseSchema is not exported
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: z
            .object({ message: z.string() })
            .openapi({ example: { message: "User not found" } }),
        },
      },
    },
    400: {
      description: "Invalid ID format (e.g., non-UUID string)",
      content: {
        "application/json": {
          schema: z
            .object({ errors: z.array(z.any()) })
            .openapi({ description: "Details of validation errors" }),
        },
      },
    },
  },
});

// Register the PUT /users/{id} endpoint for OpenAPI documentation
registry.registerPath({
  method: "put",
  path: "/api/v1/users/:id",
  summary: "Update user by ID",
  description: "Updates an existing user's information.",
  request: {
    params: z.object({ id: userParamsSchema }),
    body: {
      content: {
        "application/json": {
          schema: updateUserSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "User updated successfully",
      content: {
        "application/json": {
          schema: createUserSchema, // Using createUserSchema as userResponseSchema is not exported
        },
      },
    },
    400: {
      description: "Invalid input provided",
    },
    404: {
      description: "User not found",
    },
  },
});

// Register the DELETE /users/{id} endpoint for OpenAPI documentation
registry.registerPath({
  method: "delete",
  path: "/api/v1/users/:id",
  summary: "Delete user by ID",
  description: "Deletes a user from the system.",
  request: {
    params: z.object({ id: userParamsSchema }),
  },
  responses: {
    204: {
      description: "User deleted successfully",
    },
    404: {
      description: "User not found",
    },
  },
});

// --- Express Routes ---
userRouter.post("/", validateCreateUser, userController.createUser);

userRouter.get("/", userController.listUsers);

userRouter.get("/:id", validateGetUser, userController.getUser);

userRouter.put(
  "/:id",
  validateUpdateUser, // validateUpdateUser includes params and body validation
  userController.updateUser,
);

userRouter.delete("/:id", validateDeleteUser, userController.deleteUser);

export default userRouter;
