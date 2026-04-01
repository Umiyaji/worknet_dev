import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import RecruiterShell from "../components/recruiter/RecruiterShell";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import CompanyLogo from "../components/CompanyLogo";

const RecruiterJobsPage = () => {
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["recruiterJobs"],
    queryFn: async () => {
      const res = await axiosInstance.get("/jobs/my-jobs");
      return res.data;
    },
  });

  const { mutate: deleteJob, isPending: isDeletingJob } = useMutation({
    mutationFn: async (jobId) => {
      const res = await axiosInstance.delete(`/jobs/${jobId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Job deleted");
      queryClient.invalidateQueries({ queryKey: ["recruiterJobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruiterDashboard"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete job");
    },
  });

  return (
    <RecruiterShell title="My Jobs" subtitle="Manage all jobs posted by your company">
      <div className="flex justify-end">
        <Link
          to="/recruiter/jobs/new"
          className="rounded-md bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
        >
          Post Job
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading jobs...</p>
        ) : jobs.length ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job._id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <CompanyLogo
                      src={authUser?.companyLogo}
                      name={authUser?.companyName || "Company"}
                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 bg-white"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{job.title}</p>
                        {job.isExpired ? (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            Closed
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {job.location} | {job.jobType} | {job.experienceRequired}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Apply by {new Date(job.lastDateToApply).toLocaleDateString()}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          {job.totalApplicants || 0} applicants
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          Reviewing {job.statusBreakdown?.reviewing || 0}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          Shortlisted {job.statusBreakdown?.shortlisted || 0}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                          Hired {job.statusBreakdown?.hired || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/jobs/${job._id}`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                    <Link
                      to={`/recruiter/jobs/${job._id}/edit`}
                      className="rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/recruiter/jobs/${job._id}/applicants`}
                      className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                    >
                      Applicants
                    </Link>
                    <button
                      type="button"
                      disabled={isDeletingJob}
                      onClick={() => deleteJob(job._id)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No jobs posted yet.</p>
        )}
      </div>
    </RecruiterShell>
  );
};

export default RecruiterJobsPage;
