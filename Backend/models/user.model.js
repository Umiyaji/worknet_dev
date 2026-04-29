import mongoose from "mongoose";

const normalizeProfileTarget = (value) => {
	if (typeof value !== "string") return "";
	return value.trim().toLowerCase();
};

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		username: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		role: {
			type: String,
			enum: ["user", "recruiter"],
			default: "user",
		},
		profilePicture: {
			type: String,
			default: "",
		},
		bannerImg: {
			type: String,
			default: "",
		},
		headline: {
			type: String,
			default: "Worknet User",
		},
		location: {
			type: String,
			default: "India",
		},
		college: {
			type: String,
			default: "",
			set: normalizeProfileTarget,
			trim: true,
		},
		city: {
			type: String,
			default: "",
			set: normalizeProfileTarget,
			trim: true,
		},
		currentCompany: {
			type: String,
			default: "",
		},
		about: {
			type: String,
			default: "",
		},
		skills: [String],
		resume: {
			type: String,
			default: "",
		},
		companyName: {
			type: String,
			default: "",
			trim: true,
		},
		companyWebsite: {
			type: String,
			default: "",
			trim: true,
		},
		companySize: {
			type: String,
			default: "",
			trim: true,
		},
		industry: {
			type: String,
			default: "",
			trim: true,
		},
		companyLocation: {
			type: String,
			default: "",
			trim: true,
		},
		companyLogo: {
			type: String,
			default: "",
		},
		companyBanner: {
			type: String,
			default: "",
		},
		aboutCompany: {
			type: String,
			default: "",
			trim: true,
		},
		HRName: {
			type: String,
			default: "",
			trim: true,
		},
		experience: [
			{
				title: { type: String },
				company: { type: String },
				startDate: { type: Date },
				endDate: { type: Date },
				description: { type: String },
			},
		],
		education: [
			{
				school: { type: String },
				fieldOfStudy: { type: String },
				startYear: { type: Number },
				endYear: { type: Number },
			},
		],
		connections: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		profileViewsCount: {
			type: Number,
			default: 0,
		},
		recruiterRejectionTemplates: {
			type: [String],
			default: [
				"Thank you for applying. After review, we are moving forward with candidates whose background aligns more closely with this role right now.",
				"We appreciate your time and interest. At this stage, we selected candidates with more direct experience for this position.",
			],
		},
	},
	{ timestamps: true }
);

userSchema.index({ college: 1 });
userSchema.index({ city: 1 });
userSchema.index({ role: 1, college: 1 });
userSchema.index({ role: 1, city: 1 });
userSchema.index({ name: "text", username: "text" });

const User = mongoose.model("User", userSchema);

export default User;
