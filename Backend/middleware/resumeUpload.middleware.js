import fs from "fs";
import path from "path";
import multer from "multer";

const uploadsDir = path.resolve("uploads", "resumes");

if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
		cb(null, `${req.user._id}-${Date.now()}-${safeName}`);
	},
});

const allowedMimeTypes = new Set([
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"image/jpeg",
	"image/png",
	"image/webp",
]);

const allowedResumeExtensions = /\.(pdf|doc|docx|jpe?g|png|webp)$/i;

const fileFilter = (_req, file, cb) => {
	if (allowedMimeTypes.has(file.mimetype) || allowedResumeExtensions.test(file.originalname || "")) {
		cb(null, true);
		return;
	}

	cb(new Error("Only PDF, DOC, DOCX, JPG, PNG, and WEBP files are allowed"), false);
};

const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024,
	},
});

export const uploadResumeFile = (req, res, next) => {
	upload.single("resume")(req, res, (err) => {
		if (!err) {
			next();
			return;
		}

		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				res.status(400).json({ message: "Resume file is too large. Maximum size is 10MB" });
				return;
			}

			res.status(400).json({ message: err.message });
			return;
		}

		res.status(400).json({ message: err.message || "Resume upload failed" });
	});
};
