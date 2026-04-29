import mongoose from "mongoose";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import Notification from "../models/notification.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { emitToUser } from "../lib/socket.js";
import { deleteJobPost, syncJobPost } from "../lib/jobPostSync.js";
import { generateGeminiContent } from "../lib/gemini.js";
import { getPagination } from "../lib/pagination.js";

const excelPreviewStore = new Map();
const PREVIEW_TTL_MS = 15 * 60 * 1000;
const AI_DRAFT_TIMEOUT_MS = 12000;

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const parseLastDateToApply = (value) => {
	if (!value) {
		return null;
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}

	if (typeof value === "number") {
		// Excel serial date format fallback
		const excelDate = XLSX.SSF.parse_date_code(value);
		if (excelDate?.y && excelDate?.m && excelDate?.d) {
			const hasTimeComponent = Boolean(excelDate.H || excelDate.M || excelDate.S || excelDate.u);
			const date = new Date(
				Date.UTC(
					excelDate.y,
					excelDate.m - 1,
					excelDate.d,
					hasTimeComponent ? excelDate.H || 0 : 23,
					hasTimeComponent ? excelDate.M || 0 : 59,
					hasTimeComponent ? excelDate.S || 0 : 59,
					hasTimeComponent ? Math.round((excelDate.u || 0) * 1000) : 999
				)
			);
			return Number.isNaN(date.getTime()) ? null : date;
		}
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	// Date-only inputs should remain valid for the full day.
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
		parsed.setHours(23, 59, 59, 999);
	}

	return parsed;
};

const parsePublishAt = (value) => {
	if (!value) {
		return new Date();
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}

	if (typeof value === "number") {
		// Excel serial date-time format fallback
		const excelDate = XLSX.SSF.parse_date_code(value);
		if (excelDate?.y && excelDate?.m && excelDate?.d) {
			const milliseconds = Math.round((excelDate.u || 0) * 1000);
			const date = new Date(
				Date.UTC(
					excelDate.y,
					excelDate.m - 1,
					excelDate.d,
					excelDate.H || 0,
					excelDate.M || 0,
					excelDate.S || 0,
					milliseconds
				)
			);
			return Number.isNaN(date.getTime()) ? null : date;
		}
	}

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const APPLICATION_STATUSES = ["applied", "reviewing", "shortlisted", "rejected", "hired"];
const INTERVIEW_MODES = ["online", "onsite", "phone"];
const normalizeTags = (value) => {
	if (!Array.isArray(value)) return [];
	return Array.from(
		new Set(
			value
				.map((item) => cleanString(item).toLowerCase())
				.filter(Boolean)
		)
	).slice(0, 20);
};

const createNotification = async (payload) => {
	try {
		const notification = await Notification.create(payload);
		emitToUser(payload.recipient, "notification:new", notification);
		return notification;
	} catch (error) {
		console.error("Failed to create notification:", error);
		return null;
	}
};

const getRecruiterOwnedApplication = async (jobId, applicationId, recruiterId) => {
	if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
		return { error: { status: 400, message: "Invalid id provided" } };
	}

	const job = await Job.findById(jobId);
	if (!job) {
		return { error: { status: 404, message: "Job not found" } };
	}

	if (job.companyId.toString() !== recruiterId.toString()) {
		return { error: { status: 403, message: "You can manage applicants only for your jobs" } };
	}

	const application = await Application.findOne({ _id: applicationId, jobId })
		.populate("userId", "name username email profilePicture headline skills experience education resume")
		.populate("lastStatusUpdatedBy", "name username role")
		.populate("statusHistory.changedBy", "name username role");

	if (!application) {
		return { error: { status: 404, message: "Application not found" } };
	}

	return { job, application };
};

const normalizeJobPayload = (payload, fallback = {}) => {
	const normalized = {
		companyName: cleanString(payload.companyName || fallback.companyName),
		title: cleanString(payload.title || fallback.title),
		description: cleanString(payload.description || fallback.description),
		skillsRequired: normalizeSkills(payload.skillsRequired || fallback.skillsRequired),
		experienceRequired: cleanString(payload.experienceRequired || fallback.experienceRequired),
		location: cleanString(payload.location || fallback.location),
		jobType: normalizeJobType(payload.jobType || fallback.jobType),
		salaryRange: cleanString(payload.salaryRange || fallback.salaryRange),
		visibilityType: normalizeVisibilityType(payload.visibilityType || fallback.visibilityType),
		targetColleges: normalizeTargetValues(payload.targetColleges || fallback.targetColleges),
		targetCities: normalizeTargetValues(payload.targetCities || fallback.targetCities),
		publishAt: parsePublishAt(payload.publishAt || fallback.publishAt),
		lastDateToApply: parseLastDateToApply(payload.lastDateToApply || fallback.lastDateToApply),
	};

	return normalized;
};

const validateJobPayload = (payload) => {
	if (!payload.companyName) return "companyName is required";
	if (!payload.title) return "title is required";
	if (!payload.description) return "description is required";
	if (!payload.experienceRequired) return "experienceRequired is required";
	if (!payload.location) return "location is required";
	if (!payload.publishAt) return "publishAt must be a valid date";
	if (!payload.lastDateToApply) return "lastDateToApply is required and must be a valid date";
	if (!payload.skillsRequired.length) return "skillsRequired must include at least one skill";
	if (payload.visibilityType === "targeted" && !payload.targetColleges.length && !payload.targetCities.length) {
		return "Targeted jobs must include at least one college or city";
	}
	if (payload.publishAt.getTime() > payload.lastDateToApply.getTime()) {
		return "publishAt cannot be later than lastDateToApply";
	}
	return "";
};

const parseGeminiText = (data) =>
	data?.candidates?.[0]?.content?.parts
		?.map((part) => part.text)
		.filter(Boolean)
		.join("\n")
		.trim() || "";

const extractJson = (text) => {
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
		const start = cleaned.indexOf("{");
		const end = cleaned.lastIndexOf("}");
		if (start === -1 || end === -1 || end <= start) {
			return null;
		}

		try {
			return JSON.parse(cleaned.slice(start, end + 1));
		} catch (_nestedError) {
			return null;
		}
	}
};

const formatDisplayDate = (value) => {
	const parsed = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return "";
	}

	return parsed.toLocaleDateString("en-IN", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
};

const normalizeDescriptionLine = (value) => cleanString(value).replace(/\s+/g, " ");

const stripMarkdownFormatting = (value) =>
	cleanString(value)
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/\*(.*?)\*/g, "$1")
		.replace(/^[\t ]*[-*•]\s+/gm, "")
		.replace(/^[\t ]*\d+\.\s+/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

const buildStructuredJobDescription = (draft) => {
	const title = cleanString(draft.title);
	const companyName = cleanString(draft.companyName);
	const location = cleanString(draft.location);
	const experienceRequired = cleanString(draft.experienceRequired);
	const salaryRange = cleanString(draft.salaryRange);
	const skills = normalizeSkills(draft.skillsRequired);
	const deadline = formatDisplayDate(draft.lastDateToApply);
	const jobType =
		draft.jobType === "remote" ? "Remote" : draft.jobType === "on-site" ? "On-site" : "Hybrid";

	const overviewParts = [];
	if (companyName) {
		overviewParts.push(`${companyName} is hiring for the ${title} role`);
	} else {
		overviewParts.push(`We are hiring for the ${title} role`);
	}
	if (location) {
		overviewParts.push(`based in ${location}`);
	}
	if (draft.jobType) {
		overviewParts.push(`in a ${jobType.toLowerCase()} setup`);
	}
	overviewParts.push(
		"with an emphasis on practical execution, clear communication, and dependable teamwork."
	);

	const lines = [
		`${title} at ${companyName || "the company"}`,
		"",
		"Overview",
		normalizeDescriptionLine(`${overviewParts.join(" ")}.`),
	];

	if (experienceRequired || salaryRange || location || draft.jobType) {
		lines.push("", "Role Snapshot");
		if (location) lines.push(`Location: ${location}`);
		if (draft.jobType) lines.push(`Work mode: ${jobType}`);
		if (experienceRequired) lines.push(`Experience required: ${experienceRequired}`);
		if (salaryRange) lines.push(`Salary range: ${salaryRange}`);
	}

	if (skills.length) {
		lines.push("", "What We're Looking For");
		lines.push(`Skills required: ${skills.join(", ")}`);
	}

	lines.push("", "Why Apply");
	lines.push(
		normalizeDescriptionLine(
			`This role is a strong fit for candidates who want to build real-world experience, contribute to meaningful work from day one, and grow in a professional team environment.`
		)
	);

	if (deadline) {
		lines.push("", `Application deadline: ${deadline}`);
	}

	return lines.join("\n").trim();
};

const isWeakGeneratedDescription = (description, draft) => {
	const normalized = cleanString(description).toLowerCase();
	if (!normalized) {
		return true;
	}

	const title = cleanString(draft.title).toLowerCase();
	const companyName = cleanString(draft.companyName).toLowerCase();

	const weakPhrases = [
		"this is an exciting opportunity",
		"looking to grow",
		"motivated",
		"join our team",
		"apply now",
		"strong communication skills",
	];

	const genericPhraseCount = weakPhrases.filter((phrase) => normalized.includes(phrase)).length;
	const lineCount = normalized.split(/\n+/).filter(Boolean).length;
	const wordCount = normalized.split(/\s+/).filter(Boolean).length;

	return (
		wordCount < 70 ||
		lineCount < 6 ||
		genericPhraseCount >= 2 ||
		(title && !normalized.includes(title)) ||
		(companyName && !normalized.includes(companyName))
	);
};

const finalizeDraftDescription = (draft, fallbackDraft = {}) => {
	const mergedDraft = {
		...fallbackDraft,
		...draft,
	};
	const generatedDescription = stripMarkdownFormatting(mergedDraft.description);

	if (!generatedDescription || isWeakGeneratedDescription(generatedDescription, mergedDraft)) {
		return buildStructuredJobDescription(mergedDraft);
	}

	return generatedDescription;
};

const getJobDraftPrompt = (row) => `
Convert this hiring row into a polished job draft JSON for a hiring portal.
Return strict JSON only with this exact structure:
{
  "companyName": "",
  "title": "",
  "description": "",
  "skillsRequired": ["", ""],
  "experienceRequired": "",
  "location": "",
  "jobType": "remote|on-site|hybrid",
  "salaryRange": "",
  "publishAt": "YYYY-MM-DD or ISO datetime string",
  "lastDateToApply": "YYYY-MM-DD"
}
Rules for "description":
- Write plain text only, not markdown.
- Make it useful and specific, not generic filler.
- Use short sections separated by blank lines.
- Include these sections when supported by the row data: Overview, Role Snapshot, What We're Looking For, Application Deadline.
- Mention the role title, company name, location, work mode, experience, salary range, and core skills when available.
- Do not use hype phrases like "exciting opportunity", "motivated candidate", or "looking to grow".
- Do not add benefits, perks, responsibilities, technologies, or qualifications that are not present in the source row.
- If the source row is sparse, still write a clean, professional description using only the provided facts.
Rules for all fields:
- Preserve factual values from the source row.
- Normalize jobType to exactly one of: remote, on-site, hybrid.
- Return at least 4 concrete items in skillsRequired when enough skills exist in the source; otherwise return only the provided skills.
- Output valid JSON only with no code fences or commentary.
Source row: ${JSON.stringify(row)}
`.trim();

const aiGenerateJobDraft = async (row) => {
	if (!process.env.GEMINI_API_KEY) {
		return null;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), AI_DRAFT_TIMEOUT_MS);

	let data;
	let responseModel;
	try {
		const result = await generateGeminiContent({
			models: [
				process.env.GEMINI_MODEL || "gemini-2.5-flash",
				...(String(process.env.GEMINI_FALLBACK_MODELS || "gemini-2.0-flash")
					.split(",")
					.map((value) => value.trim())
					.filter(Boolean)),
			],
			body: {
				contents: [{ parts: [{ text: getJobDraftPrompt(row) }] }],
				generationConfig: { responseMimeType: "application/json" },
			},
			signal: controller.signal,
		});
		data = result.data;
		responseModel = result.model;
	} finally {
		clearTimeout(timeoutId);
	}

	if (!data) {
		throw new Error("AI generation failed");
	}

	if (responseModel) {
		console.log(`Gemini job draft generated with model: ${responseModel}`);
	}

	return extractJson(parseGeminiText(data));
};

const rowValue = (row, keys) => {
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
			return row[key];
		}
	}
	return "";
};

const rowToFallbackDraft = (row) => ({
	companyName: rowValue(row, ["companyName", "company", "Company", "Company Name"]),
	title: rowValue(row, ["title", "jobTitle", "position", "role", "Title", "Job Title"]),
	description: rowValue(row, ["description", "jobDescription", "details", "Description"]),
	skillsRequired: rowValue(row, ["skillsRequired", "skills", "Skills", "skill_set"]),
	experienceRequired: rowValue(row, ["experienceRequired", "experience", "Experience"]),
	location: rowValue(row, ["location", "jobLocation", "Location"]),
	jobType: rowValue(row, ["jobType", "type", "workMode", "Job Type"]),
	salaryRange: rowValue(row, ["salaryRange", "salary", "Salary"]),
	visibilityType: rowValue(row, ["visibilityType", "visibility", "Visibility Type", "Visibility"]),
	targetColleges: rowValue(row, ["targetColleges", "colleges", "Target Colleges"]),
	targetCities: rowValue(row, ["targetCities", "cities", "Target Cities"]),
	publishAt: rowValue(row, [
		"publishAt",
		"publishOn",
		"scheduleAt",
		"scheduleTime",
		"schedule_time",
		"schedule time",
		"sechduleTime",
		"sechdule time",
		"Schedule At",
		"Schedule Time",
		"Publish At",
		"Publish On",
	]),
	lastDateToApply: rowValue(row, ["lastDateToApply", "lastDate", "deadline", "Last Date To Apply"]),
});

const applyExcelControlledFields = (draft, fallbackDraft) => {
	const merged = { ...draft };

	// Preserve upload sheet scheduling when provided, instead of AI guessing it.
	if (fallbackDraft?.publishAt !== undefined && fallbackDraft?.publishAt !== null && fallbackDraft?.publishAt !== "") {
		merged.publishAt = fallbackDraft.publishAt;
	}

	if (
		fallbackDraft?.lastDateToApply !== undefined &&
		fallbackDraft?.lastDateToApply !== null &&
		fallbackDraft?.lastDateToApply !== ""
	) {
		merged.lastDateToApply = fallbackDraft.lastDateToApply;
	}

	return merged;
};

const cleanupPreviewStore = () => {
	const now = Date.now();
	for (const [token, entry] of excelPreviewStore.entries()) {
		if (entry.expiresAt <= now) {
			excelPreviewStore.delete(token);
		}
	}
};

const getUserTargetContext = (user) => ({
	college: cleanString(user?.college).toLowerCase(),
	city: cleanString(user?.city).toLowerCase(),
});

const sanitizeJobForViewer = (job, viewer, { isOwner = false } = {}) => {
	if (!job) {
		return job;
	}

	if (isOwner || viewer?.role === "recruiter") {
		return job;
	}

	const sanitizedJob = { ...job };
	delete sanitizedJob.targetColleges;
	delete sanitizedJob.targetCities;
	return sanitizedJob;
};

const buildTargetedVisibilityFilter = (user) => {
	const targetContext = getUserTargetContext(user);
	const targetedSubFilters = [];

	if (targetContext.college) {
		targetedSubFilters.push({ targetColleges: { $in: [targetContext.college] } });
	}
	if (targetContext.city) {
		targetedSubFilters.push({ targetCities: { $in: [targetContext.city] } });
	}

	if (!targetedSubFilters.length) {
		return { visibilityType: "public" };
	}

	return {
		$or: [
			{ visibilityType: "public" },
			{
				visibilityType: "targeted",
				$or: targetedSubFilters,
			},
		],
	};
};

const createTargetedJobNotifications = async (job, recruiter) => {
	if (job.visibilityType !== "targeted") {
		return;
	}

	const targetingRules = [];
	if (job.targetColleges?.length) {
		targetingRules.push({ college: { $in: job.targetColleges } });
	}
	if (job.targetCities?.length) {
		targetingRules.push({ city: { $in: job.targetCities } });
	}

	if (!targetingRules.length) {
		return;
	}

	const matchingUsers = await User.find({
		role: "user",
		_id: { $ne: recruiter._id },
		$or: targetingRules,
	}).select("_id").lean().cursor();

	let notifications = [];
	const flushNotifications = async () => {
		if (!notifications.length) {
			return;
		}

		const createdNotifications = await Notification.insertMany(notifications, { ordered: false });
		for (const notification of createdNotifications) {
			emitToUser(notification.recipient, "notification:new", notification);
		}
		notifications = [];
	};

	for await (const user of matchingUsers) {
		notifications.push({
			recipient: user._id,
			type: "targetedJob",
			relatedUser: recruiter._id,
			relatedJob: job._id,
			metadata: {
				jobTitle: job.title,
				companyName: job.companyName,
			},
		});

		if (notifications.length >= 500) {
			await flushNotifications();
		}
	}

	await flushNotifications();
};

const buildPublishDedupKey = (draft, recruiterId) =>
	[
		recruiterId.toString(),
		cleanString(draft.companyName).toLowerCase(),
		cleanString(draft.title).toLowerCase(),
		cleanString(draft.location).toLowerCase(),
		cleanString(draft.jobType).toLowerCase(),
		cleanString(draft.visibilityType || "public").toLowerCase(),
		normalizeTargetValues(draft.targetColleges).sort().join("|"),
		normalizeTargetValues(draft.targetCities).sort().join("|"),
		draft.lastDateToApply instanceof Date ? draft.lastDateToApply.toISOString() : "",
	].join("::");

const parseExperienceYears = (value) => {
	if (!value) return null;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const match = String(value).match(/(\d+(\.\d+)?)/);
	if (!match) return null;
	return Number(match[1]);
};

const normalizeSkillSet = (skills) =>
	new Set(
		(Array.isArray(skills) ? skills : [])
			.map((skill) => cleanString(skill).toLowerCase())
			.filter(Boolean)
	);

const computeJobMatchScore = (job, user) => {
	if (!user || user.role === "recruiter") return null;

	let score = 0;
	let weight = 0;

	const jobSkills = normalizeSkillSet(job?.skillsRequired);
	const userSkills = normalizeSkillSet(user?.skills);
	if (jobSkills.size) {
		weight += 55;
		let matched = 0;
		jobSkills.forEach((skill) => {
			if (userSkills.has(skill)) matched += 1;
		});
		score += (matched / jobSkills.size) * 55;
	}

	const jobExp = parseExperienceYears(job?.experienceRequired);
	const userExp = parseExperienceYears(user?.experience?.length ? user.experience.length : null);
	if (jobExp !== null) {
		weight += 25;
		if (userExp !== null) {
			const expRatio = Math.min(userExp / Math.max(jobExp, 1), 1);
			score += expRatio * 25;
		}
	}

	const jobLocation = cleanString(job?.location).toLowerCase();
	const userLocation = cleanString(user?.location).toLowerCase();
	if (jobLocation) {
		weight += 20;
		if (jobLocation.includes("remote") || userLocation.includes(jobLocation) || jobLocation.includes(userLocation)) {
			score += 20;
		}
	}

	if (!weight) return null;
	return Math.round((score / weight) * 100);
};

export const createJob = async (req, res) => {
	try {
		const payload = normalizeJobPayload(req.body, { companyName: req.user.companyName });
		const validationError = validateJobPayload(payload);

		if (validationError) {
			return res.status(400).json({ message: validationError });
		}

		const job = await Job.create({
			...payload,
			companyId: req.user._id,
		});
		await syncJobPost(job);
		await createTargetedJobNotifications(job, req.user);

		const populatedJob = await Job.findById(job._id).populate(
			"companyId",
			"name username companyName companyLogo industry companyLocation"
		);

		return res.status(201).json(populatedJob);
	} catch (error) {
		console.error("Error in createJob controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const updateJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(jobId)) {
			return res.status(400).json({ message: "Invalid job id" });
		}

		const existingJob = await Job.findById(jobId);
		if (!existingJob) {
			return res.status(404).json({ message: "Job not found" });
		}

		if (existingJob.companyId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can update only your own jobs" });
		}

		const payload = normalizeJobPayload(req.body, {
			...existingJob.toObject(),
			companyName: req.user.companyName || existingJob.companyName,
		});
		const validationError = validateJobPayload(payload);
		if (validationError) {
			return res.status(400).json({ message: validationError });
		}

		const updatedJob = await Job.findByIdAndUpdate(jobId, payload, { new: true }).populate(
			"companyId",
			"name username companyName companyLogo industry companyLocation"
		);
		await syncJobPost(updatedJob);

		return res.json(updatedJob);
	} catch (error) {
		console.error("Error in updateJob controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const deleteJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(jobId)) {
			return res.status(400).json({ message: "Invalid job id" });
		}

		const existingJob = await Job.findById(jobId);
		if (!existingJob) {
			return res.status(404).json({ message: "Job not found" });
		}

		if (existingJob.companyId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can delete only your own jobs" });
		}

		await Job.findByIdAndDelete(jobId);
		await Application.deleteMany({ jobId });
		await deleteJobPost(jobId);
		return res.json({ message: "Job deleted successfully" });
	} catch (error) {
		console.error("Error in deleteJob controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getRecruiterJobs = async (req, res) => {
	try {
		const { limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });
		const jobs = await Job.find({ companyId: req.user._id })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
		const jobIds = jobs.map((job) => job._id);

		const applicationStats = jobIds.length
			? await Application.aggregate([
					{
						$match: {
							jobId: { $in: jobIds },
						},
					},
					{
						$group: {
							_id: {
								jobId: "$jobId",
								status: "$status",
							},
							count: { $sum: 1 },
						},
					},
			  ])
			: [];

		const statsByJob = applicationStats.reduce((acc, entry) => {
			const jobKey = entry._id.jobId.toString();
			if (!acc[jobKey]) {
				acc[jobKey] = {
					totalApplicants: 0,
					statusBreakdown: APPLICATION_STATUSES.reduce((statusAcc, status) => {
						statusAcc[status] = 0;
						return statusAcc;
					}, {}),
				};
			}

			acc[jobKey].totalApplicants += entry.count;
			acc[jobKey].statusBreakdown[entry._id.status] = entry.count;
			return acc;
		}, {});

		return res.json(
			jobs.map((job) => {
				const publishAt = new Date(job.publishAt).getTime();
				const isPublished = publishAt <= Date.now();
				const stats = statsByJob[job._id.toString()] || {
					totalApplicants: 0,
					statusBreakdown: APPLICATION_STATUSES.reduce((acc, status) => {
						acc[status] = 0;
						return acc;
					}, {}),
				};

				return {
					...job,
					totalApplicants: stats.totalApplicants,
					statusBreakdown: stats.statusBreakdown,
					isScheduled: !isPublished,
					isPublished,
					isExpired: new Date(job.lastDateToApply).getTime() < Date.now(),
				};
			})
		);
	} catch (error) {
		console.error("Error in getRecruiterJobs controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getAllJobs = async (req, res) => {
	try {
		const { search = "", location = "", jobType = "" } = req.query;
		const { limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 100 });
		const baseFilter = {
			isActive: true,
			publishAt: { $lte: new Date() },
		};
		const andFilters = [];

		if (req.user?.role !== "recruiter") {
			andFilters.push(buildTargetedVisibilityFilter(req.user));
		}

		const normalizedSearch = cleanString(search);
		if (normalizedSearch) {
			const safeSearch = escapeRegex(normalizedSearch).slice(0, 80);
			andFilters.push({
				$or: [
					{ title: { $regex: safeSearch, $options: "i" } },
					{ description: { $regex: safeSearch, $options: "i" } },
					{ skillsRequired: { $regex: safeSearch, $options: "i" } },
				],
			});
		}

		const normalizedLocation = cleanString(location);
		if (normalizedLocation) {
			andFilters.push({ location: { $regex: escapeRegex(normalizedLocation).slice(0, 80), $options: "i" } });
		}

		if (jobType && ["remote", "on-site", "hybrid"].includes(jobType)) {
			andFilters.push({ jobType });
		}

		const filter = andFilters.length ? { ...baseFilter, $and: andFilters } : baseFilter;

		const jobs = await Job.find(filter)
			.populate("companyId", "name username companyName companyLogo industry companyLocation")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		let appliedJobIds = new Set();
		if (req.user?.role !== "recruiter") {
			const applications = await Application.find({
				userId: req.user._id,
				jobId: { $in: jobs.map((job) => job._id) },
			}).select("jobId status").lean();
			appliedJobIds = new Set(applications.map((application) => application.jobId.toString()));
		}

		return res.json(
			jobs.map((job) => ({
				...sanitizeJobForViewer(job, req.user),
				matchScore: computeJobMatchScore(job, req.user),
				hasApplied: appliedJobIds.has(job._id.toString()),
				recommendedForYou:
					job.visibilityType === "targeted" &&
					(Boolean(cleanString(req.user?.college)) || Boolean(cleanString(req.user?.city))),
				isScheduled: new Date(job.publishAt).getTime() > Date.now(),
				isExpired: new Date(job.lastDateToApply).getTime() < Date.now(),
			}))
		);
	} catch (error) {
		console.error("Error in getAllJobs controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getJobById = async (req, res) => {
	try {
		const { jobId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(jobId)) {
			return res.status(400).json({ message: "Invalid job id" });
		}

		const job = await Job.findById(jobId).populate(
			"companyId",
			"name username companyName companyLogo companyBanner aboutCompany industry companyLocation companyWebsite"
		);
		if (!job) {
			return res.status(404).json({ message: "Job not found" });
		}

		const isOwner = job.companyId?._id?.toString() === req.user?._id?.toString();
		if (new Date(job.publishAt).getTime() > Date.now() && !isOwner) {
			return res.status(404).json({ message: "Job not found" });
		}

		if (!isOwner && req.user?.role !== "recruiter" && job.visibilityType === "targeted") {
			const targetContext = getUserTargetContext(req.user);
			const matchesCollege = targetContext.college && job.targetColleges?.includes(targetContext.college);
			const matchesCity = targetContext.city && job.targetCities?.includes(targetContext.city);
			if (!matchesCollege && !matchesCity) {
				return res.status(404).json({ message: "Job not found" });
			}
		}

		const totalApplicants = await Application.countDocuments({ jobId });
		let myApplication = null;

		if (req.user?.role !== "recruiter") {
			myApplication = await Application.findOne({ jobId, userId: req.user._id })
				.select("status createdAt updatedAt lastStatusUpdatedAt")
				.sort({ createdAt: -1 });
		}
		if (!isOwner) {
			await Job.updateOne({ _id: jobId }, { $inc: { viewCount: 1 } });
		}

		return res.json({
			...sanitizeJobForViewer(job.toObject(), req.user, { isOwner }),
			matchScore: computeJobMatchScore(job.toObject(), req.user),
			totalApplicants,
			hasApplied: Boolean(myApplication),
			myApplication,
			isScheduled: new Date(job.publishAt).getTime() > Date.now(),
			isExpired: new Date(job.lastDateToApply).getTime() < Date.now(),
		});
	} catch (error) {
		console.error("Error in getJobById controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const applyToJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const coverLetter = cleanString(req.body?.coverLetter);
		const fullName = cleanString(req.body?.fullName) || cleanString(req.user?.name);
		const email = cleanString(req.body?.email) || cleanString(req.user?.email);
		const phone = cleanString(req.body?.phone);
		const currentLocation = cleanString(req.body?.currentLocation);
		const yearsOfExperience = cleanString(req.body?.yearsOfExperience);
		const portfolioUrl = cleanString(req.body?.portfolioUrl);
		const linkedinUrl = cleanString(req.body?.linkedinUrl);
		const resumeUrl = cleanString(req.body?.resumeUrl) || cleanString(req.user?.resume);

		if (!mongoose.Types.ObjectId.isValid(jobId)) {
			return res.status(400).json({ message: "Invalid job id" });
		}

		if (req.user.role === "recruiter") {
			return res.status(403).json({ message: "Recruiters cannot apply to jobs" });
		}

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ message: "Job not found" });
		}

		if (job.visibilityType === "targeted") {
			const targetContext = getUserTargetContext(req.user);
			const matchesCollege = targetContext.college && job.targetColleges?.includes(targetContext.college);
			const matchesCity = targetContext.city && job.targetCities?.includes(targetContext.city);
			if (!matchesCollege && !matchesCity) {
				return res.status(403).json({ message: "This job is targeted to another candidate group" });
			}
		}

		if (job.companyId.toString() === req.user._id.toString()) {
			return res.status(400).json({ message: "You cannot apply to your own job" });
		}

		if (new Date(job.lastDateToApply).getTime() < Date.now()) {
			return res.status(400).json({ message: "Applications are closed for this job" });
		}

		const existingApplication = await Application.findOne({ userId: req.user._id, jobId });
		if (existingApplication) {
			return res.status(400).json({ message: "You already applied for this job" });
		}

		if (!fullName) {
			return res.status(400).json({ message: "Full name is required" });
		}

		if (!email) {
			return res.status(400).json({ message: "Email is required" });
		}

		if (!phone) {
			return res.status(400).json({ message: "Phone number is required" });
		}

		if (!resumeUrl) {
			return res.status(400).json({ message: "Resume is required to apply" });
		}

		const application = await Application.create({
			userId: req.user._id,
			jobId,
			coverLetter,
			fullName,
			email,
			phone,
			currentLocation,
			yearsOfExperience,
			portfolioUrl,
			linkedinUrl,
			resumeUrl,
			lastStatusUpdatedAt: new Date(),
			lastStatusUpdatedBy: req.user._id,
			statusHistory: [
				{
					status: "applied",
					note: "Application submitted",
					changedBy: req.user._id,
					changedAt: new Date(),
				},
			],
		});

		await createNotification({
			recipient: job.companyId,
			type: "applicationSubmitted",
			relatedUser: req.user._id,
			relatedJob: job._id,
			relatedApplication: application._id,
			metadata: {
				jobTitle: job.title,
				status: application.status,
			},
		});

		return res.status(201).json(application);
	} catch (error) {
		console.error("Error in applyToJob controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getApplicantsForJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const { status = "", search = "" } = req.query;
		const { limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });

		if (!mongoose.Types.ObjectId.isValid(jobId)) {
			return res.status(400).json({ message: "Invalid job id" });
		}

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ message: "Job not found" });
		}

		if (job.companyId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can view applicants only for your jobs" });
		}

		const query = { jobId };
		if (APPLICATION_STATUSES.includes(status)) {
			query.status = status;
		}
		const normalizedSearch = cleanString(search);
		if (normalizedSearch) {
			const safeSearch = escapeRegex(normalizedSearch).slice(0, 80);
			query.$or = [
				{ fullName: { $regex: safeSearch, $options: "i" } },
				{ email: { $regex: safeSearch, $options: "i" } },
				{ phone: { $regex: safeSearch, $options: "i" } },
				{ currentLocation: { $regex: safeSearch, $options: "i" } },
			];
		}

		const applicants = await Application.find(query)
			.populate("userId", "name username email profilePicture headline skills experience education resume")
			.populate("lastStatusUpdatedBy", "name username role")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		return res.json(applicants);
	} catch (error) {
		console.error("Error in getApplicantsForJob controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getMyApplications = async (req, res) => {
	try {
		const { limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });
		const applications = await Application.find({ userId: req.user._id })
			.populate({
				path: "jobId",
				populate: {
					path: "companyId",
					select: "name username companyName companyLogo industry companyLocation",
				},
			})
			.populate("lastStatusUpdatedBy", "name username role")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		return res.json(
			applications.map((application) => ({
				...application,
				isJobActive: Boolean(
					application.jobId?.lastDateToApply &&
					new Date(application.jobId.lastDateToApply).getTime() >= Date.now()
				),
			}))
		);
	} catch (error) {
		console.error("Error in getMyApplications controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getApplicationDetails = async (req, res) => {
	try {
		const { jobId, applicationId } = req.params;
		const { job, application, error } = await getRecruiterOwnedApplication(jobId, applicationId, req.user._id);

		if (error) {
			return res.status(error.status).json({ message: error.message });
		}

		return res.json({
			...application.toObject(),
			job: {
				_id: job._id,
				title: job.title,
				location: job.location,
				jobType: job.jobType,
				lastDateToApply: job.lastDateToApply,
				companyName: job.companyName,
				companyLogo: req.user?.companyLogo || "",
			},
		});
	} catch (error) {
		console.error("Error in getApplicationDetails controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const updateApplicationStatus = async (req, res) => {
	try {
		const { jobId, applicationId } = req.params;
		const nextStatus = cleanString(req.body?.status);
		const note = cleanString(req.body?.note);
		const rejectionTemplateUsed = cleanString(req.body?.rejectionTemplateUsed);

		if (!APPLICATION_STATUSES.includes(nextStatus)) {
			return res.status(400).json({ message: "Invalid application status" });
		}

		const { job, application, error } = await getRecruiterOwnedApplication(
			jobId,
			applicationId,
			req.user._id
		);
		if (error) {
			return res.status(error.status).json({ message: error.message });
		}

		const statusUpdateTimestamp = new Date();

		await Application.updateOne(
			{ _id: application._id, jobId },
			{
				$set: {
					status: nextStatus,
					lastStatusUpdatedAt: statusUpdateTimestamp,
					lastStatusUpdatedBy: req.user._id,
					...(nextStatus === "rejected" && rejectionTemplateUsed
						? { rejectionTemplateUsed }
						: {}),
				},
				$push: {
					statusHistory: {
						status: nextStatus,
						note,
						changedBy: req.user._id,
						changedAt: statusUpdateTimestamp,
					},
				},
			},
			{
				runValidators: true,
			}
		);

		const populatedApplication = await Application.findById(application._id)
			.populate("userId", "name username email profilePicture headline skills experience education resume")
			.populate("lastStatusUpdatedBy", "name username role")
			.populate("statusHistory.changedBy", "name username role");

		await createNotification({
			recipient: application.userId?._id || application.userId,
			type: "applicationStatusUpdated",
			relatedUser: req.user._id,
			relatedJob: job._id,
			relatedApplication: application._id,
			metadata: {
				jobTitle: job.title,
				status: nextStatus,
				note,
			},
		});

		return res.json(populatedApplication);
	} catch (error) {
		console.error("Error in updateApplicationStatus controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const updateApplicationNotes = async (req, res) => {
	try {
		const { jobId, applicationId } = req.params;
		const recruiterNotes = cleanString(req.body?.recruiterNotes);
		const { application, error } = await getRecruiterOwnedApplication(jobId, applicationId, req.user._id);

		if (error) {
			return res.status(error.status).json({ message: error.message });
		}

		await Application.updateOne(
			{ _id: application._id, jobId },
			{
				$set: {
					recruiterNotes,
				},
			},
			{
				runValidators: true,
			}
		);

		const populatedApplication = await Application.findById(application._id)
			.populate("userId", "name username email profilePicture headline skills experience education resume")
			.populate("lastStatusUpdatedBy", "name username role")
			.populate("statusHistory.changedBy", "name username role");

		return res.json(populatedApplication);
	} catch (error) {
		console.error("Error in updateApplicationNotes controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const updateApplicationPipelineMeta = async (req, res) => {
	try {
		const { jobId, applicationId } = req.params;
		const { application, error } = await getRecruiterOwnedApplication(jobId, applicationId, req.user._id);
		if (error) {
			return res.status(error.status).json({ message: error.message });
		}

		const tags = normalizeTags(req.body?.tags);
		const interviewRaw = req.body?.interviewSchedule || {};
		const scheduledAt = interviewRaw?.scheduledAt ? new Date(interviewRaw.scheduledAt) : null;
		const mode = cleanString(interviewRaw?.mode).toLowerCase();
		const meetingLink = cleanString(interviewRaw?.meetingLink);
		const notes = cleanString(interviewRaw?.notes);

		if (mode && !INTERVIEW_MODES.includes(mode)) {
			return res.status(400).json({ message: "Invalid interview mode" });
		}

		await Application.updateOne(
			{ _id: application._id, jobId },
			{
				$set: {
					tags,
					interviewSchedule: {
						scheduledAt:
							scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
						mode,
						meetingLink,
						notes,
					},
				},
			},
			{ runValidators: true }
		);

		const populatedApplication = await Application.findById(application._id)
			.populate("userId", "name username email profilePicture headline skills experience education resume")
			.populate("lastStatusUpdatedBy", "name username role")
			.populate("statusHistory.changedBy", "name username role");

		return res.json(populatedApplication);
	} catch (error) {
		console.error("Error in updateApplicationPipelineMeta controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const sendMessageToApplicant = async (req, res) => {
	try {
		const { jobId, applicationId } = req.params;
		const text = cleanString(req.body?.text);

		if (!text) {
			return res.status(400).json({ message: "Message text is required" });
		}

		const { job, application, error } = await getRecruiterOwnedApplication(jobId, applicationId, req.user._id);
		if (error) {
			return res.status(error.status).json({ message: error.message });
		}

		const message = await Message.create({
			sender: req.user._id,
			recipient: application.userId._id,
			text,
			read: false,
		});

		const populatedMessage = await Message.findById(message._id)
			.populate("sender", "name username profilePicture headline")
			.populate("recipient", "name username profilePicture headline");

		emitToUser(application.userId._id, "message:new", populatedMessage);
		emitToUser(req.user._id, "message:new", populatedMessage);

		await createNotification({
			recipient: application.userId._id,
			type: "message",
			relatedUser: req.user._id,
			relatedMessage: message._id,
			relatedJob: job._id,
			relatedApplication: application._id,
			metadata: {
				jobTitle: job.title,
				context: "application",
			},
		});

		return res.status(201).json(populatedMessage);
	} catch (error) {
		console.error("Error in sendMessageToApplicant controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const uploadExcelPreview = async (req, res) => {
	try {
		cleanupPreviewStore();

		if (!req.file) {
			return res.status(400).json({ message: "Excel file is required" });
		}

		const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
		const firstSheet = workbook.SheetNames[0];
		if (!firstSheet) {
			return res.status(400).json({ message: "No worksheet found in file" });
		}

		const worksheet = workbook.Sheets[firstSheet];
		const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
		if (!rows.length) {
			return res.status(400).json({ message: "No rows found in uploaded Excel file" });
		}

		const previewDrafts = [];
		for (let index = 0; index < rows.length; index += 1) {
			const row = rows[index];
			const fallbackDraft = rowToFallbackDraft(row);

			let aiDraft = null;
			try {
				aiDraft = await aiGenerateJobDraft(row);
			} catch (aiError) {
				console.error(`AI generation failed for row ${index + 1}:`, aiError.message);
			}

			const draftCandidate = applyExcelControlledFields(aiDraft || fallbackDraft, fallbackDraft);
			draftCandidate.description = finalizeDraftDescription(draftCandidate, fallbackDraft);
			const normalized = normalizeJobPayload(draftCandidate, {
				...fallbackDraft,
				companyName: req.user.companyName || fallbackDraft.companyName,
			});
			previewDrafts.push({
				rowNumber: index + 1,
				sourceRow: row,
				draft: normalized,
				validationError: validateJobPayload(normalized),
			});
		}

		const previewToken = randomUUID();
		excelPreviewStore.set(previewToken, {
			companyId: req.user._id.toString(),
			drafts: previewDrafts,
			expiresAt: Date.now() + PREVIEW_TTL_MS,
		});

		return res.json({
			previewToken,
			totalRows: previewDrafts.length,
			validRows: previewDrafts.filter((entry) => !entry.validationError).length,
			drafts: previewDrafts,
		});
	} catch (error) {
		console.error("Error in uploadExcelPreview controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const publishExcelJobs = async (req, res) => {
	try {
		cleanupPreviewStore();

		const previewToken = cleanString(req.body?.previewToken);
		const editedDrafts = Array.isArray(req.body?.drafts) ? req.body.drafts : null;
		if (!previewToken) {
			return res.status(400).json({ message: "previewToken is required" });
		}

		const previewEntry = excelPreviewStore.get(previewToken);
		if (!previewEntry || previewEntry.expiresAt <= Date.now()) {
			excelPreviewStore.delete(previewToken);
			return res.status(400).json({ message: "Preview expired. Please upload the Excel file again." });
		}

		if (previewEntry.companyId !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can publish only your own preview" });
		}

		const sourceDrafts = editedDrafts
			? editedDrafts.map((draft) => {
					const finalizedDraft = {
						...draft,
						description: finalizeDraftDescription(draft),
					};

					return normalizeJobPayload(finalizedDraft, {
						companyName: req.user.companyName || draft?.companyName,
					});
			  })
			: previewEntry.drafts
					.filter((entry) => !entry.validationError)
					.map((entry) => entry.draft);

		const invalidEditedDraft = sourceDrafts.find((draft) => validateJobPayload(draft));
		if (invalidEditedDraft) {
			return res.status(400).json({
				message: `Edited draft is invalid: ${validateJobPayload(invalidEditedDraft)}`,
			});
		}

		const validDrafts = sourceDrafts;
		if (!validDrafts.length) {
			return res.status(400).json({ message: "No valid jobs to publish" });
		}

		const dedupedDrafts = [];
		const seenKeys = new Set();

		for (const draft of validDrafts) {
			const normalizedDraft = {
				...draft,
				companyName: req.user.companyName || draft.companyName,
			};
			const draftKey = buildPublishDedupKey(normalizedDraft, req.user._id);
			if (!seenKeys.has(draftKey)) {
				seenKeys.add(draftKey);
				dedupedDrafts.push(normalizedDraft);
			}
		}

		const existingJobs = await Job.find({ companyId: req.user._id }).select(
			"companyName title location jobType lastDateToApply"
		);
		const existingKeys = new Set(
			existingJobs.map((job) => buildPublishDedupKey(job, req.user._id))
		);

		const draftsToInsert = dedupedDrafts.filter(
			(draft) => !existingKeys.has(buildPublishDedupKey(draft, req.user._id))
		);

		if (!draftsToInsert.length) {
			excelPreviewStore.delete(previewToken);
			return res.status(400).json({ message: "All valid jobs in this preview already exist" });
		}

		const insertedJobs = await Job.insertMany(
			draftsToInsert.map((draft) => ({
				...draft,
				companyId: req.user._id,
			}))
		);
		await Promise.all(insertedJobs.map((job) => syncJobPost(job)));

		excelPreviewStore.delete(previewToken);

		return res.status(201).json({
			message: "Jobs published successfully",
			publishedCount: insertedJobs.length,
			skippedDuplicates: dedupedDrafts.length - draftsToInsert.length,
			jobs: insertedJobs,
		});
	} catch (error) {
		console.error("Error in publishExcelJobs controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};
