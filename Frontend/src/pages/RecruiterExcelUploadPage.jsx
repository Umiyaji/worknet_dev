import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const emptyPreview = { previewToken: "", totalRows: 0, validRows: 0, drafts: [] };

const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

const toDateTimeInputValue = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 16);
};

const normalizeSkillsInput = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeJobTypeInput = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "remote" || normalized === "on-site" || normalized === "hybrid") {
    return normalized;
  }
  if (normalized === "onsite") {
    return "on-site";
  }
  return "hybrid";
};

const validateDraft = (draft) => {
  if (!draft.companyName?.trim()) return "companyName is required";
  if (!draft.title?.trim()) return "title is required";
  if (!draft.description?.trim()) return "description is required";
  if (!draft.experienceRequired?.trim()) return "experienceRequired is required";
  if (!draft.location?.trim()) return "location is required";
  if (!draft.lastDateToApply?.trim()) return "lastDateToApply is required";
  if (!normalizeSkillsInput(draft.skillsRequired || "").length) {
    return "skillsRequired must include at least one skill";
  }
  if (draft.publishAt?.trim()) {
    const publishAt = new Date(draft.publishAt);
    const lastDateToApply = new Date(draft.lastDateToApply);
    // Keep date-only deadline valid until the end of that day.
    if (!Number.isNaN(lastDateToApply.getTime())) {
      lastDateToApply.setHours(23, 59, 59, 999);
    }
    if (!Number.isNaN(publishAt.getTime()) && !Number.isNaN(lastDateToApply.getTime())) {
      if (publishAt.getTime() > lastDateToApply.getTime()) {
        return "publishAt cannot be later than lastDateToApply";
      }
    }
  }
  return "";
};

const formatDraftForEdit = (entry) => ({
  rowNumber: entry.rowNumber,
  sourceRow: entry.sourceRow,
  companyName: entry.draft.companyName || "",
  title: entry.draft.title || "",
  description: entry.draft.description || "",
  skillsRequired: Array.isArray(entry.draft.skillsRequired)
    ? entry.draft.skillsRequired.join(", ")
    : entry.draft.skillsRequired || "",
  experienceRequired: entry.draft.experienceRequired || "",
  location: entry.draft.location || "",
  jobType: entry.draft.jobType || "hybrid",
  salaryRange: entry.draft.salaryRange || "",
  publishAt: toDateTimeInputValue(entry.draft.publishAt),
  lastDateToApply: toDateInputValue(entry.draft.lastDateToApply),
  validationError: entry.validationError || "",
});

const serializeDraftForPublish = (draft) => ({
  companyName: draft.companyName.trim(),
  title: draft.title.trim(),
  description: draft.description.trim(),
  skillsRequired: normalizeSkillsInput(draft.skillsRequired),
  experienceRequired: draft.experienceRequired.trim(),
  location: draft.location.trim(),
  jobType: normalizeJobTypeInput(draft.jobType),
  salaryRange: draft.salaryRange.trim(),
  publishAt:
    draft.publishAt && !Number.isNaN(new Date(draft.publishAt).getTime())
      ? new Date(draft.publishAt).toISOString()
      : new Date().toISOString(),
  lastDateToApply: draft.lastDateToApply.trim(),
});

const RecruiterExcelUploadPage = () => {
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState(emptyPreview);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [editableDrafts, setEditableDrafts] = useState([]);
  const fileInputRef = useRef(null);

  const syncDraftsFromPreview = (data) => {
    setPreviewData(data);
    setEditableDrafts((data?.drafts || []).map(formatDraftForEdit));
  };

  const { mutate: uploadExcel, isPending: isUploading } = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosInstance.post("/jobs/upload-excel/preview", formData);
      return res.data;
    },
    onSuccess: (data) => {
      syncDraftsFromPreview(data);
      toast.success("Excel parsed. Review and edit drafts before publishing.");
    },
    onError: (error) => {
      setPreviewData(emptyPreview);
      setEditableDrafts([]);
      toast.error(error.response?.data?.message || "Failed to parse Excel");
    },
  });

  const { mutate: publishJobs, isPending: isPublishing } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/jobs/upload-excel/publish", {
        previewToken: previewData.previewToken,
        drafts: validDrafts.map(serializeDraftForPublish),
      });
      return res.data;
    },
    onSuccess: (data) => {
      const duplicateNote = data.skippedDuplicates
        ? ` ${data.skippedDuplicates} duplicate job(s) were skipped.`
        : "";
      toast.success(`${data.publishedCount} jobs published successfully.${duplicateNote}`);
      queryClient.invalidateQueries({ queryKey: ["recruiterJobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruiterDashboard"] });
      setPreviewData(emptyPreview);
      setEditableDrafts([]);
      setSelectedFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to publish jobs");
    },
  });

  const handleDraftChange = (rowNumber, field, value) => {
    setEditableDrafts((current) =>
      current.map((draft) => {
        if (draft.rowNumber !== rowNumber) {
          return draft;
        }

        const nextDraft = { ...draft, [field]: value };
        return {
          ...nextDraft,
          validationError: validateDraft(nextDraft),
        };
      }),
    );
  };

  const validDrafts = useMemo(
    () => editableDrafts.filter((draft) => !draft.validationError),
    [editableDrafts],
  );

  const hasPreview = editableDrafts.length > 0;

  return (
    <RecruiterShell
      title="AI Excel Upload"
      subtitle="Upload .xlsx file, review extracted jobs, and publish in bulk. 'Schedule Time' column is used as publish time."
    >
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
          Upload Excel
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              setSelectedFileName(file.name);
              uploadExcel(file);
            }}
          />
        </label>

        {selectedFileName ? (
          <p className="text-sm text-slate-500">Selected: {selectedFileName}</p>
        ) : null}

        {isUploading ? (
          <p className="text-sm text-slate-500">Parsing and generating drafts...</p>
        ) : null}
      </div>

      {hasPreview && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Rows: {previewData.totalRows}</p>
              <p className="text-sm text-emerald-600">Ready to publish: {validDrafts.length}</p>
            </div>

            <button
              type="button"
              disabled={isPublishing || !validDrafts.length}
              onClick={() => publishJobs()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPublishing ? "Publishing..." : "Publish Valid Jobs"}
            </button>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {editableDrafts.map((draft) => (
              <div key={draft.rowNumber} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">Row {draft.rowNumber}</p>
                    <p className="text-xs text-slate-500">Edit before publishing if needed.</p>
                  </div>
                  {draft.validationError ? (
                    <span className="text-xs text-red-600">{draft.validationError}</span>
                  ) : (
                    <span className="text-xs text-emerald-600">Ready</span>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Company Name
                    <input
                      type="text"
                      value={draft.companyName}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "companyName", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Job Title
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "title", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm text-slate-700 md:col-span-2">
                    Description
                    <textarea
                      rows={4}
                      value={draft.description}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "description", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Skills
                    <input
                      type="text"
                      value={draft.skillsRequired}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "skillsRequired", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="React, Node.js, MongoDB"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Experience Required
                    <input
                      type="text"
                      value={draft.experienceRequired}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "experienceRequired", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Location
                    <input
                      type="text"
                      value={draft.location}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "location", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Job Type
                    <select
                      value={draft.jobType}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "jobType", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="remote">remote</option>
                      <option value="on-site">on-site</option>
                      <option value="hybrid">hybrid</option>
                    </select>
                  </label>

                  <label className="text-sm text-slate-700">
                    Salary Range
                    <input
                      type="text"
                      value={draft.salaryRange}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "salaryRange", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Scheduled Publish Time
                    <input
                      type="datetime-local"
                      value={draft.publishAt}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "publishAt", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Last Date To Apply
                    <input
                      type="date"
                      value={draft.lastDateToApply}
                      onChange={(e) => handleDraftChange(draft.rowNumber, "lastDateToApply", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </RecruiterShell>
  );
};

export default RecruiterExcelUploadPage;
