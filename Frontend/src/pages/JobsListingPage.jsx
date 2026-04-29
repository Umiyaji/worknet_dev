import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
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

  const activeFilterCount = useMemo(
    () => [search, location, jobType].filter(Boolean).length,
    [search, location, jobType],
  );

  const resetFilters = () => {
    setSearch("");
    setLocation("");
    setJobType("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(12,74,110,0.92)_55%,_rgba(8,145,178,0.82))] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">
              Opportunities
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Find your next role on Worknet
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Search by skill, location, or work mode and keep an eye on jobs
              you&apos;ve already applied for.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">
                Matches
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {jobs.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">
                Live filters
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {activeFilterCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Smart search
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Narrow the right opportunities faster
            </h2>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!activeFilterCount}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={15} />
            Reset filters
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, skill, keyword"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <MapPin size={16} className="text-slate-400" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
          >
            <option value="">All types</option>
            <option value="remote">Remote</option>
            <option value="on-site">On-site</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeFilterCount ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Active
              </span>
              {search ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  Search: {search}
                </span>
              ) : null}
              {location ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  Location: {location}
                </span>
              ) : null}
              {jobType ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  Type: {jobType}
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No filters applied. Showing all visible opportunities.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Results
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {jobs.length} role{jobs.length === 1 ? "" : "s"} ready to explore
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Personalized badges show targeted roles, recommendations, and
            application progress.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading jobs...
          </div>
        ) : jobs.length ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="rounded-[24px] border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CompanyLogo
                      src={job.companyId?.companyLogo}
                      name={job.companyName || job.companyId?.companyName || "Company"}
                      className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-cover"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {job.title}
                        </h3>
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
                        {typeof job.matchScore === "number" ? (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Match {job.matchScore}%
                          </span>
                        ) : null}
                        {job.isExpired ? (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            Closed
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {job.companyName || job.companyId?.companyName || "Company"} |{" "}
                        {job.jobType}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-500">
                        <MapPin size={14} /> {job.location}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {job.experienceRequired}
                      </p>
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
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white hover:bg-slate-800"
                  >
                    <BriefcaseBusiness size={15} />
                    {job.hasApplied ? "Track Job" : "View Job"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <BriefcaseBusiness size={24} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">
              No jobs found for this search
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Try broadening the keywords, removing a filter, or switching work
              mode to uncover more roles.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsListingPage;
