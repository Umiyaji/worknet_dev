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

    if (
      url.hostname === backendUrl.hostname &&
      url.port === backendUrl.port &&
      url.pathname.startsWith("/uploads/")
    ) {
      return `${backendOrigin}${url.pathname}`;
    }

    return resumeUrl;
  } catch {
    return resumeUrl;
  }
};
