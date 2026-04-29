import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
    getSuggestedConnections,
    getPublicProfile,
    getMyAnalytics,
    updateProfile,
    searchUsers,
    deleteProfilePicture,
    deleteBannerImage,
    deleteResume,
    uploadResume,
} from "../controllers/user.controller.js";
import { uploadResumeFile } from "../middleware/resumeUpload.middleware.js";

const router = express.Router();

// Protected GET routes
router.get("/search", protectRoute, searchUsers);
router.get("/suggestions", protectRoute, getSuggestedConnections);
router.get("/analytics/me", protectRoute, getMyAnalytics);
router.get("/:username", protectRoute, getPublicProfile);

// Protected DELETE routes
router.delete("/profile-picture", protectRoute, deleteProfilePicture);
router.delete("/banner-image", protectRoute, deleteBannerImage);
router.delete("/resume", protectRoute, deleteResume);
router.post("/resume", protectRoute, uploadResumeFile, uploadResume);

// Protected PUT route
router.put("/profile", protectRoute, updateProfile);

export default router;
