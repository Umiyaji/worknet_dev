import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";
import { Building2, ClipboardList, Loader2, MapPin, Users } from "lucide-react";
import CompanyLogo from "../components/CompanyLogo";

const JobDetailPage = () => {
  const { jobId } = useParams();
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);
  const defaultWorknetProfileUrl = useMemo(() => {
    if (!authUser?.username) return "";
    if (typeof window === "undefined") return `/profile/${authUser.username}`;
    return `${window.location.origin}/profile/${authUser.username}`;
  }, [authUser?.username]);

  const [applicationForm, setApplicationForm] = useState({
    fullName: authUser?.name || "",
    email: authUser?.email || "",
    phone: authUser?.phone || "",
    currentLocation: authUser?.location || "",
    yearsOfExperience: "",
    portfolioUrl: "",
    linkedinUrl: defaultWorknetProfileUrl,
    coverLetter: "",
  });
  const [resumeFile, setResumeFile] = useState(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobDetails", jobId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/jobs/${jobId}`);
      return res.data;
    },
    enabled: Boolean(jobId),
  });

  const { mutateAsync: uploadResume, isPending: isUploadingResume } = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await axiosInstance.post("/users/resume", formData);
      return res.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["authUser"], (prev) => ({
        ...prev,
        ...updatedUser,
      }));
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  const { mutateAsync: applyToJob, isPending: isApplying } = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.post(`/jobs/${jobId}/apply`, payload);
      return res.data;
    },
  });

  const isSubmitting = isApplying || isUploadingResume;

  const currentResumeUrl = useMemo(() => {
    const latestAuth = queryClient.getQueryData(["authUser"]);
    return latestAuth?.resume || authUser?.resume || "";
  }, [queryClient, authUser?.resume]);

  const handleApply = async () => {
    if (!applicationForm.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (!applicationForm.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!applicationForm.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    try {
      let resumeUrl = currentResumeUrl;

      if (resumeFile) {
        const updatedUser = await uploadResume(resumeFile);
        resumeUrl = updatedUser?.resume || resumeUrl;
      }

      if (!resumeUrl) {
        toast.error("Please upload resume before applying");
        return;
      }

      await applyToJob({
        ...applicationForm,
        resumeUrl,
      });

      toast.success("Applied successfully");
      setApplicationForm((prev) => ({
        ...prev,
        yearsOfExperience: "",
        portfolioUrl: "",
        linkedinUrl: defaultWorknetProfileUrl,
        coverLetter: "",
      }));
      setResumeFile(null);
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobDetails", jobId] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to apply");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-700" />
      </div>
    );
  }

  if (!job) {
    return <div className="text-center text-slate-500">Job not found.</div>;
  }

  const isRecruiter = authUser?.role === "recruiter";
  const alreadyApplied = Boolean(job.hasApplied || job.myApplication);
  const recruiterUsername = job.companyId?.username;
  const canViewExactTargeting = isRecruiter || job.companyId?._id === authUser?._id;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
        <div className="flex items-start gap-3">
          <CompanyLogo
            src={job.companyId?.companyLogo}
            name={job.companyName || job.companyId?.companyName || "Company"}
            className="h-12 w-12 rounded-xl object-cover border border-slate-200 bg-white"
          />
          <div>
            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
            <p className="mt-2 text-slate-300">
              {job.companyName || job.companyId?.companyName || "Company"} | {job.jobType}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-200">
          {job.visibilityType === "targeted" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/30 px-3 py-1.5 text-indigo-100">
              Targeted Hiring
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
            <MapPin size={16} /> {job.location}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
            <Users size={16} /> {job.totalApplicants || 0} applicants
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
            <Building2 size={16} /> {job.experienceRequired}
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Last date: {new Date(job.lastDateToApply).toLocaleDateString()}
          {job.salaryRange ? ` | Salary: ${job.salaryRange}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {recruiterUsername ? (
            <Link
              to={`/company/${recruiterUsername}`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              View Company
            </Link>
          ) : null}
          {alreadyApplied && !isRecruiter ? (
            <Link
              to="/applications"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Track My Application
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Job Description</h3>
        <p className="text-slate-700 whitespace-pre-wrap">{job.description}</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Skills Required</h3>
        <div className="flex flex-wrap gap-2">
          {job.skillsRequired?.map((skill) => (
            <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {job.visibilityType === "targeted" ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">Targeted Hiring</h3>
          <p className="text-sm text-indigo-700 mb-3">
            This role is currently part of a targeted hiring campaign.
          </p>
          {canViewExactTargeting ? (
            <div className="flex flex-wrap gap-2">
              {(job.targetColleges || []).map((college) => (
                <span key={`college-${college}`} className="rounded-full bg-white px-3 py-1 text-xs text-indigo-700">
                  College: {college}
                </span>
              ))}
              {(job.targetCities || []).map((city) => (
                <span key={`city-${city}`} className="rounded-full bg-white px-3 py-1 text-xs text-indigo-700">
                  City: {city}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!isRecruiter && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Apply to this job</h3>

          {alreadyApplied ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">You already applied to this role.</p>
              <p className="mt-1 text-sm text-emerald-700">
                Current status: <span className="capitalize">{job.myApplication?.status || "applied"}</span>
              </p>
            </div>
          ) : null}

          {job.isExpired && !alreadyApplied ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Applications are closed for this job.
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              value={applicationForm.fullName}
              onChange={(e) => setApplicationForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Full name"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              required
              type="email"
              value={applicationForm.email}
              onChange={(e) => setApplicationForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              required
              value={applicationForm.phone}
              onChange={(e) => setApplicationForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              value={applicationForm.currentLocation}
              onChange={(e) => setApplicationForm((prev) => ({ ...prev, currentLocation: e.target.value }))}
              placeholder="Current location"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              value={applicationForm.yearsOfExperience}
              onChange={(e) => setApplicationForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))}
              placeholder="Years of experience"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              type="url"
              value={applicationForm.linkedinUrl}
              onChange={(e) => setApplicationForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
              placeholder="Worknet Profile URL (optional)"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              type="url"
              value={applicationForm.portfolioUrl}
              onChange={(e) => setApplicationForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
              placeholder="Portfolio URL (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 md:col-span-2"
            />
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700 mb-2">Resume (required)</p>
            <p className="text-xs text-slate-500 mb-3">
              {currentResumeUrl
                ? "Your profile resume is available. Upload a new file only if you want to replace it."
                : "Please upload your resume to continue."}
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <textarea
            value={applicationForm.coverLetter}
            onChange={(e) => setApplicationForm((prev) => ({ ...prev, coverLetter: e.target.value }))}
            rows={4}
            placeholder="Cover letter"
            className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2"
          />

          <button
            type="button"
            disabled={isSubmitting || alreadyApplied || job.isExpired}
            onClick={handleApply}
            className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {alreadyApplied
              ? "Already Applied"
              : isSubmitting
                ? "Submitting..."
                : job.isExpired
                  ? "Applications Closed"
                  : "Apply Now"}
          </button>

          <Link
            to="/applications"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ClipboardList size={16} /> Open my applications
          </Link>
        </div>
      )}
    </div>
  );
};

export default JobDetailPage;
