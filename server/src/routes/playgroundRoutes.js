import { Router } from "express";
import {
  getResources,
  getSchema,
} from "../controllers/playgroundController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/schema", asyncHandler(getSchema));
router.get("/resources", asyncHandler(getResources));

export default router;
