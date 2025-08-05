import { validateRequest } from "zod-express-middleware";
import {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
} from "@/api/v1/schemas/user.schema.js";

export const validateCreateUser = validateRequest({ body: createUserSchema });
export const validateUpdateUser = validateRequest({
  params: userParamsSchema,
  body: updateUserSchema,
});
export const validateGetUser = validateRequest({ params: userParamsSchema });
export const validateDeleteUser = validateRequest({ params: userParamsSchema });
