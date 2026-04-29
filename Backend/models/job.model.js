import mongoose from "mongoose";

const normalizeTargetValue = (value) => {
	if (typeof value !== "string") return "";
	return value.trim().toLowerCase();
};

const normalizeTargetArray = (values = []) => {
	const unique = new Set();
	for (const value of values) {
		const normalized = normalizeTargetValue(value);
		if (normalized) {
			unique.add(normalized);
		}
	}
	return Array.from(unique);
};

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
		visibilityType: {
			type: String,
			enum: ["public", "targeted"],
			default: "public",
			required: true,
		},
		targetColleges: {
			type: [String],
			default: [],
			set: normalizeTargetArray,
		},
		targetCities: {
			type: [String],
			default: [],
			set: normalizeTargetArray,
		},
		publishAt: { type: Date, required: true, default: Date.now },
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
		viewCount: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: true }
);

jobSchema.index({ companyId: 1, createdAt: -1 });
jobSchema.index({ isActive: 1, jobType: 1, location: 1, createdAt: -1 });
jobSchema.index({ isActive: 1, publishAt: 1, createdAt: -1 });
jobSchema.index({ visibilityType: 1, targetColleges: 1, publishAt: 1, isActive: 1 });
jobSchema.index({ visibilityType: 1, targetCities: 1, publishAt: 1, isActive: 1 });

const Job = mongoose.model("Job", jobSchema);
export default Job;
