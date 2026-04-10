import mongoose from "mongoose";

const jobDetailsSchema = new mongoose.Schema(
	{
		companyName: { type: String, trim: true },
		role: { type: String, trim: true },
		totalOpenings: { type: Number, min: 1 },
		experienceRequired: { type: String, trim: true },
		workMode: {
			type: String,
			enum: ["Remote", "In Office", "Hybrid"],
		},
		officeLocation: { type: String, trim: true },
		skillsRequired: [{ type: String, trim: true }],
		lastDateToApply: { type: Date },
		visibilityType: {
			type: String,
			enum: ["public", "targeted"],
			default: "public",
		},
		targetColleges: [{ type: String, trim: true }],
		targetCities: [{ type: String, trim: true }],
		source: { type: String, trim: true },
		sourceRowId: { type: String, trim: true },
	},
	{ _id: false }
);

const postSchema = new mongoose.Schema(
	{
		author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		postType: {
			type: String,
			enum: ["normal", "job"],
			default: "normal",
		},
		content: { type: String },
		image: { type: String },
		publishAt: { type: Date, required: true, default: Date.now },
		relatedJob: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null, index: true },
		jobDetails: { type: jobDetailsSchema, default: null },
		likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
		comments: [
			{
				content: { type: String },
				user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
				createdAt: { type: Date, default: Date.now },
			},
		],
	},
	{ timestamps: true }
);

postSchema.index({ postType: 1, publishAt: -1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
