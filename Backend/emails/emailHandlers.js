import { sender, transporter } from "../lib/nodemailer.js";
import path from "path";
import { fileURLToPath } from "url";
import {
	createWelcomeEmailTemplate,
	createSignupOtpEmailTemplate,
} from "./emailTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, "../../Frontend/public/favicon-logo1.png");

const sharedAttachments = [
	{
		filename: "favicon-logo1.png",
		path: logoPath,
		cid: "worknet-logo",
	},
];

export const sendWelcomeEmail = async (email, name, profileUrl) => {

	try {
		const response = await transporter.sendMail({
			from: sender,
			to: email,
			subject: "Welcome to Worknet!",
			html: createWelcomeEmailTemplate(name, profileUrl),
			attachments: sharedAttachments,
			category: "welcome",
		});

		console.log("Welcome Email sent successfully", response);
	} catch (error) {
		throw error;
	}
};

export const sendSignupOtpEmail = async (email, name, otpCode) => {
	try {
		const appUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
		const response = await transporter.sendMail({
			from: sender,
			to: email,
			subject: "Your Worknet verification code",
			html: createSignupOtpEmailTemplate(name, otpCode, appUrl),
			attachments: sharedAttachments,
			category: "email-verification",
		});

		console.log("Signup OTP Email sent successfully", response);
	} catch (error) {
		throw error;
	}
};
