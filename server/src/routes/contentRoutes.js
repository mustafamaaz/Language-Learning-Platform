import { Router } from "express";
import {
  listLanguages,
  getAvailableTargets,
  getAvailableSources,
  listCurricula,
  getCurriculum,
  getCurriculumSection,
  createCurriculum,
  updateCurriculum,
  updateCurriculumSchema,
  updateCurriculumData,
  deleteCurriculum,
} from "../controllers/contentController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

const adminOnly = [authenticate, authorize("admin")];

// ── Languages (public reads) ────────────────────────────────
router.get("/languages", asyncHandler(listLanguages));
router.get("/languages/:code/targets", asyncHandler(getAvailableTargets));
router.get("/languages/:code/sources", asyncHandler(getAvailableSources));

// ── Curricula (public reads, admin writes) ──────────────────
router.get("/curricula", asyncHandler(listCurricula));
router.get("/curricula/:sourceCode/:targetCode", asyncHandler(getCurriculum));
router.get("/curricula/:sourceCode/:targetCode/sections/:proficiencyId/:sectionOrder", asyncHandler(getCurriculumSection));
router.post("/curricula/:sourceCode/:targetCode", ...adminOnly, asyncHandler(createCurriculum));
router.put("/curricula/:sourceCode/:targetCode", ...adminOnly, asyncHandler(updateCurriculum));
router.put("/curricula/:sourceCode/:targetCode/schema", ...adminOnly, asyncHandler(updateCurriculumSchema));
router.put("/curricula/:sourceCode/:targetCode/data", ...adminOnly, asyncHandler(updateCurriculumData));
router.delete("/curricula/:sourceCode/:targetCode", ...adminOnly, asyncHandler(deleteCurriculum));

export default router;
