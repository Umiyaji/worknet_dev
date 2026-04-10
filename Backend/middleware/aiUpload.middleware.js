import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
	"text/plain",
	"text/csv",
	"application/json",
	"text/markdown",
	"text/x-markdown",
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
]);

const allowedExtensions = /\.(txt|csv|json|md|markdown|png|jpe?g|webp)$/i;

const fileFilter = (req, file, cb) => {
	if (allowedMimeTypes.has(file.mimetype) || allowedExtensions.test(file.originalname || "")) {
		cb(null, true);
		return;
	}

	cb(
		new Error(
			"Unsupported file type. Please upload TXT, CSV, JSON, Markdown, PNG, JPG, or WEBP files."
		),
		false
	);
};

const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024,
	},
});

export const uploadAiContextFile = (req, res, next) => {
	const contentType = req.headers["content-type"] || "";

	if (!contentType.includes("multipart/form-data")) {
		next();
		return;
	}

	upload.single("contextFile")(req, res, (err) => {
		if (!err) {
			next();
			return;
		}

		if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
			return res.status(400).json({ message: "File too large. Maximum size is 5MB" });
		}

		return res.status(400).json({ message: err.message || "File upload error" });
	});
};
