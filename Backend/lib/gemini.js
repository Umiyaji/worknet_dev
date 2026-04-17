const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const getConfiguredModels = (preferredModels) => {
  if (Array.isArray(preferredModels) && preferredModels.length) {
    return Array.from(
      new Set(
        preferredModels
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
  }

  const primaryModel = String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const fallbackModels = String(process.env.GEMINI_FALLBACK_MODELS || "gemini-2.0-flash")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set([primaryModel, ...fallbackModels]));
};

const isRetryableGeminiMessage = (message = "") => {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("high demand") ||
    normalized.includes("try again later") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("resource exhausted") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("overloaded") ||
    normalized.includes("unavailable")
  );
};

const createGeminiError = ({ status, message, model, data }) => {
  const error = new Error(message || "Gemini request failed");
  error.status = status;
  error.model = model;
  error.data = data;
  error.retryable = RETRYABLE_STATUS_CODES.has(status) || isRetryableGeminiMessage(message);
  return error;
};

export const generateGeminiContent = async ({ body, signal, models }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const configuredModels = getConfiguredModels(models);
  let lastError = null;

  for (const model of configuredModels) {
    let response;
    let data;

    try {
      response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal,
        }
      );

      data = await response.json();
    } catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }

      lastError = error;
      continue;
    }

    if (response.ok) {
      return { data, model };
    }

    const errorMessage = data?.error?.message || "Gemini request failed";
    const error = createGeminiError({
      status: response.status,
      message: errorMessage,
      model,
      data,
    });

    lastError = error;

    if (!error.retryable) {
      throw error;
    }
  }

  throw lastError || new Error("Gemini request failed");
};
