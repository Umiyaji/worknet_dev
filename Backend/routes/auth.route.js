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

const router = express.Router();

router.post("/signup", signup);
router.post("/signup/send-otp", sendSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);
router.post("/login", login);
router.post("/logout", logout);
router.post("/google", googleAuth);

router.get("/me", protectRoute, getCurrentUser);

export default router;
