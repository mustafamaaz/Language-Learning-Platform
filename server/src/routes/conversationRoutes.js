import { Router } from "express";
import { streamConversation, getConversationStatus } from "../controllers/conversationController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/conversation/status", asyncHandler(getConversationStatus));
router.post("/conversation", authenticate, asyncHandler(streamConversation));

export default router;
