import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { cropImageToDataUrl } from "../lib/cropImage";
import { resolveImageUrl } from "../lib/imageUrl";
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
import SmartImage from "./SmartImage";

const CROPPER_SIZE = 320;

const ProfileHeader = ({ userData, onSave, isOwnProfile }) => {
  const [editingField, setEditingField] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0);
  const [cropModal, setCropModal] = useState({
    open: false,
    source: "",
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    imageWidth: 0,
    imageHeight: 0,
  });
  const [isSavingCroppedPhoto, setIsSavingCroppedPhoto] = useState(false);
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
  const { data: mutualConnections } = useQuery({
    queryKey: ["mutualConnections", userData._id],
    queryFn: () => axiosInstance.get(`/connections/mutual/${userData._id}`),
    enabled: !isOwnProfile && Boolean(userData?._id),
  });

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
    const fieldName = event.target.name;

    if (!file) {
      return;
    }

    if (fieldName !== "profilePicture") {
      const reader = new FileReader();

      reader.onloadend = () => {
        setEditedData((prev) => ({
          ...prev,
          [fieldName]: reader.result,
        }));
      };

      reader.onerror = () => {
        toast.error("Failed to load image");
      };

      reader.readAsDataURL(file);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const source = reader.result;
        const image = new Image();

        image.onload = () => {
          setCropModal({
            open: true,
            source,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            imageWidth: image.naturalWidth || image.width || 0,
            imageHeight: image.naturalHeight || image.height || 0,
          });
        };

        image.onerror = () => {
          toast.error("Failed to prepare image for cropping");
        };

        image.src = source;
      } catch {
        toast.error("Failed to prepare image for cropping");
      }
    };

    reader.onerror = () => {
      toast.error("Failed to load image");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const closeCropModal = (force = false) => {
    if (isSavingCroppedPhoto && !force) {
      return;
    }

    setCropModal({
      open: false,
      source: "",
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      imageWidth: 0,
      imageHeight: 0,
    });
  };

  const handleCropSave = async () => {
    if (!cropModal.source) {
      return;
    }

    try {
      setIsSavingCroppedPhoto(true);
      const croppedImage = await cropImageToDataUrl({
        src: cropModal.source,
        zoom: cropModal.zoom,
        offsetX: cropModal.offsetX,
        offsetY: cropModal.offsetY,
      });

      setEditedData((prev) => ({
        ...prev,
        profilePicture: croppedImage,
      }));
      onSave({ profilePicture: croppedImage });
      closeCropModal(true);
    } catch {
      toast.error("Failed to crop image");
    } finally {
      setIsSavingCroppedPhoto(false);
    }
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
  const cropBaseScale =
    cropModal.imageWidth && cropModal.imageHeight
      ? Math.max(
          CROPPER_SIZE / cropModal.imageWidth,
          CROPPER_SIZE / cropModal.imageHeight,
        )
      : 1;
  const cropPreviewWidth = cropModal.imageWidth * cropBaseScale * cropModal.zoom;
  const cropPreviewHeight = cropModal.imageHeight * cropBaseScale * cropModal.zoom;

  return (
    <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      {/* Banner */}
      <div
        className="relative h-32 bg-cover bg-center sm:h-40 md:h-48"
        style={{
          backgroundImage: `url('${resolveImageUrl(editedData.bannerImg || userData.bannerImg || "/banner.png")}')`,
        }}
      >
        {isOwnProfile && (
          <div className="absolute right-3 top-3 flex gap-2">
            {/* Upload Banner */}
            <label className="cursor-pointer rounded-full bg-white p-2 shadow transition hover:bg-gray-200">
              <Camera size={18} />
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
                className="cursor-pointer rounded-full bg-white p-2 shadow transition hover:bg-red-100"
              >
                <Trash2 size={18} className="text-red-600" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile Picture */}
      <div className="p-4 sm:p-5">
        <div className="relative -mt-14 mb-4 flex justify-center sm:-mt-16 md:-mt-20">
          <SmartImage
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg sm:h-28 sm:w-28 md:h-32 md:w-32"
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
              <label className="absolute bottom-0 right-[calc(50%-3.35rem)] cursor-pointer rounded-full bg-white p-2 shadow transition hover:bg-gray-200 sm:right-[calc(50%-3.8rem)] md:right-[calc(50%-4rem)]">
                <Camera size={18} />
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
                  className="absolute bottom-0 left-[calc(50%-3.35rem)] rounded-full bg-white p-2 shadow transition hover:bg-red-100 sm:left-[calc(50%-3.8rem)] md:left-[calc(50%-4rem)]"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Editable Fields */}
        <div className="mb-6">
          <div className="flex flex-col items-center justify-center gap-2 text-center sm:gap-3">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {displayName}
            </h1>
            {isOwnProfile && editingField !== "name" && (
              <button
                onClick={() => setEditingField("name")}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm text-white transition hover:bg-primary-dark"
                title="Edit Name"
              >
                <Edit2 size={16} />
                Edit
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

          <div className="mt-6 grid gap-3 md:grid-cols-2 md:gap-4">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50 p-4 md:col-span-2">
              <EditableField
                label="Professional Headline"
                value={displayHeadline}
                field="headline"
                onSave={(value) => handleFieldSave("headline", value)}
                showLabel
                valueClassName="text-base font-semibold text-gray-900 sm:text-lg"
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
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-start">
                <FileUp size={18} className="mr-2 mt-0.5 text-gray-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-700">Resume</p>
                  <p className="text-sm leading-6 text-gray-500">
                    {hasResume
                      ? "Your resume is uploaded. You can view, update, or delete it."
                      : "Upload your resume to make it available in the resume section."}
                  </p>
                  <p className="text-sm leading-6 text-gray-500">
                    Resume upload can auto-extract relevant details like Education, Experience, and Skills.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {hasResume && (
                  <a
                    href={resolvedResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded border border-gray-300 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100"
                  >
                    <Download size={16} />
                    View Resume
                  </a>
                )}

                <label
                  className={`flex items-center gap-1 rounded px-3 py-2 text-white transition ${
                    isUploadingResume
                      ? "cursor-not-allowed bg-blue-400"
                      : "cursor-pointer justify-center bg-primary hover:bg-primary-dark"
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
                    className="flex items-center justify-center gap-1 rounded border border-red-200 bg-white px-3 py-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start">
                <FileText size={18} className="mr-2 mt-0.5 text-gray-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-700">Resume</p>
                  <p className="text-sm leading-6 text-gray-500">
                    {userData.name}'s resume is available to view and download.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Link
                  to={`/resume/${userData.username}`}
                  className="flex items-center justify-center gap-1 rounded bg-primary px-3 py-2 text-white transition hover:bg-primary-dark"
                >
                  <FileText size={16} />
                  View Resume
                </Link>

                <a
                  href={resolvedResumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded border border-gray-300 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100"
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
          <div className="border-t border-slate-100 pt-2">
            {mutualConnections?.data?.mutualCount ? (
              <p className="mb-2 text-center text-xs text-slate-500">
                You and this user share {mutualConnections.data.mutualCount} mutual connection{mutualConnections.data.mutualCount === 1 ? "" : "s"}.
              </p>
            ) : null}
            <div className="flex justify-center">{renderConnectionButton()}</div>
          </div>
        )}
      </div>

      {cropModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-semibold text-slate-900">Crop Profile Photo</h3>
              <p className="mt-1 text-sm text-slate-500">
                Adjust the image inside the circle, then save the cropped profile photo.
              </p>
            </div>

            <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1fr_260px]">
              <div className="flex items-center justify-center">
                <div className="relative h-80 w-80 overflow-hidden rounded-full border-4 border-slate-200 bg-slate-100 shadow-inner">
                  <img
                    src={cropModal.source}
                    alt="Crop preview"
                    className="absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      width: cropPreviewWidth || CROPPER_SIZE,
                      height: cropPreviewHeight || CROPPER_SIZE,
                      transform: `translate(calc(-50% + ${cropModal.offsetX}px), calc(-50% + ${cropModal.offsetY}px))`,
                    }}
                    draggable="false"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Zoom
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={cropModal.zoom}
                    onChange={(e) =>
                      setCropModal((prev) => ({
                        ...prev,
                        zoom: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Move Left / Right
                  </label>
                  <input
                    type="range"
                    min="-220"
                    max="220"
                    step="1"
                    value={cropModal.offsetX}
                    onChange={(e) =>
                      setCropModal((prev) => ({
                        ...prev,
                        offsetX: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Move Up / Down
                  </label>
                  <input
                    type="range"
                    min="-220"
                    max="220"
                    step="1"
                    value={cropModal.offsetY}
                    onChange={(e) =>
                      setCropModal((prev) => ({
                        ...prev,
                        offsetY: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCropModal((prev) => ({
                      ...prev,
                      zoom: 1,
                      offsetX: 0,
                      offsetY: 0,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeCropModal}
                disabled={isSavingCroppedPhoto}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                disabled={isSavingCroppedPhoto}
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {isSavingCroppedPhoto ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : null}
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
