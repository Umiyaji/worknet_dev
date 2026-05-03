import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const { SMTP_USER, SMTP_PASS, SENDER_NAME, SENDER_EMAIL } = process.env;

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // port: 587,
    // secure: false,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

export const sender = `${SENDER_NAME || "Worknet"} <${SENDER_EMAIL || SMTP_USER}>`;

transporter.verify((error, success) => {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn("SMTP credentials are missing. Add SMTP_USER and SMTP_PASS in Backend/.env to enable email delivery.");
        return;
    }

    if (error) {
        console.error("SMTP connection error:", error);
    } else {
        console.log("SMTP server is ready to send emails");
    }
});
