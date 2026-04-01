import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { requireRecruiter } from "../middleware/recruiter.middleware.js";
import { uploadExcelFile } from "../middleware/excelUpload.middleware.js";
import {
	applyToJob,
	createJob,
	deleteJob,
	getAllJobs,
	getApplicationDetails,
	getApplicantsForJob,
	getJobById,
	getMyApplications,
	getRecruiterJobs,
	publishExcelJobs,
	sendMessageToApplicant,
	updateJob,
	updateApplicationNotes,
	updateApplicationStatus,
	uploadExcelPreview,
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", protectRoute, getAllJobs);
router.get("/my-applications", protectRoute, getMyApplications);
router.get("/my-jobs", protectRoute, requireRecruiter, getRecruiterJobs);
router.get("/:jobId", protectRoute, getJobById);

router.post("/", protectRoute, requireRecruiter, createJob);
router.put("/:jobId", protectRoute, requireRecruiter, updateJob);
router.delete("/:jobId", protectRoute, requireRecruiter, deleteJob);

router.post("/upload-excel/preview", protectRoute, requireRecruiter, uploadExcelFile, uploadExcelPreview);
router.post("/upload-excel/publish", protectRoute, requireRecruiter, publishExcelJobs);

router.post("/:jobId/apply", protectRoute, applyToJob);
router.get("/:jobId/applicants", protectRoute, requireRecruiter, getApplicantsForJob);
router.get("/:jobId/applicants/:applicationId", protectRoute, requireRecruiter, getApplicationDetails);
router.put("/:jobId/applicants/:applicationId/status", protectRoute, requireRecruiter, updateApplicationStatus);
router.put("/:jobId/applicants/:applicationId/notes", protectRoute, requireRecruiter, updateApplicationNotes);
router.post("/:jobId/applicants/:applicationId/message", protectRoute, requireRecruiter, sendMessageToApplicant);

export default router;
