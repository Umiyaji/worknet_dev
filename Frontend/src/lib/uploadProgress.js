const listeners = new Set();
const uploads = new Map();

let hideTimer = null;
let state = {
  visible: false,
  progress: 0,
};

const emit = () => {
  for (const listener of listeners) {
    listener(state);
  }
};

const clearHideTimer = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const recomputeProgress = () => {
  if (!uploads.size) {
    clearHideTimer();
    hideTimer = setTimeout(() => {
      state = { visible: false, progress: 0 };
      emit();
    }, 350);
    return;
  }

  let sum = 0;
  for (const upload of uploads.values()) {
    sum += clamp(Number(upload.progress || 0), 0, 100);
  }
  const averageProgress = Math.floor(sum / uploads.size);

  clearHideTimer();
  state = {
    visible: true,
    progress: Math.max(averageProgress, 3),
  };
  emit();
};

export const subscribeUploadProgress = (listener) => {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
};

export const startUploadProgress = (uploadId) => {
  if (!uploadId) return;

  uploads.set(uploadId, {
    progress: 2,
  });
  recomputeProgress();
};

export const updateUploadProgress = (uploadId, event = {}) => {
  if (!uploadId || !uploads.has(uploadId)) return;

  const upload = uploads.get(uploadId);
  const loaded = Number(event.loaded || 0);
  const total = Number(event.total || 0);

  if (total > 0) {
    const uploadPercent = Math.floor((loaded / total) * 100);
    // Keep upload in the first 92% and reserve tail for response/download.
    const mappedProgress = clamp(Math.floor((uploadPercent / 100) * 92), 3, 92);
    upload.progress = Math.max(upload.progress || 0, mappedProgress);
  } else {
    // When total is unknown, progress still advances smoothly.
    upload.progress = clamp((upload.progress || 2) + 4, 3, 88);
  }

  uploads.set(uploadId, upload);
  recomputeProgress();
};

export const updateDownloadProgress = (uploadId, event = {}) => {
  if (!uploadId || !uploads.has(uploadId)) return;

  const upload = uploads.get(uploadId);
  const loaded = Number(event.loaded || 0);
  const total = Number(event.total || 0);

  if (total > 0) {
    const downloadPercent = Math.floor((loaded / total) * 100);
    // Download/response phase fills final 8%.
    const mappedProgress = clamp(92 + Math.floor((downloadPercent / 100) * 8), 92, 99);
    upload.progress = Math.max(upload.progress || 0, mappedProgress);
  } else {
    upload.progress = clamp((upload.progress || 92) + 2, 92, 99);
  }

  uploads.set(uploadId, upload);
  recomputeProgress();
};

export const completeUploadProgress = (uploadId) => {
  if (!uploadId) return;

  if (!uploads.has(uploadId)) {
    return;
  }

  const upload = uploads.get(uploadId);
  uploads.set(uploadId, { ...upload, progress: 100 });
  state = { visible: true, progress: 100 };
  emit();

  setTimeout(() => {
    uploads.delete(uploadId);
    recomputeProgress();
  }, 600);
};
