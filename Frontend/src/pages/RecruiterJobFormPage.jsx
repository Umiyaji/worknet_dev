import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const initialFormState = {
  companyName: "",
  title: "",
  description: "",
  skillsRequired: "",
  experienceRequired: "",
  location: "",
  jobType: "hybrid",
  salaryRange: "",
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

  useEffect(() => {
    if (existingJob) {
      setFormData({
        companyName: existingJob.companyName || existingJob.companyId?.companyName || authUser?.companyName || "",
        title: existingJob.title || "",
        description: existingJob.description || "",
        skillsRequired: (existingJob.skillsRequired || []).join(", "),
        experienceRequired: existingJob.experienceRequired || "",
        location: existingJob.location || "",
        jobType: existingJob.jobType || "hybrid",
        salaryRange: existingJob.salaryRange || "",
        lastDateToApply: existingJob.lastDateToApply ? new Date(existingJob.lastDateToApply).toISOString().slice(0, 10) : "",
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
      toast.success(isEditMode ? "Job updated successfully" : "Job posted successfully");
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
      subtitle={isEditMode ? "Update your job opening details" : "Publish a new job for candidates"}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveJob();
        }}
        className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Company Name</label>
          <input
            required
            value={formData.companyName}
            onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
            placeholder="Company name"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <input
          required
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Job title"
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Job description"
          rows={6}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          required
          value={formData.skillsRequired}
          onChange={(e) => setFormData((prev) => ({ ...prev, skillsRequired: e.target.value }))}
          placeholder="Skills required (comma separated)"
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            value={formData.experienceRequired}
            onChange={(e) => setFormData((prev) => ({ ...prev, experienceRequired: e.target.value }))}
            placeholder="Experience required"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <input
            required
            value={formData.location}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Location"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <select
            value={formData.jobType}
            onChange={(e) => setFormData((prev) => ({ ...prev, jobType: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 bg-white"
          >
            <option value="remote">Remote</option>
            <option value="on-site">On-site</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <input
            value={formData.salaryRange}
            onChange={(e) => setFormData((prev) => ({ ...prev, salaryRange: e.target.value }))}
            placeholder="Salary range (optional)"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Last date to apply</label>
            <input
              required
              type="date"
              value={formData.lastDateToApply}
              onChange={(e) => setFormData((prev) => ({ ...prev, lastDateToApply: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
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
