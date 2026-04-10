import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { resolveResumeUrl } from "../lib/resumeUrl";
import { toast } from "react-hot-toast";
import {
  Camera,
  Clock,
  Download,
  Loader2,
  MapPin,
  FileText,
  UserCheck,
  UserPlus,
  X,
  Trash2,
  Edit2,
  FileUp,
} from "lucide-react";

const ProfileHeader = ({ userData, onSave, isOwnProfile }) => {
  const [editingField, setEditingField] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const authUser = queryClient.getQueryData(["authUser"]);

  const refreshConnectionData = () => {
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
    queryClient.invalidateQueries({ queryKey: ["connections"] });
    queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
    queryClient.invalidateQueries({ queryKey: ["recommendedUsers"] });
    queryClient.invalidateQueries({ queryKey: ["connectionStatus", userData._id] });
    queryClient.invalidateQueries({ queryKey: ["userProfile", userData.username] });
    if (authUser?.username) {
      queryClient.invalidateQueries({ queryKey: ["userProfile", authUser.username] });
    }
  };

  // Connection Status Query
  const { data: connectionStatus, refetch: refetchConnectionStatus } = useQuery(
    {
      queryKey: ["connectionStatus", userData._id],
      queryFn: () => axiosInstance.get(`/connections/status/${userData._id}`),
      enabled: !isOwnProfile,
    },
  );

  const isConnected = userData.connections.some((connection) => {
    if (!connection) return false;
    return (connection._id || connection).toString() === authUser?._id?.toString();
  });

  // Connection Mutations
  const { mutate: sendConnectionRequest } = useMutation({
    mutationFn: (userId) =>
      axiosInstance.post(`/connections/request/${userId}`),
    onSuccess: () => {
      toast.success("Connection request sent");
      refetchConnectionStatus();
      refreshConnectionData();
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "An error occurred"),
  });

  const { mutate: acceptRequest } = useMutation({
    mutationFn: (requestId) =>
      axiosInstance.put(`/connections/accept/${requestId}`),
    onSuccess: () => {
      toast.success("Connection request accepted");
      refetchConnectionStatus();
      refreshConnectionData();
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "An error occurred"),
  });

  const { mutate: rejectRequest } = useMutation({
    mutationFn: (requestId) =>
      axiosInstance.put(`/connections/reject/${requestId}`),
    onSuccess: () => {
      toast.success("Connection request rejected");
      refetchConnectionStatus();
      refreshConnectionData();
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "An error occurred"),
  });

  const { mutate: removeConnection } = useMutation({
    mutationFn: (userId) => axiosInstance.delete(`/connections/${userId}`),
    onSuccess: () => {
      toast.success("Connection removed");
      refetchConnectionStatus();
      refreshConnectionData();
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "An error occurred"),
  });

  // Delete profile picture mutation
  const { mutate: deleteProfilePicture, isLoading: deletingProfile } =
    useMutation({
      mutationFn: async () => {
        const res = await axiosInstance.delete("/users/profile-picture");
        return res.data;
      },
      onSuccess: () => {
        toast.success("Profile picture removed");
        setEditedData((prev) => ({ ...prev, profilePicture: null }));
        queryClient.invalidateQueries(["authUser"]);
        queryClient.invalidateQueries(["user", userData._id]);
      },
      onError: (error) =>
        toast.error(
          error.response?.data?.message || "Failed to delete profile picture",
        ),
    });

  // Delete banner image mutation
  const { mutate: deleteBannerImage, isLoading: deletingBanner } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.delete("/users/banner-image");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Banner image removed");
      setEditedData((prev) => ({ ...prev, bannerImg: null }));
      queryClient.invalidateQueries(["authUser"]);
      queryClient.invalidateQueries(["user", userData._id]);
    },
    onError: (error) =>
      toast.error(
        error.response?.data?.message || "Failed to delete banner image",
      ),
  });

  const { mutate: uploadResume, isLoading: isUploadingResume } = useMutation({
    mutationFn: async (file) => {
      setResumeUploadProgress(0);
      const formData = new FormData();
      formData.append("resume", file);

      const res = await axiosInstance.post(
        "/users/resume",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;

            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setResumeUploadProgress(percent);
          },
        },
      );

      return res.data;
    },
    onSuccess: (updatedUser) => {
      setResumeUploadProgress(100);
      setEditedData((prev) => ({ ...prev, resume: updatedUser.resume }));
      queryClient.setQueryData(["authUser"], (prev) => ({
        ...prev,
        ...updatedUser,
      }));
      queryClient.invalidateQueries(["authUser"]);
      queryClient.invalidateQueries(["userProfile", updatedUser.username]);
      if (updatedUser?.resumeExtractionApplied) {
        toast.success("Resume uploaded and profile auto-filled with AI");
      } else {
        toast.success("Resume uploaded successfully");
      }
    },
    onError: (error) => {
      setResumeUploadProgress(0);
      toast.error(error.response?.data?.message || "Failed to upload resume");
    },
    onSettled: () => {
      setTimeout(() => setResumeUploadProgress(0), 600);
    },
  });

  const { mutate: removeResume, isLoading: isDeletingResume } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.delete("/users/resume");
      return res.data;
    },
    onSuccess: (updatedUser) => {
      setEditedData((prev) => ({ ...prev, resume: "" }));
      queryClient.setQueryData(["authUser"], (prev) => ({
        ...prev,
        ...updatedUser,
      }));
      queryClient.invalidateQueries(["authUser"]);
      queryClient.invalidateQueries(["userProfile", updatedUser.username]);
      toast.success("Resume deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete resume");
    },
  });

  // Connection status helper
  const getConnectionStatus = useMemo(() => {
    if (connectionStatus?.data?.status) {
      return connectionStatus.data.status;
    }
    if (isConnected) return "connected";
    return "not_connected";
  }, [isConnected, connectionStatus]);

  const renderConnectionButton = () => {
    const baseClass =
      "text-white py-2 px-4 rounded-full transition duration-300 flex items-center justify-center";
    switch (getConnectionStatus) {
      case "connected":
        return (
          <div className="flex gap-2 justify-center">
            <div className={`${baseClass} bg-green-500 hover:bg-green-600`}>
              <UserCheck size={20} className="mr-2" />
              Connected
            </div>
            <button
              className={`${baseClass} bg-red-500 hover:bg-red-600 text-sm cursor-pointer`}
              onClick={() => removeConnection(userData._id)}
            >
              <X size={20} className="mr-2" />
              Remove Connection
            </button>
          </div>
        );
      case "pending":
        return (
          <button className={`${baseClass} bg-yellow-500 hover:bg-yellow-600`}>
            <Clock size={20} className="mr-2" />
            Pending
          </button>
        );
      case "received":
        return (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => acceptRequest(connectionStatus.data.requestId)}
              className={`${baseClass} bg-green-500 hover:bg-green-600 cursor-pointer`}
            >
              Accept
            </button>
            <button
              onClick={() => rejectRequest(connectionStatus.data.requestId)}
              className={`${baseClass} bg-red-500 hover:bg-red-600 cursor-pointer`}
            >
              Reject
            </button>
          </div>
        );
      default:
        return (
          <button
            onClick={() => sendConnectionRequest(userData._id)}
            className="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-full transition duration-300 flex items-center justify-center cursor-pointer"
          >
            <UserPlus size={20} className="mr-2" />
            Connect
          </button>
        );
    }
  };

  // Handle image uploads
  const handleImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setEditedData((prev) => ({
        ...prev,
        [event.target.name]: reader.result,
      }));
    };

    reader.onerror = () => {
      toast.error("Failed to load image");
    };

    reader.readAsDataURL(file);
  };

  // Handle resume file upload
  const handleResumeChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const isAllowedFile =
      allowedMimeTypes.includes(file.type) ||
      /\.(pdf|doc|docx|jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isAllowedFile) {
      toast.error("Please upload a PDF, DOC, DOCX, JPG, PNG, or WEBP file");
      event.target.value = "";
      return;
    }

    uploadResume(file);
    event.target.value = "";
  };

  const handleFieldSave = (field, value) => {
    const dataToSave = { [field]: value };
    setEditedData((prev) => ({ ...prev, [field]: value }));
    onSave(dataToSave);
    setEditingField(null);
    toast.success(
      `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`,
    );
  };

  const EditableField = ({
    label,
    value,
    field,
    icon: Icon,
    onSave,
    containerClassName = "",
    valueClassName = "",
    showLabel = false,
  }) => {
    const [tempValue, setTempValue] = useState(value);
    const isEditing = editingField === field;

    return (
      <div
        className={`flex items-start justify-between gap-3 group ${containerClassName}`}
      >
        <div className="flex items-start flex-1 min-w-0">
          {Icon && <Icon size={18} className="text-gray-500 mr-2 mt-0.5" />}
          {isEditing ? (
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="flex-1 px-2 py-1 border border-primary rounded"
                autoFocus
              />
              <button
                onClick={() => onSave(tempValue)}
                className="bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setEditingField(null)}
                className="bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="min-w-0">
              {showLabel && (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1">
                  {label}
                </p>
              )}
              <span className={`block text-gray-700 ${valueClassName}`}>
                {value || `Add ${label.toLowerCase()}`}
              </span>
            </div>
          )}
        </div>
        {isOwnProfile && !isEditing && (
          <button
            onClick={() => setEditingField(field)}
            className="hidden group-hover:flex bg-primary text-white p-1 rounded hover:bg-primary-dark ml-2 transition"
            title={`Edit ${label}`}
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>
    );
  };

  const displayName = editedData.name ?? userData.name;
  const displayHeadline = editedData.headline ?? userData.headline;
  const displayCompany = editedData.currentCompany ?? userData.currentCompany;
  const displayLocation = editedData.location ?? userData.location;
  const displayCollege = editedData.college ?? userData.college;
  const displayCity = editedData.city ?? userData.city;
  const displayResume = editedData.resume ?? userData.resume;
  const resolvedResumeUrl = resolveResumeUrl(displayResume);
  const hasResume = Boolean(displayResume);

  return (
    <div className="bg-white shadow rounded-lg mb-6">
      {/* Banner */}
      <div
        className="relative h-48 rounded-t-lg bg-cover bg-center"
        style={{
          backgroundImage: `url('${editedData.bannerImg || userData.bannerImg || "/banner.png"}')`,
        }}
      >
        {isOwnProfile && (
          <div className="absolute top-2 right-2 flex gap-2">
            {/* Upload Banner */}
            <label className="bg-white p-2 rounded-full shadow hover:bg-gray-200 cursor-pointer transition">
              <Camera size={20} />
              <input
                type="file"
                className="hidden"
                name="bannerImg"
                onChange={handleImageChange}
                accept="image/*"
              />
            </label>

            {/* Delete Banner */}
            {(userData.bannerImg || editedData.bannerImg) && (
              <button
                onClick={() => deleteBannerImage()}
                disabled={deletingBanner}
                className="bg-white p-2 rounded-full shadow cursor-pointer hover:bg-red-100 transition"
              >
                <Trash2 size={20} className="text-red-600" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile Picture */}
      <div className="p-4">
        <div className="relative -mt-20 mb-4 flex justify-center">
          <img
            className="w-32 h-32 rounded-full object-cover"
            src={
              editedData.profilePicture ||
              userData.profilePicture ||
              "/avatar.png"
            }
            alt={userData.name}
          />
          {isOwnProfile && (
            <>
              {/* Upload */}
              <label className="absolute bottom-0 right-[calc(50%-4rem)] bg-white p-2 rounded-full shadow hover:bg-gray-200 cursor-pointer transition">
                <Camera size={20} />
                <input
                  type="file"
                  className="hidden"
                  name="profilePicture"
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </label>
              {/* Delete */}
              {(userData.profilePicture || editedData.profilePicture) && (
                <button
                  onClick={() => deleteProfilePicture()}
                  disabled={deletingProfile}
                  className="absolute bottom-0 left-[calc(50%-4rem)] bg-white p-2 rounded-full shadow cursor-pointer hover:bg-red-100 transition"
                >
                  <Trash2 size={20} className="text-red-600" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Editable Fields */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 text-center">
              {displayName}
            </h1>
            {isOwnProfile && editingField !== "name" && (
              <button
                onClick={() => setEditingField("name")}
                className="bg-primary text-white p-2 rounded-full hover:bg-primary-dark transition"
                title="Edit Name"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>

          {editingField === "name" && (
            <div className="max-w-xl mx-auto mt-4">
              <EditableField
                label="Name"
                value={displayName}
                field="name"
                onSave={(value) => handleFieldSave("name", value)}
                containerClassName="bg-white"
              />
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50 p-4">
              <EditableField
                label="Professional Headline"
                value={displayHeadline}
                field="headline"
                onSave={(value) => handleFieldSave("headline", value)}
                showLabel
                valueClassName="text-lg font-semibold text-gray-900"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <EditableField
                label="Current Company"
                value={displayCompany}
                field="currentCompany"
                onSave={(value) => handleFieldSave("currentCompany", value)}
                showLabel
                valueClassName="font-medium text-gray-900"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <EditableField
                label="Location"
                value={displayLocation}
                field="location"
                icon={MapPin}
                onSave={(value) => handleFieldSave("location", value)}
                showLabel
                valueClassName="font-medium text-gray-900"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <EditableField
                label="College"
                value={displayCollege}
                field="college"
                onSave={(value) => handleFieldSave("college", value)}
                showLabel
                valueClassName="font-medium text-gray-900"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <EditableField
                label="City"
                value={displayCity}
                field="city"
                onSave={(value) => handleFieldSave("city", value)}
                showLabel
                valueClassName="font-medium text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Resume Section */}
        {isOwnProfile && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start">
                <FileUp size={18} className="text-gray-600 mr-2 mt-0.5" />
                <div className="text-left">
                  <p className="font-semibold text-gray-700">Resume</p>
                  <p className="text-sm text-gray-500">
                    {hasResume
                      ? "Your resume is uploaded. You can view, update, or delete it."
                      : "Upload your resume to make it available in the resume section."}
                  </p>
                  <p className="text-sm text-gray-500">
                    Resume upload can auto-extract relevant details like Education, Experience, and Skills.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {hasResume && (
                  <a
                    href={resolvedResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100"
                  >
                    <Download size={16} />
                    View Resume
                  </a>
                )}

                <label
                  className={`flex items-center gap-1 rounded px-3 py-2 text-white transition ${
                    isUploadingResume
                      ? "cursor-not-allowed bg-blue-400"
                      : "cursor-pointer bg-primary hover:bg-primary-dark"
                  }`}
                >
                  {isUploadingResume ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileUp size={16} />
                  )}
                  {hasResume ? "Update Resume" : "Upload Resume"}
                  <input
                    type="file"
                    className="hidden"
                    name="resume"
                    onChange={handleResumeChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    disabled={isUploadingResume}
                  />
                </label>

                {hasResume && (
                  <button
                    onClick={() => removeResume()}
                    disabled={isDeletingResume || isUploadingResume}
                    className="flex items-center gap-1 rounded border border-red-200 bg-white px-3 py-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingResume ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Delete Resume
                  </button>
                )}
              </div>
            </div>

            {isUploadingResume && (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                  <span>Uploading resume...</span>
                  <span>{resumeUploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${resumeUploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!isOwnProfile && hasResume && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start">
                <FileText size={18} className="text-gray-600 mr-2 mt-0.5" />
                <div className="text-left">
                  <p className="font-semibold text-gray-700">Resume</p>
                  <p className="text-sm text-gray-500">
                    {userData.name}'s resume is available to view and download.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/resume/${userData.username}`}
                  className="flex items-center gap-1 rounded bg-primary px-3 py-2 text-white transition hover:bg-primary-dark"
                >
                  <FileText size={16} />
                  View Resume
                </Link>

                <a
                  href={resolvedResumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100"
                >
                  <Download size={16} />
                  Open
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isOwnProfile ? (
          <div></div>
        ) : (
          <div className="flex justify-center">{renderConnectionButton()}</div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
