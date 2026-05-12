import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import toast from "react-hot-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const normalizeTagValues = (values) =>
  Array.from(
    new Set(
      (values || [])
        .map((value) =>
          String(value || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );

const TagsInput = ({ label, placeholder, values, onChange }) => {
  const [draftValue, setDraftValue] = useState("");

  const addTag = (value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!normalized) return;
    if (values.includes(normalized)) return;
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
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="rounded-md border border-slate-300 px-2 py-2">
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-slate-500 hover:text-slate-700"
              >
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

const MultiSelectDropdown = ({
  label,
  placeholder,
  values,
  options,
  onChange,
  loading,
  emptyMessage,
}) => {
  const MAX_RENDERED_OPTIONS = 300;
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
      return;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, searchValue]);

  const visibleOptions = useMemo(
    () => filteredOptions.slice(0, MAX_RENDERED_OPTIONS),
    [filteredOptions],
  );

  const toggleValue = (option) => {
    if (values.includes(option)) {
      onChange(values.filter((value) => value !== option));
      return;
    }

    onChange(normalizeTagValues([...values, option]));
  };

  const removeValue = (option) => {
    onChange(values.filter((value) => value !== option));
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-12 w-full flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left"
      >
        {values.length ? (
          values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
            >
              {value}
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  removeValue(value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    removeValue(value);
                  }
                }}
                className="cursor-pointer text-slate-500 hover:text-slate-700"
              >
                x
              </span>
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">{placeholder}</span>
        )}
        <span className="ml-auto text-sm text-slate-400">
          {isOpen ? "Close" : "Select"}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
            className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          />

          <div
            className="max-h-56 space-y-1 overflow-y-auto overscroll-contain"
            onWheel={(event) => event.stopPropagation()}
          >
            {loading ? (
              <p className="px-2 py-3 text-sm text-slate-500">Loading...</p>
            ) : visibleOptions.length ? (
              visibleOptions.map((option) => {
                const checked = values.includes(option);

                return (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleValue(option)}
                    />
                    <span>{option}</span>
                  </label>
                );
              })
            ) : (
              <p className="px-2 py-3 text-sm text-slate-500">{emptyMessage}</p>
            )}
          </div>
          {!loading && filteredOptions.length > MAX_RENDERED_OPTIONS ? (
            <p className="mt-2 px-1 text-xs text-slate-500">
              Showing first {MAX_RENDERED_OPTIONS} results. Type more to narrow
              down.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

// fetch available colleges and cities from backend (derived from user profiles)
const useTargetLists = () =>
  useQuery({
    queryKey: ["targetLists"],
    queryFn: async () => {
      const res = await axiosInstance.get("/lookups/targets");
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

const initialFormState = {
  companyName: "",
  title: "",
  description: "",
  skillsRequired: "",
  experienceRequired: "",
  location: "",
  jobType: "hybrid",
  salaryRange: "",
  visibilityType: "public",
  targetColleges: [],
  targetCities: [],
  publishMode: "now",
  publishAt: "",
  lastDateToApply: "",
};

const RecruiterJobFormPage = () => {
  const { jobId } = useParams();
  const isEditMode = Boolean(jobId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);
  const [formData, setFormData] = useState(initialFormState);

  const { data: existingJob } = useQuery({
    queryKey: ["jobDetails", jobId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/jobs/${jobId}`);
      return res.data;
    },
    enabled: isEditMode,
  });

  const { data: targetLists, isLoading: targetsLoading } = useTargetLists();

  useEffect(() => {
    if (existingJob) {
      setFormData({
        companyName:
          existingJob.companyName ||
          existingJob.companyId?.companyName ||
          authUser?.companyName ||
          "",
        title: existingJob.title || "",
        description: existingJob.description || "",
        skillsRequired: (existingJob.skillsRequired || []).join(", "),
        experienceRequired: existingJob.experienceRequired || "",
        location: existingJob.location || "",
        jobType: existingJob.jobType || "hybrid",
        salaryRange: existingJob.salaryRange || "",
        visibilityType: existingJob.visibilityType || "public",
        targetColleges: normalizeTagValues(existingJob.targetColleges || []),
        targetCities: normalizeTagValues(existingJob.targetCities || []),
        publishMode:
          existingJob.publishAt &&
          new Date(existingJob.publishAt).getTime() > Date.now()
            ? "schedule"
            : "now",
        publishAt: existingJob.publishAt
          ? new Date(existingJob.publishAt).toISOString().slice(0, 16)
          : "",
        lastDateToApply: existingJob.lastDateToApply
          ? new Date(existingJob.lastDateToApply).toISOString().slice(0, 10)
          : "",
      });
    }
  }, [existingJob, authUser?.companyName]);

  useEffect(() => {
    if (!isEditMode && authUser?.companyName) {
      setFormData((prev) => ({ ...prev, companyName: authUser.companyName }));
    }
  }, [isEditMode, authUser?.companyName]);

  const payload = useMemo(
    () => ({
      ...formData,
      publishAt:
        formData.publishMode === "schedule" && formData.publishAt
          ? new Date(formData.publishAt).toISOString()
          : new Date().toISOString(),
      visibilityType: formData.visibilityType,
      targetColleges: normalizeTagValues(formData.targetColleges),
      targetCities: normalizeTagValues(formData.targetCities),
      skillsRequired: formData.skillsRequired
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    }),
    [formData],
  );

  const { mutate: saveJob, isPending } = useMutation({
    mutationFn: async () => {
      if (isEditMode) {
        const res = await axiosInstance.put(`/jobs/${jobId}`, payload);
        return res.data;
      }
      const res = await axiosInstance.post("/jobs", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(
        isEditMode ? "Job updated successfully" : "Job posted successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["recruiterJobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruiterDashboard"] });
      navigate("/recruiter/jobs");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to save job");
    },
  });

  return (
    <RecruiterShell
      title={isEditMode ? "Edit Job" : "Create Job Post"}
      subtitle={
        isEditMode
          ? "Update your job opening details"
          : "Publish a new job for candidates"
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            formData.visibilityType === "targeted" &&
            !formData.targetColleges.length &&
            !formData.targetCities.length
          ) {
            toast.error(
              "Add at least one target college or city for targeted hiring",
            );
            return;
          }
          saveJob();
        }}
        className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Company Name
          </label>
          <input
            required
            value={formData.companyName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, companyName: e.target.value }))
            }
            placeholder="Company name"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <input
          required
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Job title"
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <textarea
          required
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Job description"
          rows={6}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          required
          value={formData.skillsRequired}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, skillsRequired: e.target.value }))
          }
          placeholder="Skills required (comma separated)"
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            value={formData.experienceRequired}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                experienceRequired: e.target.value,
              }))
            }
            placeholder="Experience required"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <input
            required
            value={formData.location}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
            }
            placeholder="Location"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <select
            value={formData.jobType}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, jobType: e.target.value }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 bg-white"
          >
            <option value="remote">Remote</option>
            <option value="on-site">On-site</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <input
            value={formData.salaryRange}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, salaryRange: e.target.value }))
            }
            placeholder="Salary range (optional)"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Visibility
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={formData.visibilityType === "public"}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      visibilityType: "public",
                      targetColleges: [],
                      targetCities: [],
                    }))
                  }
                />
                Public
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={formData.visibilityType === "targeted"}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      visibilityType: "targeted",
                    }))
                  }
                />
                Targeted
              </label>
            </div>

            {formData.visibilityType === "targeted" ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <MultiSelectDropdown
                  label="Target Colleges"
                  placeholder="Select one or more colleges"
                  values={formData.targetColleges}
                  options={targetLists?.colleges || []}
                  onChange={(targetColleges) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetColleges,
                    }))
                  }
                  loading={targetsLoading}
                  emptyMessage="No colleges found yet."
                />

                <MultiSelectDropdown
                  label="Target Cities"
                  placeholder="Select one or more cities"
                  values={formData.targetCities}
                  options={targetLists?.cities || []}
                  onChange={(targetCities) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetCities,
                    }))
                  }
                  loading={targetsLoading}
                  emptyMessage="No cities found yet."
                />
                <p className="md:col-span-2 text-xs text-slate-500">
                  Targeted jobs are shown only to users matching selected
                  college or city.
                </p>
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Publish timing
            </label>
            <select
              value={formData.publishMode}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  publishMode: e.target.value,
                  publishAt: e.target.value === "now" ? "" : prev.publishAt,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="now">Publish now</option>
              <option value="schedule">Schedule for later</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Last date to apply
            </label>
            <input
              required
              type="date"
              value={formData.lastDateToApply}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  lastDateToApply: e.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          {formData.publishMode === "schedule" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Scheduled publish time
              </label>
              <input
                required={formData.publishMode === "schedule"}
                type="datetime-local"
                value={formData.publishAt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    publishAt: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
        >
          {isPending ? "Saving..." : isEditMode ? "Update Job" : "Publish Job"}
        </button>
      </form>
    </RecruiterShell>
  );
};

export default RecruiterJobFormPage;
