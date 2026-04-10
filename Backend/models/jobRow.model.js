import mongoose from "mongoose";
import { randomUUID } from "crypto";

const jobRowLogSchema = new mongoose.Schema(
	{
		event: { type: String, required: true, trim: true },
		message: { type: String, trim: true, default: "" },
		createdAt: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const jobRowSchema = new mongoose.Schema(
	{
		recruiterId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		uniqueRowId: {
			type: String,
			trim: true,
			required: true,
			default: () => randomUUID(),
		},
		jobTitle: { type: String, required: true, trim: true },
		companyName: { type: String, required: true, trim: true },
		location: { type: String, required: true, trim: true },
		experienceRequired: { type: String, required: true, trim: true },
		skillsRequired: [{ type: String, trim: true }],
		jobType: {
			type: String,
			enum: ["remote", "on-site", "hybrid"],
			default: "hybrid",
		},
		visibilityType: {
			type: String,
			enum: ["public", "targeted"],
			default: "public",
		},
		targetColleges: {
			type: [String],
			default: [],
		},
		targetCities: {
			type: [String],
			default: [],
		},
		salaryRange: { type: String, trim: true, default: "" },
		lastDateToApply: { type: Date, required: true },
		autoPostApproved: { type: Boolean, default: false, index: true },
		autoPostAt: { type: Date, default: null, index: true },
		status: {
			type: String,
			enum: ["draft", "scheduled", "posted", "error"],
			default: "draft",
			index: true,
		},
		isProcessed: { type: Boolean, default: false, index: true },
		postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
		jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
		processingLock: { type: Boolean, default: false },
		processingLockedAt: { type: Date, default: null },
		processedAt: { type: Date, default: null },
		retryCount: { type: Number, default: 0, min: 0 },
		nextRetryAt: { type: Date, default: null },
		lastError: { type: String, trim: true, default: "" },
		logs: { type: [jobRowLogSchema], default: [] },
	},
	{ timestamps: true }
);

jobRowSchema.index({ recruiterId: 1, uniqueRowId: 1 }, { unique: true });
jobRowSchema.index({ recruiterId: 1, status: 1, isProcessed: 1, updatedAt: -1 });
jobRowSchema.index({ recruiterId: 1, status: 1, autoPostApproved: 1, autoPostAt: 1, isProcessed: 1 });

const JobRow = mongoose.model("JobRow", jobRowSchema);
export default JobRow;
