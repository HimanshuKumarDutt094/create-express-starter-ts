import { db } from "@/drizzle/index.js";
import { usersTable } from "@/drizzle/schema.js";
import { sendError, sendSuccess } from "@/utils/api-response.js";
import { tryCatch } from "@/utils/try-catch";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserParams,
} from "../schemas/user.schema.js";

export const userController = {
  listUsers: async (_req: Request, res: Response) => {
    const { data, error } = await tryCatch(
      db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          age: usersTable.age,
          email: usersTable.email,
        })
        .from(usersTable),
    );
    if (error) {
      return sendError(res, error.message, "FETCH_USERS_FAILED", 500);
    }
    return sendSuccess(res, data);
  },

  createUser: async (req: Request<{}, {}, CreateUserInput>, res: Response) => {
    const { data: user, error } = await tryCatch(
      db
        .insert(usersTable)
        .values({
          name: req.body.name,
          age: req.body.age,
          email: req.body.email,
        })
        .returning(),
    );
    if (error) {
      return sendError(res, error.message, "CREATE_USER_FAILED", 400);
    }
    return sendSuccess(res, user, 201);
  },

  getUser: async (req: Request<UserParams>, res: Response) => {
    const { data: user, error } = await tryCatch(
      db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          age: usersTable.age,
          email: usersTable.email,
        })
        .from(usersTable)
        .where(eq(usersTable.id, req.params.id)),
    );
    if (error) {
      return sendError(res, error.message, "FETCH_USER_FAILED", 400);
    }
    if (!user || user.length === 0) {
      return sendError(res, "User not found", "USER_NOT_FOUND", 404);
    }
    return sendSuccess(res, user);
  },

  updateUser: async (
    req: Request<UserParams, {}, UpdateUserInput>,
    res: Response,
  ) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return sendError(res, "No fields to update", "NO_FIELDS_TO_UPDATE", 400);
    }
    const { data: users, error } = await tryCatch(
      db.select().from(usersTable).where(eq(usersTable.id, req.params.id)),
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
    const { data: user, error: updateError } = await tryCatch(
      db
        .update(usersTable)
        .set({
          name: updatedUser.name,
          age: updatedUser.age,
          email: updatedUser.email,
        })
        .where(eq(usersTable.id, req.params.id))
        .returning(),
    );
    if (updateError) {
      return sendError(res, updateError.message, "UPDATE_USER_FAILED", 400);
    }
    return sendSuccess(res, user);
  },

  deleteUser: async (req: Request<UserParams>, res: Response) => {
    const { data: user, error } = await tryCatch(
      db.select().from(usersTable).where(eq(usersTable.id, req.params.id)),
    );
    if (error) {
      return sendError(res, error.message, "FETCH_USER_FAILED", 400);
    }
    if (!user || user.length === 0) {
      return sendError(res, "User not found", "USER_NOT_FOUND", 404);
    }
    const { data: deletedUser, error: deleteError } = await tryCatch(
      db.delete(usersTable).where(eq(usersTable.id, req.params.id)).returning(),
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
