import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Loader2, MapPin, Sparkles } from "lucide-react";
import CompanyLogo from "../components/CompanyLogo";

const JobsListingPage = () => {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs", search, location, jobType],
    queryFn: async () => {
      const res = await axiosInstance.get("/jobs", {
        params: { search, location, jobType },
      });
      return res.data;
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Opportunities</p>
            <h1 className="mt-2 text-3xl font-bold">Find your next role on Worknet</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Search by skill, location, or work mode and keep an eye on jobs you’ve already applied for.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
            {jobs.length} matching role{jobs.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, skill, keyword"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 bg-white"
          >
            <option value="">All types</option>
            <option value="remote">Remote</option>
            <option value="on-site">On-site</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading jobs...
          </div>
        ) : jobs.length ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job._id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CompanyLogo
                      src={job.companyId?.companyLogo}
                      name={job.companyName || job.companyId?.companyName || "Company"}
                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 bg-white"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                        {job.visibilityType === "targeted" ? (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            Targeted Hiring
                          </span>
                        ) : null}
                        {job.recommendedForYou ? (
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                            Recommended for you
                          </span>
                        ) : null}
                        {job.hasApplied ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Applied
                          </span>
                        ) : null}
                        {job.isExpired ? (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            Closed
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {job.companyName || job.companyId?.companyName || "Company"} | {job.jobType}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-500">
                        <MapPin size={14} /> {job.location}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">{job.experienceRequired}</p>
                      {job.skillsRequired?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.skillsRequired.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {!job.isExpired ? (
                        <p className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-700">
                          <Sparkles size={14} /> Apply by{" "}
                          {new Date(job.lastDateToApply).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    to={`/jobs/${job._id}`}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  >
                    {job.hasApplied ? "Track Job" : "View Job"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No jobs found.</p>
        )}
      </div>
    </div>
  );
};

export default JobsListingPage;
