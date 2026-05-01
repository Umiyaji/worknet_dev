import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../Backend/.env") });

const emailVerificationOtpSchema = new mongoose.Schema({
    email: String,
    otpCode: String,
});

const EmailVerificationOtp = mongoose.model("EmailVerificationOtp", emailVerificationOtpSchema);

async function getOtp() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const otp = await EmailVerificationOtp.findOne({ email: "testuser12345@gmail.com" });
        if (otp) {
            console.log("OTP_CODE:" + otp.otpCode);
        } else {
            console.log("OTP not found");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getOtp();
