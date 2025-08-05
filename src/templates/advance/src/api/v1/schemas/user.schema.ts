import { z } from "zod";

// Body schemas
export const createUserSchema = z
  .object({
    name: z.string().min(1, { error: "Name is required" }).meta({
      description: "Name of the user",
      example: "John Doe",
    }),
    age: z.coerce
      .number()
      .int()
      .positive({ error: "Age must be a positive integer" })
      .meta({
        description: "Age of the user",
        example: 30,
      }),
    email: z.email({ error: "Invalid email" }).meta({
      description: "Email address of the user",
      example: "test@gmail.com",
    }),
  })
  .meta({
    description: "Schema for creating a new user",
  });

export const updateUserSchema = createUserSchema.partial().meta({
  description: "Schema for updating an existing user. All fields are optional.",
});

// Params schema
export const userParamsSchema = z
  .object({
    id: z.coerce
      .number()
      .int()
      .positive({ error: "id must be a positive integer" })
      .meta({
        description: "ID of the user",
        example: 1,
      }),
  })
  .meta({
    description: "Schema for user ID parameters",
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserParams = z.infer<typeof userParamsSchema>;
