import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resolveResumeUrl } from "../lib/resumeUrl";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import CompanyLogo from "../components/CompanyLogo";

const statusOptions = ["applied", "reviewing", "shortlisted", "rejected", "hired"];

const RecruiterApplicantDetailPage = () => {
  const { jobId, applicationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: application, isLoading } = useQuery({
    queryKey: ["jobApplicationDetail", jobId, applicationId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/jobs/${jobId}/applicants/${applicationId}`);
      return res.data;
    },
    enabled: Boolean(jobId && applicationId),
  });

  const resumeUrl = application?.resumeUrl || application?.userId?.resume || "";
  const normalizedResumeUrl = resolveResumeUrl(resumeUrl);
  const applicantSkills = application?.userId?.skills || [];
  const applicantExperience = application?.userId?.experience || [];
  const applicantEducation = application?.userId?.education || [];
  const sortedStatusHistory = useMemo(
    () =>
      [...(application?.statusHistory || [])].sort(
        (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
      ),
    [application?.statusHistory],
  );

  const [selectedStatus, setSelectedStatus] = useState("applied");
  const [statusNote, setStatusNote] = useState("");
  const [recruiterNotes, setRecruiterNotes] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    setSelectedStatus(application?.status || "applied");
    setRecruiterNotes(application?.recruiterNotes || "");
  }, [application?.status, application?.recruiterNotes]);

  const refreshApplicationQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["jobApplicants", jobId] });
    queryClient.invalidateQueries({ queryKey: ["jobApplicationDetail", jobId, applicationId] });
    queryClient.invalidateQueries({ queryKey: ["recruiterDashboard"] });
    queryClient.invalidateQueries({ queryKey: ["recruiterJobs"] });
    queryClient.invalidateQueries({ queryKey: ["myApplications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.put(`/jobs/${jobId}/applicants/${applicationId}/status`, {
        status: selectedStatus,
        note: statusNote,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Application status updated");
      setStatusNote("");
      refreshApplicationQueries();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });

  const { mutate: saveNotes, isPending: isSavingNotes } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.put(`/jobs/${jobId}/applicants/${applicationId}/notes`, {
        recruiterNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Recruiter notes saved");
      refreshApplicationQueries();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to save notes");
    },
  });

  const { mutate: sendMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(`/jobs/${jobId}/applicants/${applicationId}/message`, {
        text: messageText,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Message sent to applicant");
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send message");
    },
  });

  return (
    <RecruiterShell title="Applicant Details" subtitle="Review full candidate profile and resume">
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading applicant...</p>
        ) : !application ? (
          <p className="text-sm text-slate-500">Applicant not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{application.fullName || application.userId?.name}</p>
              <p className="text-sm text-slate-600">{application.email || application.userId?.email}</p>
              <p className="text-sm text-slate-600">{application.phone || "Phone not provided"}</p>
              <p className="text-sm text-slate-600 mt-1">@{application.userId?.username || "candidate"}</p>
              {application.userId?.headline ? (
                <p className="text-sm text-slate-700 mt-2">{application.userId.headline}</p>
              ) : null}
              {application.job ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <CompanyLogo
                      src={application.job.companyLogo}
                      name={application.job.companyName}
                      className="h-11 w-11 rounded-xl border border-slate-200 bg-white object-cover"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{application.job.title}</p>
                      <p className="mt-1">
                        {application.job.companyName} | {application.job.location} | {application.job.jobType}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Application Pipeline</p>
                    <p className="text-xs text-slate-500">Update status and keep the hiring process organized.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                    {application.status || "applied"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 bg-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Optional note for this update"
                    className="rounded-md border border-slate-300 px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => updateStatus()}
                    disabled={isUpdatingStatus}
                    className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {isUpdatingStatus ? "Updating..." : "Update"}
                  </button>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Status Timeline</p>
                  {sortedStatusHistory.length ? (
                    <div className="space-y-3">
                      {sortedStatusHistory.map((entry, index) => (
                        <div key={`${entry.status}-${entry.changedAt}-${index}`} className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium capitalize text-slate-900">{entry.status}</p>
                            <p className="text-xs text-slate-500">
                              {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : "Unknown time"}
                            </p>
                          </div>
                          {entry.changedBy?.name ? (
                            <p className="text-xs text-slate-500 mt-1">Updated by {entry.changedBy.name}</p>
                          ) : null}
                          {entry.note ? (
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{entry.note}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No status updates yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Recruiter Actions</p>
                  <p className="text-xs text-slate-500">Store internal notes and send direct updates to the applicant.</p>
                </div>

                <textarea
                  value={recruiterNotes}
                  onChange={(e) => setRecruiterNotes(e.target.value)}
                  rows={5}
                  placeholder="Internal recruiter notes"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => saveNotes()}
                  disabled={isSavingNotes}
                  className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isSavingNotes ? "Saving..." : "Save Notes"}
                </button>

                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  placeholder="Message the applicant about interviews, next steps, or feedback"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={isSendingMessage}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSendingMessage ? "Sending..." : "Send Message"}
                </button>

                <Link
                  to="/messages"
                  className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Open Full Chat
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Applied on</p>
                <p className="text-sm text-slate-800 mt-1">
                  {application.createdAt ? new Date(application.createdAt).toLocaleString() : "Not available"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                <p className="text-sm text-slate-800 mt-1 break-all">{application.email || application.userId?.email || "Not provided"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
                <p className="text-sm text-slate-800 mt-1">{application.phone || "Not provided"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Current location</p>
                <p className="text-sm text-slate-800 mt-1">{application.currentLocation || "Not provided"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Experience</p>
                <p className="text-sm text-slate-800 mt-1">{application.yearsOfExperience || "Not provided"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Last updated</p>
                <p className="text-sm text-slate-800 mt-1">
                  {application.lastStatusUpdatedAt ? new Date(application.lastStatusUpdatedAt).toLocaleString() : "Not available"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Worknet profile URL</p>
                {application.linkedinUrl ? (
                  <a
                    href={application.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 break-all text-sm text-blue-700 hover:underline"
                  >
                    <ExternalLink size={16} /> {application.linkedinUrl}
                  </a>
                ) : (
                  <p className="text-sm text-slate-800 mt-1">Not provided</p>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Portfolio URL</p>
                {application.portfolioUrl ? (
                  <a
                    href={application.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 break-all text-sm text-blue-700 hover:underline"
                  >
                    <ExternalLink size={16} /> {application.portfolioUrl}
                  </a>
                ) : (
                  <p className="text-sm text-slate-800 mt-1">Not provided</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Cover Letter</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {application.coverLetter || "No cover letter provided."}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Skills</p>
              {applicantSkills.length ? (
                <div className="flex flex-wrap gap-2">
                  {applicantSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-700">No skills added on profile.</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Profile Experience</p>
                {applicantExperience.length ? (
                  <div className="space-y-3">
                    {applicantExperience.map((item, index) => (
                      <div key={`${item.title || "experience"}-${index}`} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-medium text-slate-900">{item.title || "Role not specified"}</p>
                        <p className="text-sm text-slate-700">{item.company || "Company not specified"}</p>
                        {item.startDate || item.endDate ? (
                          <p className="text-xs text-slate-500 mt-1">
                            {[
                              item.startDate ? new Date(item.startDate).toLocaleDateString() : "",
                              item.endDate ? new Date(item.endDate).toLocaleDateString() : "Present",
                            ]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                        ) : null}
                        {item.description ? (
                          <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{item.description}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">No experience added on profile.</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Education</p>
                {applicantEducation.length ? (
                  <div className="space-y-3">
                    {applicantEducation.map((item, index) => (
                      <div key={`${item.school || "education"}-${index}`} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-medium text-slate-900">{item.school || "School not specified"}</p>
                        {(item.fieldOfStudy || item.degree) ? (
                          <p className="text-sm text-slate-700">
                            {[item.degree, item.fieldOfStudy].filter(Boolean).join(" - ")}
                          </p>
                        ) : null}
                        {(item.startYear || item.endYear) ? (
                          <p className="text-xs text-slate-500 mt-1">
                            {[item.startYear, item.endYear || "Present"].filter(Boolean).join(" - ")}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">No education added on profile.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {application.userId?.username ? (
                <Link
                  to={`/profile/${application.userId.username}`}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  View Profile
                </Link>
              ) : null}

              {normalizedResumeUrl ? (
                <>
                  <a
                    href={normalizedResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                  >
                    <FileText size={16} /> View Resume
                  </a>
                  <a
                    href={normalizedResumeUrl}
                    download
                    className="inline-flex items-center gap-2 rounded-md border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    <Download size={16} /> Download Resume
                  </a>
                </>
              ) : (
                <p className="text-sm text-slate-500">Resume not available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </RecruiterShell>
  );
};

export default RecruiterApplicantDetailPage;
