import { Router } from "express";
import { validate } from "../../middleware/zod";
import { createUserSchema, loginUserSchema } from "./auth.schema";
import AuthController from "./auth.controller";
import AuthMiddleware from "../../middleware/auth";

const router = Router();

router.post("/signup", validate(createUserSchema), AuthController.createUser);
router.post("/login", validate(loginUserSchema), AuthController.loginUser);
router.get(
  "/logout",
  AuthMiddleware.validateSession,
  AuthController.logoutUser,
);
router.get(
  "/restore",
  AuthMiddleware.validateSession,
  AuthController.restoreSession,
);
export default router;
