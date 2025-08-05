import { z } from "zod";

// Body schemas
export const createUserSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }),
  age: z.coerce
    .number()
    .int()
    .positive({ error: "Age must be a positive integer" }),
  email: z.email({ error: "Invalid email" }),
});

export const updateUserSchema = createUserSchema.partial();

// Params schema
export const userParamsSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive({ error: "id must be a positive integer" }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserParams = z.infer<typeof userParamsSchema>;
