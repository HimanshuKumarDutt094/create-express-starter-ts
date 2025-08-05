import { Router } from "express";
import {
  validateCreateUser,
  validateUpdateUser,
  validateGetUser,
  validateDeleteUser,
} from "../validators/user.validators.js";
import { userController } from "../controllers/user.controller.js";

const router = Router();

router.get("/", userController.listUsers);
router.post("/", validateCreateUser, userController.createUser);
router.get("/:id", validateGetUser, userController.getUser);
router.patch("/:id", validateUpdateUser, userController.updateUser);
router.delete("/:id", validateDeleteUser, userController.deleteUser);

export default router;
