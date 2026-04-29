import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { protectAutomationRoute } from "../middleware/automation.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import {
	createAutomatedJobPost,
	createPost,
	getFeedPosts,
	getUserPosts,
	updatePost,
	deletePost,
	getPostById,
	createComment,
	deleteComment,
	likePost,
	trackPostShare,
} from "../controllers/post.controller.js";

const router = express.Router();

router.post("/automation/create-job-post", protectAutomationRoute, createAutomatedJobPost);
router.get("/", protectRoute, getFeedPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.post("/create", protectRoute, uploadSingle, createPost);
router.put("/update/:id", protectRoute, updatePost);
router.delete("/delete/:id", protectRoute, deletePost);
router.get("/:id", protectRoute, getPostById);
router.post("/:id/comment", protectRoute, createComment);
router.delete("/:postId/comments/:commentId", protectRoute, deleteComment);
router.post("/:id/like", protectRoute, likePost);
router.post("/:id/share", protectRoute, trackPostShare);

export default router;
