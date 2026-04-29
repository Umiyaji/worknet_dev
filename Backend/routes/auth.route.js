import express from "express";
import {
  login,
  logout,
  signup,
  getCurrentUser,
  googleAuth,
  sendSignupOtp,
  verifySignupOtp,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/reliability.middleware.js";

const router = express.Router();

router.post("/signup", authRateLimit, signup);
router.post("/signup/send-otp", authRateLimit, sendSignupOtp);
router.post("/signup/verify-otp", authRateLimit, verifySignupOtp);
router.post("/login", authRateLimit, login);
router.post("/logout", logout);
router.post("/google", authRateLimit, googleAuth);

router.get("/me", protectRoute, getCurrentUser);

export default router;
