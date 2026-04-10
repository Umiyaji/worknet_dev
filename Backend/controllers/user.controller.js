import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import fs from "fs/promises";
import path from "path";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const CURRENT_TOKENS = new Set(["present", "current", "ongoing", "now", "till date", "today"]);

const getMimeTypeFromExtension = (filePath = "") => {
	const extension = path.extname(filePath).toLowerCase();

	switch (extension) {
		case ".pdf":
			return "application/pdf";
		case ".doc":
			return "application/msword";
		case ".docx":
			return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		case ".png":
			return "image/png";
		case ".webp":
			return "image/webp";
		default:
			return "";
	}
};

const deleteLocalResumeIfExists = async (resumeUrl) => {
	if (!resumeUrl || !resumeUrl.includes("/uploads/resumes/")) {
		return;
	}

	try {
		const fileName = resumeUrl.split("/uploads/resumes/")[1];
		if (!fileName) {
			return;
		}

		const filePath = path.resolve("uploads", "resumes", fileName);
		await fs.unlink(filePath);
	} catch (error) {
		if (error.code !== "ENOENT") {
			console.error("Error deleting local resume file:", error);
		}
	}
};

const parseGeminiText = (data) =>
	data?.candidates?.[0]?.content?.parts
		?.map((part) => part.text)
		.filter(Boolean)
		.join("\n")
		.trim() || "";

const extractJsonFromText = (text) => {
	if (!text) {
		return null;
	}

	const cleaned = text
		.replace(/^```json\s*/i, "")
		.replace(/^```\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();

	try {
		return JSON.parse(cleaned);
	} catch (_error) {
		const firstBrace = cleaned.indexOf("{");
		const lastBrace = cleaned.lastIndexOf("}");
		if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
			return null;
		}

		try {
			return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
		} catch (_nestedError) {
			return null;
		}
	}
};

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeTargetProfileString = (value) => normalizeString(value).toLowerCase();

const normalizeSkills = (skills) => {
	if (!Array.isArray(skills)) {
		return [];
	}

	const unique = new Set();
	for (const skill of skills) {
		const cleaned = normalizeString(skill);
		if (cleaned) {
			unique.add(cleaned);
		}
	}
	return Array.from(unique);
};

const parseResumeDate = (value) => {
	const normalized = normalizeString(value);
	if (!normalized) {
		return null;
	}

	if (CURRENT_TOKENS.has(normalized.toLowerCase())) {
		return null;
	}

	const yearOnly = normalized.match(/^(\d{4})$/);
	if (yearOnly) {
		const date = new Date(`${yearOnly[1]}-01-01`);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	const date = new Date(normalized);
	return Number.isNaN(date.getTime()) ? null : date;
};

const parseResumeYear = (value) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}

	const normalized = normalizeString(value);
	if (!normalized) {
		return null;
	}

	const match = normalized.match(/\b(19|20)\d{2}\b/);
	if (!match) {
		return null;
	}
	return Number(match[0]);
};

const normalizeExperience = (experience) => {
	if (!Array.isArray(experience)) {
		return [];
	}

	return experience
		.map((item) => ({
			title: normalizeString(item?.title),
			company: normalizeString(item?.company),
			startDate: parseResumeDate(item?.startDate),
			endDate: parseResumeDate(item?.endDate),
			description: normalizeString(item?.description),
		}))
		.filter((item) => item.title || item.company || item.startDate || item.endDate || item.description);
};

const normalizeEducation = (education) => {
	if (!Array.isArray(education)) {
		return [];
	}

	return education
		.map((item) => ({
			school: normalizeString(item?.school),
			fieldOfStudy: normalizeString(item?.fieldOfStudy),
			startYear: parseResumeYear(item?.startYear),
			endYear: parseResumeYear(item?.endYear),
		}))
		.filter((item) => item.school || item.fieldOfStudy || item.startYear || item.endYear);
};

const getResumeExtractionPrompt = () => `
Extract resume information and return strict JSON only.

Output format:
{
  "about": "short professional summary in 2-4 lines",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "startDate": "YYYY-MM-DD or YYYY or empty string",
      "endDate": "YYYY-MM-DD or YYYY or empty string or Present",
      "description": "short role summary"
    }
  ],
  "education": [
    {
      "school": "School/College",
      "fieldOfStudy": "Degree/Field",
      "startYear": "YYYY or empty string",
      "endYear": "YYYY or empty string"
    }
  ]
}

Rules:
- Return valid JSON only.
- If a field is missing in resume, use empty string or empty array.
- Keep skills concise and deduplicated.
- Do not invent details.
`.trim();

const extractProfileDataFromResume = async (filePath, mimetype) => {
	if (!process.env.GEMINI_API_KEY) {
		return null;
	}

	const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
	const fileBuffer = await fs.readFile(filePath);
	const normalizedMimeType = mimetype || getMimeTypeFromExtension(filePath);

	if (!normalizedMimeType) {
		return null;
	}

	const response = await fetch(
		`${GEMINI_API_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				contents: [
					{
						parts: [
							{ text: getResumeExtractionPrompt() },
							{
								inline_data: {
									mime_type: normalizedMimeType,
									data: fileBuffer.toString("base64"),
								},
							},
						],
					},
				],
				generationConfig: {
					responseMimeType: "application/json",
				},
			}),
		}
	);

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data?.error?.message || "Failed to extract resume data");
	}

	const outputText = parseGeminiText(data);
	const parsed = extractJsonFromText(outputText);
	if (!parsed) {
		throw new Error("Failed to parse resume extraction response");
	}

	return {
		about: normalizeString(parsed.about),
		skills: normalizeSkills(parsed.skills),
		experience: normalizeExperience(parsed.experience),
		education: normalizeEducation(parsed.education),
	};
};


export const getSuggestedConnections = async (req, res) => {
	try {
		const currentUser = await User.findById(req.user._id).select("connections");

		const limit = parseInt(req.query.limit, 10) || 0;

		const query = User.find({
			_id: {
				$ne: req.user._id,
				$nin: currentUser.connections,
			},
		}).select("name username profilePicture headline");

		if (limit > 0) {
			query.limit(limit);
		}

		const suggestedUsers = await query;

		res.json(suggestedUsers);
	} catch (error) {
		console.error("Error in getSuggestedConnections controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getPublicProfile = async (req, res) => {
	try {
		const user = await User.findOne({ username: req.params.username }).select("-password");

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json(user);
	} catch (error) {
		console.error("Error in getPublicProfile controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const updateProfile = async (req, res) => {
	try {
		const allowedFields = [
			"name",
			"username",
			"headline",
			"about",
			"location",
			"college",
			"city",
			"currentCompany",
			"profilePicture",
			"bannerImg",
			"resume",
			"skills",
			"experience",
			"education",
			"companyName",
			"companyWebsite",
			"companySize",
			"industry",
			"companyLocation",
			"companyLogo",
			"companyBanner",
			"aboutCompany",
			"HRName",
		];

		const updatedData = {};

		for (const field of allowedFields) {
			if (Object.prototype.hasOwnProperty.call(req.body, field)) {
				if (field === "college" || field === "city") {
					updatedData[field] = normalizeTargetProfileString(req.body[field]);
				} else {
					updatedData[field] = req.body[field];
				}
			}
		}

		if (req.body.profilePicture) {
			const result = await cloudinary.uploader.upload(req.body.profilePicture);
			updatedData.profilePicture = result.secure_url;
		}

		if (req.body.bannerImg) {
			const result = await cloudinary.uploader.upload(req.body.bannerImg);
			updatedData.bannerImg = result.secure_url;
		}

		if (req.body.resume) {
			const result = await cloudinary.uploader.upload(req.body.resume, {
				resource_type: "auto",
			});
			updatedData.resume = result.secure_url;
		}

		const user = await User.findByIdAndUpdate(req.user._id, { $set: updatedData }, { new: true }).select(
			"-password"
		);

		res.json(user);
	} catch (error) {
		console.error("Error in updateProfile controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const uploadResume = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: "Resume file is required" });
		}

		const user = await User.findById(req.user._id).select("-password");
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		await deleteLocalResumeIfExists(user.resume);

		const resumeUrl = `${req.protocol}://${req.get("host")}/uploads/resumes/${req.file.filename}`;
		user.resume = resumeUrl;

		let extractionApplied = false;
		try {
			const extracted = await extractProfileDataFromResume(req.file.path, req.file.mimetype);
			if (extracted) {
				if (extracted.about) {
					user.about = extracted.about;
				}
				if (extracted.skills.length) {
					user.skills = extracted.skills;
				}
				if (extracted.experience.length) {
					user.experience = extracted.experience;
				}
				if (extracted.education.length) {
					user.education = extracted.education;
				}
				extractionApplied = Boolean(
					extracted.about ||
						extracted.skills.length ||
						extracted.experience.length ||
						extracted.education.length
				);
			}
		} catch (aiError) {
			console.error("Resume AI extraction failed:", aiError);
		}

		await user.save();

		res.json({
			...user.toObject(),
			resumeExtractionApplied: extractionApplied,
		});
	} catch (error) {
		console.error("Error uploading resume:", error);
		res.status(500).json({ message: "Server error" });
	}
};


// Delete profile picture
export const deleteProfilePicture = async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.profilePicture = null;
		await user.save();

		res.json({ message: "Profile picture deleted successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

// Delete banner image
export const deleteBannerImage = async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.bannerImg = null;
		await user.save();

		res.json({ message: "Banner image deleted successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

export const deleteResume = async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: "User not found" });

		await deleteLocalResumeIfExists(user.resume);
		user.resume = "";
		await user.save();

		const updatedUser = await User.findById(req.user.id).select("-password");
		res.json(updatedUser);
	} catch (error) {
		console.error("Error deleting resume:", error);
		res.status(500).json({ message: "Server error" });
	}
};



export const searchUsers = async (req, res) => {
	try {
		const { query } = req.query;

		if (!query) {
			return res.status(400).json({ message: "Search query is required." });
		}

		const users = await User.find({
			$or: [
				{ name: { $regex: query, $options: 'i' } },
				{ username: { $regex: query, $options: 'i' } }
			]
		})
			.select('name username profilePicture')
			.limit(10);

		res.status(200).json(users);
	} catch (error) {
		console.error("Error searching for users:", error);
		res.status(500).json({ message: "Internal server error." });
	}
};
