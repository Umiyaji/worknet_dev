import { axiosInstance } from "./axios";

export const getBackendOrigin = () => {
  const baseURL = axiosInstance.defaults.baseURL || "";

  try {
    return new URL(baseURL).origin;
  } catch {
    return window.location.origin;
  }
};

export const resolveImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") {
    return "";
  }

  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) {
    return "";
  }

  if (trimmedUrl.startsWith("data:") || trimmedUrl.startsWith("blob:")) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith("/")) {
    if (trimmedUrl.startsWith("/uploads/")) {
      return `${getBackendOrigin()}${trimmedUrl}`;
    }

    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const backendOrigin = getBackendOrigin();
    const backendUrl = new URL(backendOrigin);

    if (
      parsedUrl.hostname === backendUrl.hostname &&
      parsedUrl.pathname.startsWith("/uploads/")
    ) {
      return `${backendOrigin}${parsedUrl.pathname}`;
    }

    return trimmedUrl;
  } catch {
    return trimmedUrl;
  }
};
