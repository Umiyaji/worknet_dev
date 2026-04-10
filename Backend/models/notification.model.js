import mongoose from "mongoose";

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
			enum: [
				"like",
				"comment",
				"connectionAccepted",
				"message",
				"applicationSubmitted",
				"applicationStatusUpdated",
				"targetedJob",
			],
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

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
