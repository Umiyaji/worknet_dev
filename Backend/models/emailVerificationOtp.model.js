import mongoose from "mongoose";

const emailVerificationOtpSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		name: {
			type: String,
			default: "",
			trim: true,
		},
		otpCode: {
			type: String,
			required: true,
			trim: true,
		},
		verified: {
			type: Boolean,
			default: false,
		},
		lastSentAt: {
			type: Date,
			default: Date.now,
		},
		expiresAt: {
			type: Date,
			required: true,
			index: { expires: 0 },
		},
	},
	{ timestamps: true }
);

const EmailVerificationOtp = mongoose.model("EmailVerificationOtp", emailVerificationOtpSchema);

export default EmailVerificationOtp;
