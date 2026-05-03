import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import searchRoutes from "./routes/search.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import aiRoutes from "./routes/ai.route.js";
import notificationRoutes from "./routes/notification.route.js";
import connectionRoutes from "./routes/connection.route.js";
import messageRoutes from "./routes/message.route.js";
import jobRoutes from "./routes/job.route.js";
import recruiterRoutes from "./routes/recruiter.route.js";
import jobRowRoutes from "./routes/jobRow.route.js";
import lookupRoutes from "./routes/lookup.route.js";
import { createSocketServer } from "./lib/socket.js";
import { startJobRowScheduler } from "./lib/jobRowScheduler.js";
import {
	basicSecurityHeaders,
	rateLimit,
	requestTimeout,
	sanitizeRequest,
} from "./middleware/reliability.middleware.js";

import { connectDB } from "./lib/db.js";

dotenv.config();
const allowedOrigins = String(process.env.CLIENT_URL || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);
const allowLocalhostOriginsInProd = String(process.env.ALLOW_LOCALHOST_ORIGINS || "").toLowerCase() === "true";
const allowNoOriginInDev = process.env.NODE_ENV !== "production";
const localhostOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

if (!process.env.JWT_SECRET) {
	throw new Error("Missing required env var: JWT_SECRET");
}
if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
	throw new Error("Missing required env var: CLIENT_URL in production");
}

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();
const server = createSocketServer(app);

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(requestTimeout);
app.use(basicSecurityHeaders);
app.use(
	cors({
		origin(origin, callback) {
			if (!origin && allowNoOriginInDev) {
				return callback(null, true);
			}
			if (origin && allowedOrigins.includes(origin)) {
				return callback(null, true);
			}
			if (origin && allowLocalhostOriginsInProd && localhostOriginRegex.test(origin)) {
				return callback(null, true);
			}
			return callback(new Error("CORS not allowed"));
		},
		credentials: true,
	})
);

app.use(rateLimit);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "5mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || "5mb" }));
app.use(sanitizeRequest);
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/connections", connectionRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/recruiter", recruiterRoutes);
app.use("/api/v1/job-rows", jobRowRoutes);
app.use("/api/v1/lookups", lookupRoutes);

if (process.env.NODE_ENV === "production") {
	const pathToFrontend = path.join(__dirname, "..", "Frontend", "dist");

	app.use(express.static(pathToFrontend));

	app.get(/.*/, (req, res) => {
		res.sendFile(path.resolve(pathToFrontend, "index.html"));
	});
}


const startServer = async () => {
	try {
		await connectDB();
		startJobRowScheduler();
		server.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (err) {
		console.error("Failed to connect to MongoDB", err);
		process.exit(1);
	}
};

startServer();

const shutdown = (signal) => {
	console.log(`${signal} received. Closing server...`);
	server.close(() => {
		console.log("HTTP server closed");
		process.exit(0);
	});

	setTimeout(() => {
		console.error("Forced shutdown after timeout");
		process.exit(1);
	}, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
