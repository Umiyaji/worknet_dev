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
import { createSocketServer } from "./lib/socket.js";
import { startJobRowScheduler } from "./lib/jobRowScheduler.js";

import { connectDB } from "./lib/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();
const server = createSocketServer(app);

app.use(
	cors({
		origin: process.env.CLIENT_URL,
		credentials: true,
	})
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

if (process.env.NODE_ENV === "production") {
	const pathToFrontend = path.join(__dirname, "..", "worknet-frontend", "dist");

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
