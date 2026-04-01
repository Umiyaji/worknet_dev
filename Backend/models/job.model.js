import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
	{
		companyName: { type: String, required: true, trim: true },
		title: { type: String, required: true, trim: true },
		description: { type: String, required: true, trim: true },
		skillsRequired: [{ type: String, trim: true }],
		experienceRequired: { type: String, required: true, trim: true },
		location: { type: String, required: true, trim: true },
		jobType: {
			type: String,
			enum: ["remote", "on-site", "hybrid"],
			required: true,
		},
		salaryRange: { type: String, default: "", trim: true },
		lastDateToApply: { type: Date, required: true },
		companyId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

jobSchema.index({ companyId: 1, createdAt: -1 });
jobSchema.index({ isActive: 1, jobType: 1, location: 1, createdAt: -1 });

const Job = mongoose.model("Job", jobSchema);
export default Job;
