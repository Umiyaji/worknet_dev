import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const { SMTP_USER, SMTP_PASS, SENDER_NAME, SENDER_EMAIL } = process.env;

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sender = `${SENDER_NAME || "Worknet"} <${SENDER_EMAIL || SMTP_USER}>`;
