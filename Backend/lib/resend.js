import { Resend } from 'resend';
import dotenv from "dotenv";

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
    console.warn("RESEND_API_KEY is missing. Email delivery will be disabled.");
}

export const resend = new Resend(resendApiKey);

export const sender = process.env.SENDER_EMAIL || "onboarding@resend.dev";
