import { useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CompanyLogo from "../components/CompanyLogo";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "applied", label: "Applied" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

const RecruiterApplicantsPage = () => {
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);
  const { jobId } = useParams();
  const [selectedJobId, setSelectedJobId] = useState(jobId || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: jobs = [] } = useQuery({
    queryKey: ["recruiterJobs"],
    queryFn: async () => {
      const res = await axiosInstance.get("/jobs/my-jobs");
      return res.data;
    },
  });

  const effectiveJobId = selectedJobId || jobs[0]?._id || "";

  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["jobApplicants", effectiveJobId, statusFilter, search],
    queryFn: async () => {
      const res = await axiosInstance.get(`/jobs/${effectiveJobId}/applicants`, {
        params: { status: statusFilter, search },
      });
      return res.data;
    },
    enabled: Boolean(effectiveJobId),
  });

  const selectedJob = useMemo(
    () => jobs.find((jobItem) => jobItem._id === effectiveJobId),
    [jobs, effectiveJobId],
  );
  const statusCounts = useMemo(
    () =>
      applicants.reduce((acc, application) => {
        const key = application.status || "applied";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    [applicants],
  );

  return (
    <RecruiterShell title="Applicants" subtitle="Review candidates who applied to your jobs">
      <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-slate-600">Select Job</label>
            <select
              value={effectiveJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
            >
              {jobs.map((jobItem) => (
                <option key={jobItem._id} value={jobItem._id}>
                  {jobItem.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
            >
              {statusOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Search Applicant</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOptions
            .filter((option) => option.value)
            .map((option) => (
              <div key={option.value} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {option.label}: {statusCounts[option.value] || 0}
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          {selectedJob ? `Applicants for ${selectedJob.title}` : "Applicants"}
        </h3>

        {selectedJob ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <CompanyLogo
              src={authUser?.companyLogo}
              name={selectedJob.companyName || authUser?.companyName || "Company"}
              className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-cover"
            />
            <div>
              <p className="font-medium text-slate-900">{selectedJob.companyName || authUser?.companyName || "Company"}</p>
              <p className="text-sm text-slate-500">{selectedJob.location} | {selectedJob.jobType}</p>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading applicants...</p>
        ) : applicants.length ? (
          <div className="space-y-3">
            {applicants.map((application) => (
              <div
                key={application._id}
                className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{application.fullName || application.userId?.name}</p>
                  <p className="text-sm text-slate-600 truncate">{application.email || application.userId?.email}</p>
                  <p className="text-xs text-slate-500 truncate">
                    Status: <span className="capitalize">{application.status || "applied"}</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    Applied on {new Date(application.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <Link
                  to={`/recruiter/jobs/${effectiveJobId}/applicants/${application._id}`}
                  className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No applicants yet.</p>
        )}
      </div>
    </RecruiterShell>
  );
};

export default RecruiterApplicantsPage;
