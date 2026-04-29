import mongoose from "mongoose";

const NOTIFICATION_TYPES = [
	"like",
	"comment",
	"connectionAccepted",
	"message",
	"applicationSubmitted",
	"applicationStatusUpdated",
	"targetedJob",
];

const TYPE_REQUIREMENTS = {
	like: ["relatedUser", "relatedPost"],
	comment: ["relatedUser", "relatedPost"],
	connectionAccepted: ["relatedUser"],
	message: ["relatedUser", "relatedMessage"],
	applicationSubmitted: ["relatedUser", "relatedJob", "relatedApplication"],
	applicationStatusUpdated: ["relatedUser", "relatedJob", "relatedApplication"],
	targetedJob: ["relatedUser", "relatedJob"],
};

const notificationSchema = new mongoose.Schema(
	{
		recipient: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: NOTIFICATION_TYPES,
		},
		relatedUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		relatedPost: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
		relatedMessage: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
		},
		relatedJob: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Job",
		},
		relatedApplication: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Application",
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
		read: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

notificationSchema.pre("validate", function enforceNotificationStructure(next) {
	const requiredFields = TYPE_REQUIREMENTS[this.type] || [];

	for (const field of requiredFields) {
		if (!this[field]) {
			this.invalidate(
				field,
				`${field} is required for ${this.type} notifications`,
			);
		}
	}

	if (
		this.type === "applicationStatusUpdated" &&
		!String(this.metadata?.status || "").trim()
	) {
		this.invalidate(
			"metadata.status",
			"metadata.status is required for applicationStatusUpdated notifications",
		);
	}

	next();
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
