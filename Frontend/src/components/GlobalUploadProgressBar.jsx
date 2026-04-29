import { useEffect, useState } from "react";
import { subscribeUploadProgress } from "../lib/uploadProgress";

const GlobalUploadProgressBar = () => {
  const [uploadState, setUploadState] = useState({ visible: false, progress: 0 });
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    return subscribeUploadProgress(setUploadState);
  }, []);

  useEffect(() => {
    if (!uploadState.visible) {
      setDisplayProgress(0);
      return;
    }

    const target = Math.max(0, Math.min(Math.round(uploadState.progress), 100));
    const timer = setInterval(() => {
      setDisplayProgress((current) => {
        if (current >= target) return current;
        const diff = target - current;
        const step = diff >= 20 ? 4 : diff >= 10 ? 3 : 1;
        return Math.min(target, current + step);
      });
    }, 45);

    return () => clearInterval(timer);
  }, [uploadState.visible, uploadState.progress]);

  if (!uploadState.visible) {
    return null;
  }

  const progressValue = Math.max(0, Math.min(Math.round(displayProgress), 100));

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[120] w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Uploading file
        </p>
        <p className="text-sm font-semibold text-cyan-700">{progressValue}%</p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-cyan-500 transition-[width] duration-200 ease-out"
          style={{ width: `${Math.max(3, progressValue)}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        {progressValue < 100 ? "Please wait while your file is uploading..." : "Upload completed"}
      </p>
    </div>
  );
};

export default GlobalUploadProgressBar;
