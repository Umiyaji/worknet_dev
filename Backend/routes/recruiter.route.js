import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { requireRecruiter } from "../middleware/recruiter.middleware.js";
import {
	getRecruiterDashboard,
	getRecruiterAnalytics,
	getRecruiterPublicProfile,
	getRejectionTemplates,
	saveRejectionTemplates,
	updateRecruiterCompanyProfile,
} from "../controllers/recruiter.controller.js";

const router = express.Router();

router.get("/company/:username", protectRoute, getRecruiterPublicProfile);
router.get("/dashboard", protectRoute, requireRecruiter, getRecruiterDashboard);
router.get("/analytics", protectRoute, requireRecruiter, getRecruiterAnalytics);
router.get("/rejection-templates", protectRoute, requireRecruiter, getRejectionTemplates);
router.put("/rejection-templates", protectRoute, requireRecruiter, saveRejectionTemplates);
router.put("/company-profile", protectRoute, requireRecruiter, updateRecruiterCompanyProfile);

export default router;
