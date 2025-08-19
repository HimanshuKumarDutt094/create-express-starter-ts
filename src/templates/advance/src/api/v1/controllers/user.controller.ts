import { db } from "@/drizzle/index.js";
import { user } from "@/drizzle/schema.js";
import { AuthedRequest } from "@/types/type.js";
import { sendError, sendSuccess } from "@/utils/api-response.js";
import { tryCatch } from "@/utils/try-catch";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import type { UpdateUserInput, UserParams } from "../schemas/user.schema.js";

export const userController = {
  listUsers: async (_req: Request, res: Response) => {
    const { data, error } = await tryCatch(
      db
        .select({
          id: user.id,
          name: user.name,
          age: user.age,
          email: user.email,
        })
        .from(user)
    );
    if (error) {
      return sendError(res, error.message, "FETCH_USERS_FAILED", 500);
    }
    return sendSuccess(res, data);
  },

  getUser: async (req: Request<UserParams>, res: Response) => {
    const { data: userData, error } = await tryCatch(
      db
        .select({
          id: user.id,
          name: user.name,
          age: user.age,
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, req.params.id))
    );
    if (error) {
      return sendError(res, error.message, "FETCH_USER_FAILED", 400);
    }
    if (!userData || userData.length === 0) {
      return sendError(res, "User not found", "USER_NOT_FOUND", 404);
    }
    return sendSuccess(res, userData);
  },

  updateUser: async (req: AuthedRequest<UserParams, {}, UpdateUserInput>, res: Response) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return sendError(res, "No fields to update", "NO_FIELDS_TO_UPDATE", 400);
    }
    const { data: users, error } = await tryCatch(
      db.select().from(user).where(eq(user.id, req.params.id))
    );
    if (error) {
      return sendError(res, error.message, "FETCH_USER_FAILED", 400);
    }
    if (!users || users.length === 0) {
      return sendError(res, "User not found", "USER_NOT_FOUND", 404);
    }

    const updatedUser = {
      ...users[0],
      ...req.body,
    };
    const { data: userData, error: updateError } = await tryCatch(
      db
        .update(user)
        .set({
          name: updatedUser.name,
          age: updatedUser.age,
          email: updatedUser.email,
        })
        .where(eq(user.id, req.params.id))
        .returning()
    );
    if (updateError) {
      return sendError(res, updateError.message, "UPDATE_USER_FAILED", 400);
    }
    return sendSuccess(res, userData);
  },

  deleteUser: async (req: Request<UserParams>, res: Response) => {
    const { data: userData, error } = await tryCatch(
      db.select().from(user).where(eq(user.id, req.params.id))
    );
    if (error) {
      return sendError(res, error.message, "FETCH_USER_FAILED", 400);
    }
    if (!userData || userData.length === 0) {
      return sendError(res, "User not found", "USER_NOT_FOUND", 404);
    }
    const { data: deletedUser, error: deleteError } = await tryCatch(
      db.delete(user).where(eq(user.id, req.params.id)).returning()
    );
    if (deleteError) {
      return sendError(res, deleteError.message, "DELETE_USER_FAILED", 400);
    }
    return sendSuccess(res, {
      message: "User deleted successfully",
      user: deletedUser ? deletedUser[0] : null,
    });
  },
};
