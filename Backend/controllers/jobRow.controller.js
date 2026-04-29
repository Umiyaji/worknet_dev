import mongoose from "mongoose";
import XLSX from "xlsx";
import JobRow from "../models/jobRow.model.js";
import {
	createRowFromPayload,
	prepareRowPayload,
	processJobRowById,
	processScheduledRows,
} from "../lib/jobRowService.js";
import { getPagination } from "../lib/pagination.js";

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeHeaderKey = (value) =>
	cleanString(String(value || ""))
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");

const rowValue = (row, keys) => {
	const normalizedEntries = Object.entries(row || {}).map(([key, value]) => [normalizeHeaderKey(key), value]);

	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
			return row[key];
		}

		const normalizedKey = normalizeHeaderKey(key);
		const matchedEntry = normalizedEntries.find(([entryKey, value]) => entryKey === normalizedKey && value !== undefined && value !== null);
		if (matchedEntry) {
			return matchedEntry[1];
		}
	}
	return "";
};

const normalizeStatus = (status) => {
	const value = cleanString(status).toLowerCase();
	if (value === "scheduled" || value === "posted" || value === "error") return value;
	return "draft";
};

const normalizeApprovalValue = (value) => {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value === 1;

	const normalized = cleanString(String(value || "")).toLowerCase();
	return ["yes", "y", "true", "1", "approved", "verify", "verified"].includes(normalized);
};

const excelRowToPayload = (row) => ({
	uniqueRowId: rowValue(row, ["uniqueRowId", "rowId", "row_id", "Row Id", "Unique Row Id"]),
	jobTitle: rowValue(row, ["jobTitle", "title", "job_title", "Job Title", "JOB TITLE"]),
	companyName: rowValue(row, ["companyName", "company", "Company Name", "COMPANY"]),
	location: rowValue(row, ["location", "officeLocation", "Location"]),
	experienceRequired: rowValue(row, ["experienceRequired", "experience", "Experience"]),
	skillsRequired: rowValue(row, ["skillsRequired", "skills", "Skills"]),
	jobType: rowValue(row, ["jobType", "type", "workMode", "Job Type"]),
	visibilityType: rowValue(row, ["visibilityType", "visibility", "Visibility Type", "Visibility", "TARGETED POSTING"]),
	targetColleges: rowValue(row, ["targetColleges", "colleges", "Target Colleges", "TARGET COLLEGES"]),
	targetCities: rowValue(row, ["targetCities", "cities", "Target Cities", "TARGET CITIES"]),
	salaryRange: rowValue(row, ["salaryRange", "salary", "Salary Range", "SALARY"]),
	lastDateToApply: rowValue(row, ["lastDateToApply", "deadline", "Last Date To Apply", "Last Date", "LAST DATE"]),
	autoPostApproved: normalizeApprovalValue(
		rowValue(row, ["autoPostApproved", "approval", "approved", "verified", "Verify", "Approved", "VERIFY"])
	),
	autoPostAt: rowValue(row, [
		"autoPostAt",
		"scheduleTime",
		"schedule_time",
		"schedule time",
		"auto schedule time",
		"Auto Post Time",
		"Schedule Time",
		"SCHEDULE TIME",
	]),
	status: normalizeStatus(rowValue(row, ["status", "Status"])),
});

export const listJobRows = async (req, res) => {
	try {
		const { limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });
		const rows = await JobRow.find({ recruiterId: req.user._id })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate("postId", "_id createdAt")
			.populate("jobId", "_id")
			.lean();

		return res.json(rows);
	} catch (error) {
		console.error("Error in listJobRows controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const addJobRow = async (req, res) => {
	try {
		const { row, error } = await createRowFromPayload(req.body, req.user);
		if (error) {
			return res.status(400).json({ message: error });
		}
		return res.status(201).json(row);
	} catch (error) {
		if (error?.code === 11000) {
			return res.status(409).json({ message: "uniqueRowId already exists" });
		}
		if (error?.name === "ValidationError") {
			const firstError = Object.values(error.errors || {})[0];
			return res.status(400).json({ message: firstError?.message || "Invalid row payload" });
		}
		console.error("Error in addJobRow controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const updateJobRow = async (req, res) => {
	try {
		const { rowId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(rowId)) {
			return res.status(400).json({ message: "Invalid row id" });
		}

		const existing = await JobRow.findById(rowId);
		if (!existing) {
			return res.status(404).json({ message: "Row not found" });
		}

		if (existing.recruiterId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can update only your own rows" });
		}

		const { normalized, validationError } = prepareRowPayload(req.body, existing.toObject());
		if (validationError) {
			return res.status(400).json({ message: validationError });
		}

		const requestedStatus = normalized.status;
		const nextStatus =
			requestedStatus === "posted" && !existing.postId && !existing.jobId ? existing.status : requestedStatus;
		const updatePayload = {
			...normalized,
			status: nextStatus,
			isProcessed: nextStatus === "posted" ? true : false,
			processingLock: false,
			processingLockedAt: null,
			lastError: "",
			nextRetryAt: null,
		};

		const updated = await JobRow.findByIdAndUpdate(
			rowId,
			{
				$set: updatePayload,
				$push: {
					logs: {
						event: "updated",
						message: "Row updated by recruiter",
						createdAt: new Date(),
					},
				},
			},
			{ new: true }
		);

		return res.json(updated);
	} catch (error) {
		if (error?.code === 11000) {
			return res.status(409).json({ message: "uniqueRowId already exists" });
		}
		console.error("Error in updateJobRow controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const deleteJobRow = async (req, res) => {
	try {
		const { rowId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(rowId)) {
			return res.status(400).json({ message: "Invalid row id" });
		}

		const row = await JobRow.findById(rowId);
		if (!row) {
			return res.status(404).json({ message: "Row not found" });
		}

		if (row.recruiterId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can delete only your own rows" });
		}

		await JobRow.findByIdAndDelete(rowId);
		return res.json({ message: "Row deleted successfully" });
	} catch (error) {
		console.error("Error in deleteJobRow controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const postJobRowNow = async (req, res) => {
	try {
		const { rowId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(rowId)) {
			return res.status(400).json({ message: "Invalid row id" });
		}

		const row = await JobRow.findById(rowId);
		if (!row) {
			return res.status(404).json({ message: "Row not found" });
		}
		if (row.recruiterId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can process only your own rows" });
		}

		const result = await processJobRowById(rowId, { force: true });
		if (result.success) {
			const updated = await JobRow.findById(rowId);
			return res.json({
				message: result.duplicate ? "Row already posted previously" : "Row posted successfully",
				row: updated,
				result,
			});
		}

		if (result.skipped) {
			return res.status(409).json({ message: "Row is locked or cannot be processed right now" });
		}

		return res.status(500).json({ message: result.error || "Failed to process row" });
	} catch (error) {
		console.error("Error in postJobRowNow controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const bulkActionJobRows = async (req, res) => {
	try {
		const rowIds = Array.isArray(req.body?.rowIds) ? req.body.rowIds : [];
		const action = cleanString(req.body?.action).toLowerCase();
		const requestedAutoPostAt = cleanString(req.body?.autoPostAt);

		if (!rowIds.length) {
			return res.status(400).json({ message: "rowIds is required" });
		}
		if (!["post_now", "schedule", "delete"].includes(action)) {
			return res.status(400).json({ message: "action must be post_now, schedule, or delete" });
		}

		const validIds = rowIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
		if (!validIds.length) {
			return res.status(400).json({ message: "No valid row ids provided" });
		}

		const rows = await JobRow.find({ _id: { $in: validIds }, recruiterId: req.user._id }).select("_id");
		const ownedIds = rows.map((row) => row._id.toString());

		if (!ownedIds.length) {
			return res.status(404).json({ message: "No rows found for requested ids" });
		}

		if (action === "delete") {
			const result = await JobRow.deleteMany({ _id: { $in: ownedIds }, recruiterId: req.user._id });
			return res.json({ message: "Rows deleted", deletedCount: result.deletedCount || 0 });
		}

		if (action === "schedule") {
			const providedAutoPostAt = requestedAutoPostAt ? new Date(requestedAutoPostAt) : null;
			if (requestedAutoPostAt && Number.isNaN(providedAutoPostAt.getTime())) {
				return res.status(400).json({ message: "autoPostAt must be a valid date-time" });
			}
			const defaultAutoPostAt =
				providedAutoPostAt && !Number.isNaN(providedAutoPostAt.getTime())
					? providedAutoPostAt
					: new Date(Date.now() + 5 * 60 * 1000);
			const result = await JobRow.updateMany(
				{ _id: { $in: ownedIds }, recruiterId: req.user._id },
				[
					{
						$set: {
							status: "scheduled",
							isProcessed: false,
							autoPostAt: defaultAutoPostAt,
							lastError: "",
							nextRetryAt: null,
							processingLock: false,
							processingLockedAt: null,
							logs: {
								$concatArrays: [
									"$logs",
									[
										{
											event: "scheduled",
											message: "Row moved to scheduled state via bulk action",
											createdAt: new Date(),
										},
									],
								],
							},
						},
					},
				]
			);
			return res.json({ message: "Rows scheduled", updatedCount: result.modifiedCount || 0 });
		}

		const outcomes = [];
		for (const rowId of ownedIds) {
			// eslint-disable-next-line no-await-in-loop
			const outcome = await processJobRowById(rowId, { force: true });
			outcomes.push(outcome);
		}

		return res.json({
			message: "Bulk post-now completed",
			processedCount: outcomes.filter((item) => item.success).length,
			failedCount: outcomes.filter((item) => item.success === false).length,
			skippedCount: outcomes.filter((item) => item.skipped).length,
		});
	} catch (error) {
		console.error("Error in bulkActionJobRows controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const uploadJobRowsExcel = async (req, res) => {
	try {
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

		const created = [];
		const skipped = [];

		for (let index = 0; index < rows.length; index += 1) {
			const payload = excelRowToPayload(rows[index]);
			// eslint-disable-next-line no-await-in-loop
			const { row, error } = await createRowFromPayload(payload, req.user);
			if (error) {
				skipped.push({ rowNumber: index + 1, reason: error });
				continue;
			}
			created.push(row);
		}

		return res.status(201).json({
			message: "Excel rows imported",
			totalRows: rows.length,
			createdCount: created.length,
			skippedCount: skipped.length,
			skipped,
			rows: created,
		});
	} catch (error) {
		if (error?.code === 11000) {
			return res.status(409).json({ message: "Duplicate uniqueRowId found in uploaded file" });
		}
		console.error("Error in uploadJobRowsExcel controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const processScheduledJobRowsNow = async (_req, res) => {
	try {
		const result = await processScheduledRows();
		return res.json({
			message: "Scheduled job-row processor executed",
			...result,
		});
	} catch (error) {
		console.error("Error in processScheduledJobRowsNow controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};
