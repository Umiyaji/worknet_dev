import { getBackendOrigin } from "./imageUrl";

export const resolveResumeUrl = (resumeUrl) => {
  if (!resumeUrl) {
    return "";
  }

  if (resumeUrl.startsWith("/")) {
    return `${getBackendOrigin()}${resumeUrl}`;
  }

  try {
    const url = new URL(resumeUrl);
    const backendOrigin = getBackendOrigin();
    const backendUrl = new URL(backendOrigin);
    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";

    if (
      (isLocalHost ||
        (url.hostname === backendUrl.hostname && url.port === backendUrl.port)) &&
      url.pathname.startsWith("/uploads/")
    ) {
      return `${backendOrigin}${url.pathname}${url.search}${url.hash}`;
    }

    return resumeUrl;
  } catch {
    return resumeUrl;
  }
};
