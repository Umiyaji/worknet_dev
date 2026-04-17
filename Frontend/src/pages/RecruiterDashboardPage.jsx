import { useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import CompanyLogo from "../components/CompanyLogo";
import SmartImage from "../components/SmartImage";

const recruiterStatuses = ["applied", "reviewing", "shortlisted", "rejected", "hired"];

const RecruiterDashboardPage = () => {
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recruiterDashboard"],
    queryFn: async () => {
      const res = await axiosInstance.get("/recruiter/dashboard");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-700" />
      </div>
    );
  }

  if (isError) {
    return (
      <RecruiterShell title="Recruiter Dashboard" subtitle="Overview of your hiring pipeline">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to load recruiter dashboard.
        </div>
      </RecruiterShell>
    );
  }

  return (
    <RecruiterShell title="Recruiter Dashboard" subtitle="Track jobs, applicants, and hiring activity">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Jobs Posted</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{data.totalJobsPosted}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Active Jobs</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{data.activeJobs}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Applicants</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{data.totalApplicants}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Automated Job Posting</h3>
            <p className="text-sm text-slate-500">Excel-like row pipeline for draft, scheduled, and posted jobs</p>
          </div>
          <Link
            to="/recruiter/automated-jobs"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Open automation table
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total Rows</p>
            <p className="text-xl font-semibold text-slate-900">{data.automatedJobRows?.total || 0}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Scheduled</p>
            <p className="text-xl font-semibold text-amber-800">{data.automatedJobRows?.scheduled || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
            <p className="text-xs text-slate-600">Draft</p>
            <p className="text-xl font-semibold text-slate-800">{data.automatedJobRows?.draft || 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Posted</p>
            <p className="text-xl font-semibold text-emerald-800">{data.automatedJobRows?.posted || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recent Job Posts</h3>
              <p className="text-sm text-slate-500">Quick access to your latest openings</p>
            </div>
            <Link to="/recruiter/jobs" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              View all jobs
            </Link>
          </div>

          {data.recentJobs?.length ? (
            <div className="space-y-2">
              {data.recentJobs.map((job) => (
                <Link
                  key={job._id}
                  to={`/recruiter/jobs/${job._id}/applicants`}
                  className="block rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CompanyLogo
                        src={authUser?.companyLogo}
                        name={authUser?.companyName || "Company"}
                        className="h-9 w-9 rounded-lg object-cover border border-slate-200 bg-white"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{job.title}</p>
                        <p className="text-sm text-slate-500">
                          {job.location} | {job.jobType}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Apply by {new Date(job.lastDateToApply).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No jobs posted yet.</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Pipeline Breakdown</h3>
          <p className="text-sm text-slate-500">Live status distribution across your applicants</p>
          <div className="mt-4 space-y-3">
            {recruiterStatuses.map((status) => (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-700">{status}</span>
                  <span className="font-medium text-slate-900">{data.statusBreakdown?.[status] || 0}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{
                      width: `${data.totalApplicants ? ((data.statusBreakdown?.[status] || 0) / data.totalApplicants) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Applications</h3>
            <p className="text-sm text-slate-500">Newest candidates entering your hiring pipeline</p>
          </div>
          <Link to="/recruiter/applicants" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Open applicant manager
          </Link>
        </div>

        {data.recentApplications?.length ? (
          <div className="space-y-3">
            {data.recentApplications.map((application) => (
              <Link
                key={application._id}
                to={`/recruiter/jobs/${application.jobId?._id}/applicants/${application._id}`}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <SmartImage
                    src={application.userId?.profilePicture || "/avatar.png"}
                    alt={application.userId?.name || application.fullName || "Applicant"}
                    className="h-11 w-11 rounded-xl object-cover border border-slate-200 bg-white"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{application.fullName || application.userId?.name}</p>
                    <p className="text-sm text-slate-500">
                      {application.jobId?.title || "Job"} | {application.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 capitalize text-slate-700">
                    {application.status}
                  </span>
                  <span className="text-slate-500">{new Date(application.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No applications received yet.</p>
        )}
      </div>
    </RecruiterShell>
  );
};

export default RecruiterDashboardPage;
