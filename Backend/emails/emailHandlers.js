import { resend, sender } from "../lib/resend.js";
import {
	createWelcomeEmailTemplate,
	createSignupOtpEmailTemplate,
} from "./emailTemplates.js";

export const sendWelcomeEmail = async (email, name, profileUrl) => {
	try {
		await resend.emails.send({
			from: `Worknet <${sender}>`,
			to: email,
			subject: "Welcome to Worknet!",
			html: createWelcomeEmailTemplate(name, profileUrl),
		});
		console.log("Welcome Email sent successfully via Resend");
	} catch (error) {
		console.error("Error sending welcome email:", error.message);
		throw error;
	}
};

export const sendSignupOtpEmail = async (email, name, otpCode) => {
	try {
		const appUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
		await resend.emails.send({
			from: `Worknet <${sender}>`,
			to: email,
			subject: "Your Worknet verification code",
			html: createSignupOtpEmailTemplate(name, otpCode, appUrl),
		});
		console.log("Signup OTP Email sent successfully via Resend");
	} catch (error) {
		console.error("Error sending OTP email:", error.message);
		throw error;
	}
};
