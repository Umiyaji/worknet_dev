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
		media: [
			{
				url: { type: String, trim: true },
				type: { type: String, enum: ["image"], default: "image" },
			},
		],
		mentions: [{ type: String, trim: true }],
		hashtags: [{ type: String, trim: true }],
		editHistory: [
			{
				editedAt: { type: Date, default: Date.now },
				previousContent: { type: String, default: "" },
			},
		],
		viewCount: { type: Number, default: 0 },
		shareCount: { type: Number, default: 0 },
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
postSchema.index({ author: 1, publishAt: -1, createdAt: -1 });
postSchema.index({ "jobDetails.visibilityType": 1, publishAt: -1, createdAt: -1 });
postSchema.index({ "jobDetails.targetColleges": 1, publishAt: -1 });
postSchema.index({ "jobDetails.targetCities": 1, publishAt: -1 });
postSchema.index(
	{ author: 1, "jobDetails.source": 1, "jobDetails.sourceRowId": 1 },
	{
		unique: true,
		partialFilterExpression: {
			postType: "job",
			"jobDetails.source": { $exists: true },
			"jobDetails.sourceRowId": { $exists: true },
		},
	}
);

const Post = mongoose.model("Post", postSchema);

export default Post;
