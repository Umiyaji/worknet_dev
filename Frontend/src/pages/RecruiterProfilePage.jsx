import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, MapPin, BriefcaseBusiness, Globe, ArrowLeft, Camera, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const RecruiterProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);

  const bannerInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recruiterPublicProfile", username],
    queryFn: async () => {
      const res = await axiosInstance.get(`/recruiter/company/${username}`);
      return res.data;
    },
    enabled: Boolean(username),
  });

  const recruiter = data?.recruiter;
  const isOwnRecruiterProfile = authUser?._id === recruiter?._id;

  const [aboutDraft, setAboutDraft] = useState("");
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  useEffect(() => {
    if (!recruiter) return;
    setAboutDraft(recruiter.aboutCompany || "");
  }, [recruiter?.aboutCompany, recruiter]);

  const { mutateAsync: updateCompanyProfile, isPending: isSavingProfile } = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.put("/recruiter/company-profile", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["recruiterPublicProfile", username] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  const handleBannerChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      await updateCompanyProfile({ companyBanner: dataUrl, removeCompanyBanner: false });
      toast.success("Banner updated");
    } catch {
      // handled by mutation onError
    } finally {
      event.target.value = "";
    }
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      await updateCompanyProfile({ companyLogo: dataUrl, removeCompanyLogo: false });
      toast.success("Logo updated");
    } catch {
      // handled by mutation onError
    } finally {
      event.target.value = "";
    }
  };

  const handleDeleteBanner = async () => {
    try {
      await updateCompanyProfile({ removeCompanyBanner: true });
      toast.success("Banner removed");
    } catch {
      // handled by mutation onError
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await updateCompanyProfile({ removeCompanyLogo: true });
      toast.success("Logo removed");
    } catch {
      // handled by mutation onError
    }
  };

  const handleSaveAbout = async () => {
    try {
      await updateCompanyProfile({ aboutCompany: aboutDraft });
      toast.success("About updated");
      setIsEditingAbout(false);
    } catch {
      // handled by mutation onError
    }
  };

  if (isLoading) {
    return <div className="text-center text-slate-500 py-10">Loading recruiter profile...</div>;
  }

  if (isError || !recruiter) {
    return <div className="text-center text-slate-500 py-10">Recruiter profile not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="relative h-48 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-cover bg-center"
          style={{
            backgroundImage: recruiter.companyBanner
              ? `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url('${recruiter.companyBanner}')`
              : undefined,
          }}
        >
          {isOwnRecruiterProfile && (
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={() => bannerInputRef.current?.click()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow hover:bg-slate-100 disabled:opacity-60"
                title="Upload banner"
              >
                <Camera size={18} />
              </button>
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={handleDeleteBanner}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-600 shadow hover:bg-red-50 disabled:opacity-60"
                title="Delete banner"
              >
                <Trash2 size={18} />
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={recruiter.companyLogo || recruiter.profilePicture || "/avatar.png"}
                  alt={recruiter.companyName || recruiter.name}
                  className="h-20 w-20 rounded-xl object-cover border-4 border-white -mt-12 bg-white shadow-md"
                />
                {isOwnRecruiterProfile && (
                  <div className="absolute -right-2 -bottom-2 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-800 shadow hover:bg-slate-100 disabled:opacity-60"
                      title="Upload logo"
                    >
                      <Camera size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={handleDeleteLogo}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-600 shadow hover:bg-red-50 disabled:opacity-60"
                      title="Delete logo"
                    >
                      <Trash2 size={16} />
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{recruiter.companyName || recruiter.name}</h1>
                <p className="text-slate-600">{recruiter.industry || "Recruiting"}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  {recruiter.companyLocation ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} /> {recruiter.companyLocation}
                    </span>
                  ) : null}
                  {recruiter.companyWebsite ? (
                    <a
                      href={recruiter.companyWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800"
                    >
                      <Globe size={14} /> Website
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {isOwnRecruiterProfile ? (
              <Link
                to="/recruiter/jobs/new"
                className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 inline-flex items-center gap-2"
              >
                <BriefcaseBusiness size={16} /> Post Job
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Openings</p>
          <p className="text-3xl font-bold text-slate-900">{data.totalOpenings}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Company Size</p>
          <p className="text-lg font-semibold text-slate-900">{recruiter.companySize || "Not specified"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Hiring Contact</p>
          <p className="text-lg font-semibold text-slate-900">{recruiter.HRName || recruiter.name}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">About</h3>
          {isOwnRecruiterProfile && !isEditingAbout ? (
            <button
              type="button"
              onClick={() => setIsEditingAbout(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          ) : null}
        </div>

        {isOwnRecruiterProfile && isEditingAbout ? (
          <div className="space-y-3">
            <textarea
              value={aboutDraft}
              onChange={(e) => setAboutDraft(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={handleSaveAbout}
                className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingAbout(false);
                  setAboutDraft(recruiter.aboutCompany || "");
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setAboutDraft("")}
                className="rounded-md border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-700 whitespace-pre-wrap">
            {recruiter.aboutCompany || "No company description added yet."}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Open Job Listings</h3>
        {data.openJobs?.length ? (
          <div className="space-y-3">
            {data.openJobs.map((job) => (
              <div key={job._id} className="rounded-lg border border-slate-200 p-4 flex justify-between gap-2">
                <div className="flex items-start gap-3">
                  <img
                    src={recruiter.companyLogo || recruiter.profilePicture || "/avatar.png"}
                    alt={recruiter.companyName || recruiter.name}
                    className="h-10 w-10 rounded-lg object-cover border border-slate-200 bg-white"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{job.title}</p>
                    <p className="text-sm text-slate-600">
                      {job.location} | {job.jobType} | {job.experienceRequired}
                    </p>
                  </div>
                </div>
                <Link to={`/jobs/${job._id}`} className="text-sm text-blue-700 hover:text-blue-800">
                  View Job
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No active job openings right now.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500 inline-flex items-center gap-1">
          <Building2 size={14} /> Corporate recruiter profile
        </p>
      </div>
    </div>
  );
};

export default RecruiterProfilePage;
