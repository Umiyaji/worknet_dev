import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import Post from "../models/post.model.js";
import fs from "fs/promises";
import path from "path";
import { generateGeminiContent } from "../lib/gemini.js";
import { getPagination } from "../lib/pagination.js";
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
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  "headline": "short professional headline in under 12 words",
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
- Keep headline factual and role-focused. Do not invent seniority or employer names unless clearly present.
- For experience, preserve the role title and company exactly when available.
- For education, extract college/school and degree/field carefully.
- Do not rewrite the resume creatively. Extract what is present.
- Do not invent details.
`.trim();

const extractProfileDataFromResume = async (filePath, mimetype) => {
	if (!process.env.GEMINI_API_KEY) {
		return null;
	}

	const fileBuffer = await fs.readFile(filePath);
	const normalizedMimeType = mimetype || getMimeTypeFromExtension(filePath);

	if (!normalizedMimeType) {
		return null;
	}

	const { data, model } = await generateGeminiContent({
		models: [
			process.env.GEMINI_MODEL || "gemini-2.5-flash",
			...(String(process.env.GEMINI_FALLBACK_MODELS || "gemini-2.0-flash")
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean)),
		],
		body: {
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
		},
	});

	if (model) {
		console.log(`Gemini resume extraction used model: ${model}`);
	}

	const outputText = parseGeminiText(data);
	const parsed = extractJsonFromText(outputText);
	if (!parsed) {
		throw new Error("Failed to parse resume extraction response");
	}

	return {
		headline: normalizeString(parsed.headline),
		about: normalizeString(parsed.about),
		skills: normalizeSkills(parsed.skills),
		experience: normalizeExperience(parsed.experience),
		education: normalizeEducation(parsed.education),
	};
};


export const getSuggestedConnections = async (req, res) => {
	try {
		const currentUser = await User.findById(req.user._id).select("connections");

		const { limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
		const includeTotal = String(req.query.includeTotal || "").toLowerCase() === "true";
		const suggestionsFilter = {
			_id: {
				$ne: req.user._id,
				$nin: currentUser.connections,
			},
		};

		const query = User.find(suggestionsFilter).select("name username profilePicture headline")
			.skip(skip)
			.limit(limit)
			.lean();

		const suggestedUsers = await query;
		if (includeTotal) {
			const total = await User.countDocuments(suggestionsFilter);
			return res.json({ users: suggestedUsers, total });
		}

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

		if (req.user?._id?.toString() !== user._id.toString()) {
			await User.updateOne({ _id: user._id }, { $inc: { profileViewsCount: 1 } });
			user.profileViewsCount = (user.profileViewsCount || 0) + 1;
		}

		res.json(user);
	} catch (error) {
		console.error("Error in getPublicProfile controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getMyAnalytics = async (req, res) => {
	try {
		const userId = req.user._id;
		const [profile, postAgg] = await Promise.all([
			User.findById(userId).select("profileViewsCount").lean(),
			Post.aggregate([
				{ $match: { author: userId } },
				{
					$project: {
						viewCount: { $ifNull: ["$viewCount", 0] },
						shareCount: { $ifNull: ["$shareCount", 0] },
						likeCount: { $size: { $ifNull: ["$likes", []] } },
						commentCount: { $size: { $ifNull: ["$comments", []] } },
					},
				},
				{
					$group: {
						_id: null,
						postReach: { $sum: "$viewCount" },
						totalShares: { $sum: "$shareCount" },
						totalLikes: { $sum: "$likeCount" },
						totalComments: { $sum: "$commentCount" },
						totalPosts: { $sum: 1 },
					},
				},
			]),
		]);

		return res.json({
			profileViews: profile?.profileViewsCount || 0,
			postReach: postAgg[0]?.postReach || 0,
			totalShares: postAgg[0]?.totalShares || 0,
			totalLikes: postAgg[0]?.totalLikes || 0,
			totalComments: postAgg[0]?.totalComments || 0,
			totalPosts: postAgg[0]?.totalPosts || 0,
		});
	} catch (error) {
		console.error("Error in getMyAnalytics controller:", error);
		return res.status(500).json({ message: "Server error" });
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
			"hiringContactEmail",
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
				if (extracted.headline) {
					user.headline = extracted.headline;
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
					extracted.headline ||
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
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.profilePicture = "";
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
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.bannerImg = "";
		await user.save();

		res.json({ message: "Banner image deleted successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

export const deleteResume = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: "User not found" });

		await deleteLocalResumeIfExists(user.resume);
		user.resume = "";
		await user.save();

		const updatedUser = await User.findById(req.user._id).select("-password");
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
		const normalizedQuery = normalizeString(query);
		if (normalizedQuery.length < 2) {
			return res.status(400).json({ message: "Search query must be at least 2 characters." });
		}
		const safeQuery = escapeRegex(normalizedQuery).slice(0, 64);

		const users = await User.find({
			$or: [
				{ name: { $regex: safeQuery, $options: "i" } },
				{ username: { $regex: safeQuery, $options: "i" } }
			]
		})
			.select("name username profilePicture")
			.limit(10)
			.lean();

		res.status(200).json(users);
	} catch (error) {
		console.error("Error searching for users:", error);
		res.status(500).json({ message: "Internal server error." });
	}
};
