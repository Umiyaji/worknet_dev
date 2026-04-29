import express from "express";
import { getTargetLists } from "../controllers/lookup.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protected - only authenticated users can fetch lookup lists
router.get("/targets", protectRoute, getTargetLists);

import { getFeedStats } from "../controllers/lookup.controller.js";

// Feed stats (counts for feed posts and suggested people)
router.get("/feed-stats", protectRoute, getFeedStats);

export default router;
