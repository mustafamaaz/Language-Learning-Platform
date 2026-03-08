import { Router } from "express";
import {
  googleLogin,
  refresh,
  logout,
  me,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/google", asyncHandler(googleLogin));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));
router.get("/me", authenticate, asyncHandler(me));

export default router;
