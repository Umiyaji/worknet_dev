import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { requireRecruiter } from "../middleware/recruiter.middleware.js";
import { uploadExcelFile } from "../middleware/excelUpload.middleware.js";
import {
	addJobRow,
	bulkActionJobRows,
	deleteJobRow,
	listJobRows,
	postJobRowNow,
	processScheduledJobRowsNow,
	updateJobRow,
	uploadJobRowsExcel,
} from "../controllers/jobRow.controller.js";

const router = express.Router();

router.get("/", protectRoute, requireRecruiter, listJobRows);
router.post("/", protectRoute, requireRecruiter, addJobRow);
router.put("/:rowId", protectRoute, requireRecruiter, updateJobRow);
router.delete("/:rowId", protectRoute, requireRecruiter, deleteJobRow);
router.post("/:rowId/post-now", protectRoute, requireRecruiter, postJobRowNow);
router.post("/bulk-action", protectRoute, requireRecruiter, bulkActionJobRows);
router.post("/upload-excel", protectRoute, requireRecruiter, uploadExcelFile, uploadJobRowsExcel);
router.post("/process-scheduled", protectRoute, requireRecruiter, processScheduledJobRowsNow);

export default router;
