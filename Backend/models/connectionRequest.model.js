import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema(
	{
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		recipient: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "accepted", "rejected"],
			default: "pending",
		},
	},
	{ timestamps: true }
);

connectionRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });
connectionRequestSchema.index(
	{ sender: 1, recipient: 1, status: 1 },
	{ unique: true, partialFilterExpression: { status: "pending" } }
);

const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequest;
