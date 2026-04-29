import axios from "axios";
import {
	completeUploadProgress,
	startUploadProgress,
	updateDownloadProgress,
	updateUploadProgress,
} from "./uploadProgress";


export const axiosInstance = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_URL + "/api/v1",
	withCredentials: true,
});

let interceptorsRegistered = false;

const isUploadRequest = (config) => {
	if (!config) return false;
	const method = String(config.method || "get").toLowerCase();
	const supportsUpload = method === "post" || method === "put" || method === "patch";
	if (!supportsUpload) return false;

	if (typeof FormData !== "undefined" && config.data instanceof FormData) {
		return true;
	}

	const contentType =
		config.headers?.["Content-Type"] ||
		config.headers?.["content-type"] ||
		"";
	return typeof contentType === "string" && contentType.includes("multipart/form-data");
};

if (!interceptorsRegistered) {
	axiosInstance.interceptors.request.use(
		(config) => {
			if (!isUploadRequest(config)) {
				return config;
			}

			const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
			config.__uploadId = uploadId;
			startUploadProgress(uploadId);

			const originalOnUploadProgress = config.onUploadProgress;
			const originalOnDownloadProgress = config.onDownloadProgress;
			config.onUploadProgress = (progressEvent) => {
				updateUploadProgress(uploadId, progressEvent);
				if (typeof originalOnUploadProgress === "function") {
					originalOnUploadProgress(progressEvent);
				}
			};
			config.onDownloadProgress = (progressEvent) => {
				updateDownloadProgress(uploadId, progressEvent);
				if (typeof originalOnDownloadProgress === "function") {
					originalOnDownloadProgress(progressEvent);
				}
			};

			return config;
		},
		(error) => Promise.reject(error),
	);

	axiosInstance.interceptors.response.use(
		(response) => {
			const uploadId = response?.config?.__uploadId;
			if (uploadId) {
				completeUploadProgress(uploadId);
			}
			return response;
		},
		(error) => {
			const uploadId = error?.config?.__uploadId;
			if (uploadId) {
				completeUploadProgress(uploadId);
			}
			return Promise.reject(error);
		},
	);

	interceptorsRegistered = true;
}
