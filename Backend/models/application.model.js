import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		jobId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Job",
			required: true,
			index: true,
		},
		coverLetter: {
			type: String,
			default: "",
			trim: true,
		},
		fullName: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		currentLocation: {
			type: String,
			default: "",
			trim: true,
		},
		yearsOfExperience: {
			type: String,
			default: "",
			trim: true,
		},
		portfolioUrl: {
			type: String,
			default: "",
			trim: true,
		},
		linkedinUrl: {
			type: String,
			default: "",
			trim: true,
		},
		resumeUrl: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			enum: ["applied", "reviewing", "shortlisted", "rejected", "hired"],
			default: "applied",
		},
		recruiterNotes: {
			type: String,
			default: "",
			trim: true,
		},
		tags: {
			type: [String],
			default: [],
		},
		interviewSchedule: {
			scheduledAt: { type: Date, default: null },
			mode: { type: String, default: "", trim: true },
			meetingLink: { type: String, default: "", trim: true },
			notes: { type: String, default: "", trim: true },
		},
		rejectionTemplateUsed: {
			type: String,
			default: "",
			trim: true,
		},
		lastStatusUpdatedAt: {
			type: Date,
			default: Date.now,
		},
		lastStatusUpdatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		statusHistory: [
			{
				status: {
					type: String,
					enum: ["applied", "reviewing", "shortlisted", "rejected", "hired"],
					required: true,
				},
				note: {
					type: String,
					default: "",
					trim: true,
				},
				changedBy: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
				},
				changedAt: {
					type: Date,
					default: Date.now,
				},
			},
		],
	},
	{ timestamps: true }
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ jobId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, createdAt: -1 });

const Application = mongoose.model("Application", applicationSchema);
export default Application;
