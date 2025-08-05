import {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
} from "@/api/v1/schemas/user.schema.js";
import validateRequest from "express-zod-safe";

export const validateCreateUser = validateRequest({ body: createUserSchema });
export const validateUpdateUser = validateRequest({
  params: userParamsSchema,
  body: updateUserSchema,
});
export const validateGetUser = validateRequest({ params: userParamsSchema });
export const validateDeleteUser = validateRequest({ params: userParamsSchema });
