import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { BriefcaseBusiness, Clock3, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import CompanyLogo from "../components/CompanyLogo";

const statusTheme = {
  applied: "bg-slate-100 text-slate-700 border-slate-200",
  reviewing: "bg-amber-50 text-amber-700 border-amber-200",
  shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  hired: "bg-blue-50 text-blue-700 border-blue-200",
};

const MyApplicationsPage = () => {
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["myApplications"],
    queryFn: async () => {
      const res = await axiosInstance.get("/jobs/my-applications");
      return res.data;
    },
  });

  const stats = applications.reduce(
    (acc, application) => {
      acc.total += 1;
      acc[application.status] = (acc[application.status] || 0) + 1;
      return acc;
    },
    { total: 0, applied: 0, reviewing: 0, shortlisted: 0, hired: 0 },
  );

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading your applications...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Application Hub</p>
            <h1 className="mt-2 text-3xl font-bold">Track every role you've applied for</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Follow recruiter updates, revisit job details, and keep your job search organized in one place.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Explore More Jobs
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total applications</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Applied</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.applied}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Reviewing</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{stats.reviewing}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Shortlisted</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.shortlisted}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Hired</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{stats.hired}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Your pipeline</h2>
            <p className="text-sm text-slate-500">Latest status for each job application</p>
          </div>
        </div>

        {applications.length ? (
          <div className="space-y-4">
            {applications.map((application) => {
              const job = application.jobId;
              const company = job?.companyId;
              const latestHistory = [...(application.statusHistory || [])].sort(
                (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
              )[0];

              return (
                <article key={application._id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <CompanyLogo
                        src={company?.companyLogo}
                        name={company?.companyName || job?.companyName || "Company"}
                        className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover"
                      />
                      <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-900">{job?.title || "Job removed"}</h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusTheme[application.status] || statusTheme.applied}`}
                        >
                          {application.status}
                        </span>
                        {!application.isJobActive ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                            Hiring window closed
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <BriefcaseBusiness size={16} /> {company?.companyName || job?.companyName || "Company"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <MapPin size={16} /> {job?.location || "Location not available"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Clock3 size={16} /> Applied {new Date(application.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {latestHistory?.note ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Sparkles size={16} /> Latest update
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{latestHistory.note}</p>
                        </div>
                      ) : null}
                    </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {job?._id ? (
                        <Link
                          to={`/jobs/${job._id}`}
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View Job
                        </Link>
                      ) : null}
                      {company?.username ? (
                        <Link
                          to={`/company/${company.username}`}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          View Company
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No applications yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Once you apply for jobs, your statuses and recruiter updates will appear here.
            </p>
            <Link
              to="/jobs"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Start applying
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default MyApplicationsPage;
