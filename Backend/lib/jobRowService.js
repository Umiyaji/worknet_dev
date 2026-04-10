import JobRow from "../models/jobRow.model.js";
import Job from "../models/job.model.js";
import Post from "../models/post.model.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_SOURCE = "automated-job-row";
const ROW_LOCK_STALE_MS = 15 * 60 * 1000;

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeSkills = (skills) => {
	if (Array.isArray(skills)) {
		return skills.map((skill) => cleanString(skill)).filter(Boolean);
	}

	if (typeof skills === "string") {
		return skills
			.split(/[,\n|]/)
			.map((skill) => cleanString(skill))
			.filter(Boolean);
	}

	return [];
};

const normalizeJobType = (jobType) => {
	const value = cleanString(jobType).toLowerCase();
	if (value === "remote" || value === "on-site" || value === "hybrid") {
		return value;
	}
	if (value === "onsite") {
		return "on-site";
	}
	return "hybrid";
};

const normalizeVisibilityType = (value) => {
	const normalized = cleanString(value).toLowerCase();
	return normalized === "targeted" ? "targeted" : "public";
};

const normalizeTargetValues = (values) => {
	if (Array.isArray(values)) {
		return Array.from(
			new Set(
				values
					.map((value) => cleanString(value).toLowerCase())
					.filter(Boolean)
			)
		);
	}

	if (typeof values === "string") {
		return Array.from(
			new Set(
				values
					.split(/[,\n|]/)
					.map((value) => cleanString(value).toLowerCase())
					.filter(Boolean)
			)
		);
	}

	return [];
};

const parseDateValue = (value, fallbackEndOfDay = false) => {
	if (!value) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;

	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) && fallbackEndOfDay) {
		parsed.setHours(23, 59, 59, 999);
	}

	return parsed;
};

const parseAutoPostAt = (value) => {
	if (!value) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toWorkModeLabel = (jobType) => {
	if (jobType === "remote") return "Remote";
	if (jobType === "on-site") return "In Office";
	return "Hybrid";
};

const buildFallbackPostContent = (row) => [
	`We're hiring: ${row.jobTitle}`,
	`Company: ${row.companyName}`,
	`Location: ${row.location}`,
	`Experience: ${row.experienceRequired}`,
	`Job Type: ${toWorkModeLabel(row.jobType)}`,
	`Skills: ${row.skillsRequired.join(", ")}`,
	row.salaryRange ? `Salary: ${row.salaryRange}` : "",
	`Apply by: ${new Date(row.lastDateToApply).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})}`,
]
	.filter(Boolean)
	.join("\n");

const buildAiPrompt = (row) => `
Create a professional job post using the following details:
Role: ${row.jobTitle}
Company: ${row.companyName}
Location: ${row.location}
Skills: ${row.skillsRequired.join(", ")}
Experience: ${row.experienceRequired}
Job Type: ${toWorkModeLabel(row.jobType)}
Salary Range: ${row.salaryRange || "Not disclosed"}
Last Date To Apply: ${new Date(row.lastDateToApply).toLocaleDateString("en-IN")}

Rules:
- Keep it concise and recruiter-friendly.
- Do not invent any facts.
- Include a clear call to action.
- Output only the final post text.
`.trim();

const parseGeminiText = (data) =>
	data?.candidates?.[0]?.content?.parts
		?.map((part) => part.text)
		.filter(Boolean)
		.join("\n")
		.trim() || "";

const stripMarkdownFormatting = (value) =>
	cleanString(value)
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/\*(.*?)\*/g, "$1")
		.replace(/^[\t ]*[-*•]\s+/gm, "")
		.replace(/^[\t ]*\d+\.\s+/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

const generateAiJobPost = async (row) => {
	if (!process.env.GEMINI_API_KEY) {
		return buildFallbackPostContent(row);
	}

	const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
	const response = await fetch(
		`${GEMINI_API_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				contents: [{ parts: [{ text: buildAiPrompt(row) }] }],
			}),
		}
	);

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data?.error?.message || "AI post generation failed");
	}

	return stripMarkdownFormatting(parseGeminiText(data)) || buildFallbackPostContent(row);
};

const nextRetryDelayMs = (retryCount) => {
	const delays = [15, 30, 60];
	const minutes = delays[Math.min(retryCount, delays.length - 1)];
	return minutes * 60 * 1000;
};

const sanitizeRowPayload = (payload, fallback = {}) => {
	const normalizedSkills = normalizeSkills(payload.skillsRequired ?? fallback.skillsRequired);
	const normalizedDate = parseDateValue(payload.lastDateToApply ?? fallback.lastDateToApply, true);
	const normalizedUniqueRowId = cleanString(payload.uniqueRowId ?? fallback.uniqueRowId);

	return {
		uniqueRowId: normalizedUniqueRowId || undefined,
		jobTitle: cleanString(payload.jobTitle || fallback.jobTitle),
		companyName: cleanString(payload.companyName || fallback.companyName),
		location: cleanString(payload.location || fallback.location),
		experienceRequired: cleanString(payload.experienceRequired || fallback.experienceRequired),
		skillsRequired: normalizedSkills,
		jobType: normalizeJobType(payload.jobType || fallback.jobType),
		visibilityType: normalizeVisibilityType(payload.visibilityType || fallback.visibilityType),
		targetColleges: normalizeTargetValues(payload.targetColleges ?? fallback.targetColleges),
		targetCities: normalizeTargetValues(payload.targetCities ?? fallback.targetCities),
		salaryRange: cleanString(payload.salaryRange || fallback.salaryRange),
		lastDateToApply: normalizedDate,
		autoPostApproved: Boolean(payload.autoPostApproved ?? fallback.autoPostApproved ?? false),
		autoPostAt: parseAutoPostAt(payload.autoPostAt ?? fallback.autoPostAt),
		status: cleanString(payload.status || fallback.status || "draft").toLowerCase(),
	};
};

const validateRowPayload = (payload) => {
	if (!payload.jobTitle) return "jobTitle is required";
	if (!payload.companyName) return "companyName is required";
	if (!payload.location) return "location is required";
	if (!payload.experienceRequired) return "experienceRequired is required";
	if (!payload.skillsRequired.length) return "skillsRequired must include at least one skill";
	if (!payload.lastDateToApply) return "lastDateToApply must be a valid date";
	if (payload.visibilityType === "targeted" && !payload.targetColleges.length && !payload.targetCities.length) {
		return "targeted rows must include at least one target college or city";
	}
	if (payload.autoPostAt === null && payload.status === "scheduled") {
		return "autoPostAt must be a valid date-time when status is scheduled";
	}
	if (!["draft", "scheduled", "posted", "error"].includes(payload.status)) {
		return "status must be one of draft, scheduled, posted, error";
	}
	return "";
};

const buildRowLog = (event, message = "") => ({
	event,
	message,
	createdAt: new Date(),
});

const findExistingRowPost = async (row) =>
	Post.findOne({
		postType: "job",
		author: row.recruiterId,
		"jobDetails.source": DEFAULT_SOURCE,
		"jobDetails.sourceRowId": row.uniqueRowId,
	});

export const processJobRowById = async (rowId, { force = false } = {}) => {
	const now = new Date();
	const lockQuery = {
		_id: rowId,
		processingLock: false,
	};

	if (!force) {
		lockQuery.status = "scheduled";
		lockQuery.isProcessed = false;
	}

	const row = await JobRow.findOneAndUpdate(
		lockQuery,
		{
			$set: {
				processingLock: true,
				processingLockedAt: now,
			},
			$push: {
				logs: buildRowLog("processing_started", "Row locked for processing"),
			},
		},
		{ new: true }
	);

	if (!row) {
		return { skipped: true, reason: "not_eligible_or_locked" };
	}

	try {
		const duplicatePost = await findExistingRowPost(row);
		if (duplicatePost) {
			await JobRow.findByIdAndUpdate(row._id, {
				$set: {
					isProcessed: true,
					status: "posted",
					postId: duplicatePost._id,
					processedAt: new Date(),
					processingLock: false,
					processingLockedAt: null,
					lastError: "",
					nextRetryAt: null,
				},
				$push: {
					logs: buildRowLog("duplicate_skipped", "Existing post found for this row"),
				},
			});
			return { success: true, duplicate: true, postId: duplicatePost._id };
		}

		const generatedContent = await generateAiJobPost(row);
		const nowDate = new Date();

		const createdJob = await Job.create({
			companyName: row.companyName,
			title: row.jobTitle,
			description: generatedContent,
			skillsRequired: row.skillsRequired,
			experienceRequired: row.experienceRequired,
			location: row.location,
			jobType: row.jobType,
			visibilityType: row.visibilityType || "public",
			targetColleges: row.targetColleges || [],
			targetCities: row.targetCities || [],
			salaryRange: row.salaryRange,
			publishAt: nowDate,
			lastDateToApply: row.lastDateToApply,
			companyId: row.recruiterId,
		});

		const createdPost = await Post.create({
			author: row.recruiterId,
			postType: "job",
			content: generatedContent,
			publishAt: nowDate,
			relatedJob: createdJob._id,
			jobDetails: {
				companyName: row.companyName,
				role: row.jobTitle,
				totalOpenings: 1,
				experienceRequired: row.experienceRequired,
				workMode: toWorkModeLabel(row.jobType),
				officeLocation: row.location,
				skillsRequired: row.skillsRequired,
				lastDateToApply: row.lastDateToApply,
				visibilityType: row.visibilityType || "public",
				targetColleges: row.targetColleges || [],
				targetCities: row.targetCities || [],
				source: DEFAULT_SOURCE,
				sourceRowId: row.uniqueRowId,
			},
		});

		await JobRow.findByIdAndUpdate(row._id, {
			$set: {
				isProcessed: true,
				status: "posted",
				postId: createdPost._id,
				jobId: createdJob._id,
				processedAt: new Date(),
				processingLock: false,
				processingLockedAt: null,
				lastError: "",
				nextRetryAt: null,
			},
			$push: {
				logs: buildRowLog("posted", "Post generated and saved successfully"),
			},
		});

		return { success: true, postId: createdPost._id, jobId: createdJob._id };
	} catch (error) {
		const nextRetry = new Date(Date.now() + nextRetryDelayMs(row.retryCount));
		await JobRow.findByIdAndUpdate(row._id, {
			$set: {
				status: "error",
				processingLock: false,
				processingLockedAt: null,
				lastError: error.message || "Unknown processing failure",
				nextRetryAt: nextRetry,
			},
			$inc: { retryCount: 1 },
			$push: {
				logs: buildRowLog("processing_failed", error.message || "Unknown processing failure"),
			},
		});

		return { success: false, error: error.message || "Processing failed" };
	}
};

export const processScheduledRows = async () => {
	const now = new Date();

	await JobRow.updateMany(
		{
			processingLock: true,
			processingLockedAt: { $lte: new Date(Date.now() - ROW_LOCK_STALE_MS) },
		},
		{
			$set: { processingLock: false, processingLockedAt: null },
			$push: { logs: buildRowLog("lock_released", "Stale lock auto-released") },
		}
	);

	const rows = await JobRow.find({
		status: "scheduled",
		isProcessed: false,
		autoPostApproved: true,
		autoPostAt: { $ne: null, $lte: now },
		processingLock: false,
		$or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
	})
		.select("_id")
		.sort({ createdAt: 1 })
		.limit(200);

	const results = [];
	for (const row of rows) {
		// eslint-disable-next-line no-await-in-loop
		const result = await processJobRowById(row._id, { force: false });
		results.push(result);
	}

	return {
		totalCandidates: rows.length,
		postedCount: results.filter((item) => item.success && !item.duplicate).length,
		duplicateCount: results.filter((item) => item.success && item.duplicate).length,
		failedCount: results.filter((item) => item.success === false).length,
	};
};

export const prepareRowPayload = (payload, fallback = {}) => {
	const normalized = sanitizeRowPayload(payload, fallback);
	const validationError = validateRowPayload(normalized);
	return { normalized, validationError };
};

export const createRowFromPayload = async (payload, recruiter) => {
	const { normalized, validationError } = prepareRowPayload(payload, {
		companyName: recruiter.companyName || "",
	});

	if (validationError) {
		return { error: validationError };
	}

	try {
		const created = await JobRow.create({
			...normalized,
			companyName: normalized.companyName || recruiter.companyName || "",
			recruiterId: recruiter._id,
			isProcessed: normalized.status === "posted",
			logs: [buildRowLog("created", "Row created manually")],
		});

		return { row: created };
	} catch (error) {
		if (error?.name === "ValidationError") {
			const firstError = Object.values(error.errors || {})[0];
			return { error: firstError?.message || "Invalid row payload" };
		}
		throw error;
	}
};
