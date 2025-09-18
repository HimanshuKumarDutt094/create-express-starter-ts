import { db } from "@/drizzle/index.js";
import { user } from "@/drizzle/schema.js";
import { createLogger } from "@/services/logger";
import { userStore } from "@/services/valkey-store.js";
import { AuthedRequest } from "@/types/type.js";
import { sendError, sendSuccess } from "@/utils/api-response.js";
import { tryCatch } from "@/utils/try-catch";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import type { UpdateUserInput, User, UserParams } from "../schemas/user.schema.js";

const logger = createLogger("UserController");

// Helper function to transform database user to response format
const transformUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  age: dbUser.age,
  createdAt: dbUser.createdAt,
  updatedAt: dbUser.updatedAt,
});

export const userController = {
  listUsers: async (_req: Request, res: Response) => {
    // For listing users, we typically don't want to cache the entire list
    // as it can become stale quickly and take up a lot of memory
    const { data, error } = await tryCatch(
      db
        .select({
          id: user.id,
          name: user.name,
          age: user.age,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .orderBy(user.createdAt)
    );

    if (error) {
      logger.error("Error fetching users", { error });
      return sendError(res, error.message, "FETCH_USERS_FAILED", 500);
    }

    // Defensive: ensure `data` is an array before using array methods.
    // Some drivers/clients might return `null`/`undefined` when there are
    // no rows. Coerce to an array so `.map` is safe.
    const rows = Array.isArray(data) ? data : (data ? [data] : []);

    if (rows.length === 0) {
      logger.debug("No users found, returning empty array");
      return sendSuccess(res, []);
    }

    // Transform database users to response format
    const users = rows.map(transformUser);
    logger.debug(`Fetched ${users.length} users`);
    return sendSuccess(res, users);
  },

  getUser: async (req: Request<UserParams>, res: Response) => {
    const { id } = req.params;
    logger.info("Fetching user", { userId: id });

    try {
      // Try to get user from cache first
      const cachedUser = await userStore.get(id);
      if (cachedUser) {
        logger.debug("Cache hit", { userId: id });
        return sendSuccess(res, transformUser(cachedUser));
      }
      logger.debug("Cache miss, querying database", { userId: id });

      // If not in cache, fetch from database
      const { data: userDataFromDb, error } = await tryCatch(
        db
          .select({
            id: user.id,
            name: user.name,
            age: user.age,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })
          .from(user)
          .where(eq(user.id, id))
          .limit(1)
      );

      if (error) {
        logger.error("Database error when fetching user", { userId: id, error });
        throw new Error(error.message);
      }

      if (!userDataFromDb || userDataFromDb.length === 0) {
        logger.warn("User not found", { userId: id });
        return sendError(res, "User not found", "USER_NOT_FOUND", 404);
      }

      const dbUser = userDataFromDb[0];
      const userResponse = transformUser(dbUser);

      // Cache the user data
      const { id: _, ...userDataToCache } = userResponse;
      await userStore.set(id, userDataToCache);
      logger.debug("Cached user", { userId: id });

      return sendSuccess(res, userResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch user";
      logger.error("Error fetching user", { userId: id, error: errorMessage });
      return sendError(res, errorMessage, "FETCH_USER_FAILED", 400);
    }
  },

  updateUser: async (req: AuthedRequest<UserParams, {}, UpdateUserInput>, res: Response) => {
    const { id } = req.params;
    const userId = req.auth?.user?.id;
    logger.info("Updating user", { userId: id, updaterId: userId });

    if (!req.body || Object.keys(req.body).length === 0) {
      logger.error("No fields to update", { userId: id });
      return sendError(res, "No fields to update", "NO_FIELDS_TO_UPDATE", 400);
    }

    try {
      // First check if user exists
      const { data: users, error: fetchError } = await tryCatch(
        db.select().from(user).where(eq(user.id, id)).limit(1)
      );

      if (fetchError) {
        logger.error("Database error when fetching user for update", {
          userId: id,
          error: fetchError,
        });
        throw new Error(fetchError.message);
      }

      if (!users || users.length === 0) {
        logger.warn("User not found", { userId: id });
        return sendError(res, "User not found", "USER_NOT_FOUND", 404);
      }

      const currentUser = users[0];
      const updatedFields = { ...req.body, updatedAt: new Date() };

      // Update user in database
      const { data: updatedUsers, error: updateError } = await tryCatch(
        db.update(user).set(updatedFields).where(eq(user.id, id)).returning()
      );

      if (updateError) {
        logger.error("Error updating user in database", { userId: id, error: updateError });
        throw new Error(updateError.message);
      }

      if (!updatedUsers || updatedUsers.length === 0) {
        logger.error("Failed to update user", { userId: id });
        throw new Error("Failed to update user");
      }

      const updatedUser = transformUser(updatedUsers[0]);

      // Invalidate cache
      await userStore.del(id);
      logger.debug("Invalidated user cache", { userId: id });

      return sendSuccess(res, updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user";
      logger.error("Error updating user", { userId: id, error: errorMessage });
      return sendError(res, errorMessage, "UPDATE_USER_FAILED", 400);
    }
  },

  deleteUser: async (req: Request<UserParams>, res: Response) => {
    const { id } = req.params;
    logger.info("Deleting user", { userId: id });

    try {
      // First check if user exists
      const { data: userData, error: fetchError } = await tryCatch(
        db.select().from(user).where(eq(user.id, id)).limit(1)
      );

      if (fetchError) {
        logger.error("Database error when fetching user for deletion", {
          userId: id,
          error: fetchError,
        });
        throw new Error(fetchError.message);
      }

      if (!userData || userData.length === 0) {
        logger.warn("User not found for deletion", { userId: id });
        return sendError(res, "User not found", "USER_NOT_FOUND", 404);
      }

      // Delete from database
      const { error: deleteError } = await tryCatch(db.delete(user).where(eq(user.id, id)));

      if (deleteError) {
        logger.error("Error deleting user from database", { userId: id, error: deleteError });
        throw new Error(deleteError.message);
      }

      // Invalidate cache
      await userStore.del(id);
      logger.debug("Invalidated user cache", { userId: id });

      return res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
      logger.error("Error deleting user", { userId: id, error: errorMessage });
      return sendError(res, errorMessage, "DELETE_USER_FAILED", 400);
    }
  },
};
