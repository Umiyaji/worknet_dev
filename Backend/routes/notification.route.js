import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	bulkDeleteNotifications,
	deleteNotification,
	getUserNotifications,
	markAllNotificationsAsRead,
	markNotificationAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getUserNotifications);

router.delete("/", protectRoute, bulkDeleteNotifications);
router.put("/read-all", protectRoute, markAllNotificationsAsRead);
router.put("/:id/read", protectRoute, markNotificationAsRead);
router.delete("/:id", protectRoute, deleteNotification);

export default router;
