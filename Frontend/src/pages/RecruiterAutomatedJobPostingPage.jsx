import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Plus, Trash2, Upload, CalendarClock, Save, Table2 } from "lucide-react";
import toast from "react-hot-toast";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import { axiosInstance } from "../lib/axios";

const statusClasses = {
	draft: "bg-slate-100 text-slate-700 border-slate-200",
	scheduled: "bg-amber-100 text-amber-800 border-amber-200",
	posted: "bg-emerald-100 text-emerald-700 border-emerald-200",
	error: "bg-red-100 text-red-700 border-red-200",
};

const toDateInputValue = (value) => {
	if (!value) return "";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const normalizeTagValues = (values) =>
	Array.from(
		new Set(
			(values || [])
				.map((value) => String(value || "").trim().toLowerCase())
				.filter(Boolean),
		),
	);

const TagsInput = ({ label, placeholder, values, onChange }) => {
	const [draftValue, setDraftValue] = useState("");

	const addTag = (value) => {
		const normalized = String(value || "").trim().toLowerCase();
		if (!normalized || values.includes(normalized)) return;
		onChange([...values, normalized]);
	};

	const removeTag = (tag) => {
		onChange(values.filter((value) => value !== tag));
	};

	const handleKeyDown = (event) => {
		if (event.key === "Enter" || event.key === ",") {
			event.preventDefault();
			addTag(draftValue);
			setDraftValue("");
			return;
		}

		if (event.key === "Backspace" && !draftValue && values.length) {
			onChange(values.slice(0, -1));
		}
	};

	return (
		<div>
			<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
			<div className="rounded-lg border border-slate-300 px-3 py-2">
				<div className="mb-2 flex flex-wrap gap-2">
					{values.map((tag) => (
						<span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
							{tag}
							<button type="button" onClick={() => removeTag(tag)} className="text-slate-500 hover:text-slate-700">
								x
							</button>
						</span>
					))}
				</div>
				<input
					value={draftValue}
					onChange={(e) => setDraftValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={() => {
						addTag(draftValue);
						setDraftValue("");
					}}
					placeholder={placeholder}
					className="w-full border-0 p-0 text-sm outline-none"
				/>
			</div>
		</div>
	);
};

const toFormRow = (row) => ({
	...row,
	skillsRequiredInput: Array.isArray(row.skillsRequired) ? row.skillsRequired.join(", ") : "",
	lastDateToApplyInput: toDateInputValue(row.lastDateToApply),
	autoPostApprovedInput: Boolean(row.autoPostApproved),
	visibilityType: row.visibilityType || "public",
	targetCollegesInput: normalizeTagValues(row.targetColleges || []),
	targetCitiesInput: normalizeTagValues(row.targetCities || []),
});

const parseSkills = (value) =>
	String(value || "")
		.split(/[,\n|]/)
		.map((skill) => skill.trim())
		.filter(Boolean);

const normalizeRowForSave = (row) => ({
	uniqueRowId: row.uniqueRowId,
	jobTitle: row.jobTitle,
	companyName: row.companyName,
	location: row.location,
	experienceRequired: row.experienceRequired,
	skillsRequired: parseSkills(row.skillsRequiredInput),
	jobType: row.jobType,
	visibilityType: row.visibilityType,
	targetColleges: normalizeTagValues(row.targetCollegesInput),
	targetCities: normalizeTagValues(row.targetCitiesInput),
	salaryRange: row.salaryRange,
	lastDateToApply: row.lastDateToApplyInput,
	autoPostApproved: row.autoPostApprovedInput,
	autoPostAt: row.autoPostAt || null,
	status: row.status,
});

const createDefaultRowPayload = (authUser) => {
	const fallbackDate = new Date();
	fallbackDate.setDate(fallbackDate.getDate() + 7);
	return {
		jobTitle: "New Role",
		companyName: authUser?.companyName || "Company",
		location: authUser?.companyLocation || "Remote",
		experienceRequired: "0-2 years",
		skillsRequired: ["Communication"],
		jobType: "hybrid",
		visibilityType: "public",
		targetColleges: [],
		targetCities: [],
		salaryRange: "",
		lastDateToApply: fallbackDate.toISOString().slice(0, 10),
		autoPostApproved: false,
		autoPostAt: null,
		status: "draft",
	};
};

const RecruiterAutomatedJobPostingPage = () => {
	const queryClient = useQueryClient();
	const authUser = queryClient.getQueryData(["authUser"]);
	const fileRef = useRef(null);

	const [editingRows, setEditingRows] = useState([]);
	const [selectedIds, setSelectedIds] = useState([]);
	const [sharedAutoPostAt, setSharedAutoPostAt] = useState(() =>
		new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
	);

	const { data, isLoading } = useQuery({
		queryKey: ["automatedJobRows"],
		queryFn: async () => {
			const res = await axiosInstance.get("/job-rows");
			return res.data;
		},
	});

	useEffect(() => {
		setEditingRows((data || []).map(toFormRow));
	}, [data]);

	const refreshRows = () => {
		queryClient.invalidateQueries({ queryKey: ["automatedJobRows"] });
		queryClient.invalidateQueries({ queryKey: ["recruiterDashboard"] });
		queryClient.invalidateQueries({ queryKey: ["recruiterJobs"] });
	};

	const { mutate: addRow, isPending: isAdding } = useMutation({
		mutationFn: async () => {
			const res = await axiosInstance.post("/job-rows", createDefaultRowPayload(authUser));
			return res.data;
		},
		onSuccess: () => {
			toast.success("Row added");
			refreshRows();
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Failed to add row");
		},
	});

	const { mutate: saveRow, isPending: isSaving } = useMutation({
		mutationFn: async ({ rowId, payload }) => {
			const res = await axiosInstance.put(`/job-rows/${rowId}`, payload);
			return res.data;
		},
		onSuccess: () => {
			toast.success("Row updated");
			refreshRows();
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Failed to update row");
		},
	});

	const { mutate: deleteRow, isPending: isDeleting } = useMutation({
		mutationFn: async (rowId) => {
			await axiosInstance.delete(`/job-rows/${rowId}`);
		},
		onSuccess: () => {
			toast.success("Row deleted");
			refreshRows();
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Failed to delete row");
		},
	});

	const { mutate: postNow, isPending: isPostingNow } = useMutation({
		mutationFn: async (rowId) => {
			const res = await axiosInstance.post(`/job-rows/${rowId}/post-now`);
			return res.data;
		},
		onSuccess: () => {
			toast.success("Job posted");
			refreshRows();
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Failed to post now");
		},
	});

	const { mutate: bulkAction, isPending: isBulkWorking } = useMutation({
		mutationFn: async (action) => {
			const res = await axiosInstance.post("/job-rows/bulk-action", {
				action,
				rowIds: selectedIds,
				autoPostAt: action === "schedule" && sharedAutoPostAt ? new Date(sharedAutoPostAt).toISOString() : undefined,
			});
			return res.data;
		},
		onSuccess: (result) => {
			toast.success(result.message || "Bulk action completed");
			setSelectedIds([]);
			refreshRows();
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Bulk action failed");
		},
	});

	const { mutate: uploadExcel, isPending: isUploading } = useMutation({
		mutationFn: async (file) => {
			const formData = new FormData();
			formData.append("file", file);
			const res = await axiosInstance.post("/job-rows/upload-excel", formData);
			return res.data;
		},
		onSuccess: (result) => {
			toast.success(`Imported ${result.createdCount} row(s)`);
			refreshRows();
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Excel upload failed");
		},
	});

	const { mutate: runScheduledNow, isPending: isRunningScheduled } = useMutation({
		mutationFn: async () => {
			const res = await axiosInstance.post("/job-rows/process-scheduled");
			return res.data;
		},
		onSuccess: (result) => {
			toast.success(
				`Scheduler run complete: posted ${result.postedCount}, duplicates ${result.duplicateCount}, failed ${result.failedCount}`
			);
			refreshRows();
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Failed to run scheduled processor");
		},
	});

	const toggleSelectAll = (checked) => {
		if (checked) {
			setSelectedIds(editingRows.map((row) => row._id));
			return;
		}
		setSelectedIds([]);
	};

	const allSelected = editingRows.length > 0 && selectedIds.length === editingRows.length;

	useEffect(() => {
		setSelectedIds((prev) => prev.filter((id) => editingRows.some((row) => row._id === id)));
	}, [editingRows]);

	const updateRow = (rowId, updater) => {
		setEditingRows((prev) =>
			prev.map((item) => {
				if (item._id !== rowId) {
					return item;
				}

				const changes = typeof updater === "function" ? updater(item) : updater;
				return { ...item, ...changes };
			})
		);
	};

	const counts = useMemo(() => {
		return editingRows.reduce(
			(acc, row) => {
				acc.total += 1;
				acc[row.status] = (acc[row.status] || 0) + 1;
				return acc;
			},
			{ total: 0, draft: 0, scheduled: 0, posted: 0, error: 0 }
		);
	}, [editingRows]);

	const isBusy =
		isAdding || isSaving || isDeleting || isPostingNow || isBulkWorking || isUploading || isRunningScheduled;

	return (
		<RecruiterShell
			title="Automated Job Posting"
			subtitle="Manage job rows, schedule automated posting, upload Excel, and post manually when needed"
		>
			<div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-slate-100 p-5 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => addRow()}
							disabled={isBusy}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-800 disabled:opacity-60"
						>
							<Plus size={16} />
							Add Row
						</button>

						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							disabled={isBusy}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
						>
							<Upload size={16} />
							Upload Excel
						</button>
						<input
							ref={fileRef}
							type="file"
							accept=".xlsx,.xls,.csv"
							className="hidden"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (!file) return;
								uploadExcel(file);
								event.target.value = "";
							}}
						/>

						<button
							type="button"
							onClick={() => runScheduledNow()}
							disabled={isBusy}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
						>
							<CalendarClock size={16} />
							Run Scheduled Now
						</button>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<label className="text-sm text-slate-700">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Shared Auto-Scheduler Time</span>
							<input
								type="datetime-local"
								value={sharedAutoPostAt}
								onChange={(e) => setSharedAutoPostAt(e.target.value)}
								className="rounded-lg border border-slate-300 bg-white px-3 py-2"
							/>
						</label>
						<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
							Total {counts.total} | Draft {counts.draft} | Scheduled {counts.scheduled} | Posted {counts.posted}
						</div>
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="mb-3 flex flex-wrap items-center gap-2">
					<label className="mr-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
						<input
							type="checkbox"
							checked={allSelected}
							onChange={(e) => toggleSelectAll(e.target.checked)}
						/>
						Select all
					</label>
					<button
						type="button"
						disabled={!selectedIds.length || isBusy}
						onClick={() => bulkAction("post_now")}
						className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
					>
						Post Selected Now
					</button>
					<button
						type="button"
						disabled={!selectedIds.length || isBusy}
						onClick={() => bulkAction("schedule")}
						className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
					>
						Schedule Selected
					</button>
					<button
						type="button"
						disabled={!selectedIds.length || isBusy}
						onClick={() => bulkAction("delete")}
						className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
					>
						Delete Selected
					</button>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-10 text-slate-500">
						<Loader2 className="animate-spin" />
					</div>
				) : (
					<div className="space-y-4">
						{editingRows.map((row) => (
							<div key={row._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
								<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
									<label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
										<input
											type="checkbox"
											checked={selectedIds.includes(row._id)}
											onChange={(e) => {
												setSelectedIds((prev) =>
													e.target.checked
														? prev.includes(row._id)
															? prev
															: [...prev, row._id]
														: prev.filter((id) => id !== row._id)
												);
											}}
										/>
										Select row
									</label>
									<div className="flex flex-wrap items-center gap-2">
										<span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusClasses[row.status] || statusClasses.draft}`}>
											{row.status}
										</span>
										<span className={`rounded-full border px-3 py-1 text-xs font-medium ${row.autoPostApprovedInput ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
											Auto-post verification: {row.autoPostApprovedInput ? "Yes" : "No"}
										</span>
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Job Title</span>
										<input
											value={row.jobTitle}
											onChange={(e) => updateRow(row._id, { jobTitle: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										/>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Company</span>
										<input
											value={row.companyName}
											onChange={(e) => updateRow(row._id, { companyName: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										/>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Location</span>
										<input
											value={row.location}
											onChange={(e) => updateRow(row._id, { location: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										/>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</span>
										<input
											value={row.experienceRequired}
											onChange={(e) => updateRow(row._id, { experienceRequired: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										/>
									</label>
									<label className="text-sm text-slate-700 md:col-span-2 xl:col-span-2">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</span>
										<input
											value={row.skillsRequiredInput}
											onChange={(e) => updateRow(row._id, { skillsRequiredInput: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										/>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Job Type</span>
										<select
											value={row.jobType}
											onChange={(e) => updateRow(row._id, { jobType: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										>
											<option value="remote">remote</option>
											<option value="on-site">on-site</option>
											<option value="hybrid">hybrid</option>
										</select>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Salary</span>
										<input
											value={row.salaryRange || ""}
											onChange={(e) => updateRow(row._id, { salaryRange: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										/>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Last Date</span>
										<input
											type="date"
											value={row.lastDateToApplyInput}
											onChange={(e) => updateRow(row._id, { lastDateToApplyInput: e.target.value })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										/>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
										<select
											value={row.status}
											onChange={(e) => updateRow(row._id, { status: e.target.value })}
											disabled={row.status === "posted"}
											className={`w-full rounded-lg border px-3 py-2 capitalize ${statusClasses[row.status] || statusClasses.draft}`}
										>
											<option value="draft">draft</option>
											<option value="scheduled">scheduled</option>
											<option value="error">error</option>
										</select>
									</label>
									<label className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Verified for Auto-Post</span>
										<select
											value={row.autoPostApprovedInput ? "yes" : "no"}
											onChange={(e) => updateRow(row._id, { autoPostApprovedInput: e.target.value === "yes" })}
											className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
										>
											<option value="no">No</option>
											<option value="yes">Yes</option>
										</select>
									</label>
									<div className="text-sm text-slate-700">
										<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Targeted Posting</span>
										<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
											<div className="flex flex-wrap items-center gap-4">
												<label className="inline-flex items-center gap-2 text-sm text-slate-700">
													<input
														type="radio"
														checked={row.visibilityType === "public"}
														onChange={() =>
															updateRow(row._id, {
																visibilityType: "public",
																targetCollegesInput: [],
																targetCitiesInput: [],
															})
														}
													/>
													Public
												</label>
												<label className="inline-flex items-center gap-2 text-sm text-slate-700">
													<input
														type="radio"
														checked={row.visibilityType === "targeted"}
														onChange={() => updateRow(row._id, { visibilityType: "targeted" })}
													/>
													Targeted
												</label>
											</div>
										</div>
									</div>
								</div>

								{row.visibilityType === "targeted" ? (
									<div className="mt-4 grid gap-4 md:grid-cols-2">
										<TagsInput
											key={`${row._id}-colleges`}
											label="Target Colleges"
											placeholder="Type college and press Enter"
											values={row.targetCollegesInput}
											onChange={(next) => updateRow(row._id, { targetCollegesInput: normalizeTagValues(next) })}
										/>
										<TagsInput
											key={`${row._id}-cities`}
											label="Target Cities"
											placeholder="Type city and press Enter"
											values={row.targetCitiesInput}
											onChange={(next) => updateRow(row._id, { targetCitiesInput: normalizeTagValues(next) })}
										/>
									</div>
								) : null}

								{row.lastError ? (
									<p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
										{row.lastError}
									</p>
								) : null}

								<div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-4">
									<button
										type="button"
										onClick={() => saveRow({ rowId: row._id, payload: normalizeRowForSave(row) })}
										disabled={isBusy}
										className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
									>
										<Save size={15} />
										Save
									</button>
									<button
										type="button"
										onClick={() => postNow(row._id)}
										disabled={isBusy}
										className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
									>
										<Play size={15} />
										Post Now
									</button>
									<button
										type="button"
										onClick={() =>
											saveRow({
												rowId: row._id,
												payload: {
													...normalizeRowForSave(row),
													status: "scheduled",
													autoPostAt: sharedAutoPostAt
														? new Date(sharedAutoPostAt).toISOString()
														: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
												},
											})
										}
										disabled={isBusy}
										className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-60"
									>
										<CalendarClock size={15} />
										Schedule
									</button>
									<button
										type="button"
										onClick={() => deleteRow(row._id)}
										disabled={isBusy}
										className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
									>
										<Trash2 size={15} />
										Delete
									</button>
								</div>
							</div>
						))}

						{!editingRows.length ? (
							<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
								<Table2 size={22} className="text-slate-400" />
								<p className="font-medium text-slate-600">No rows yet</p>
								<p>Add a row or upload an Excel file to begin automated posting.</p>
							</div>
						) : null}
					</div>
				)}
			</div>
		</RecruiterShell>
	);
};

export default RecruiterAutomatedJobPostingPage;
