import cron from "node-cron";
import { processScheduledRows } from "./jobRowService.js";

let schedulerStarted = false;

export const startJobRowScheduler = () => {
	if (schedulerStarted) return;

	const schedule = process.env.JOB_ROW_CRON || "* * * * *";
	const timezone = process.env.JOB_ROW_CRON_TZ || "Asia/Kolkata";

	cron.schedule(
		schedule,
		async () => {
			try {
				const result = await processScheduledRows();
				console.log("[JobRowScheduler] Run complete:", result);
			} catch (error) {
				console.error("[JobRowScheduler] Run failed:", error);
			}
		},
		{
			timezone,
		}
	);

	schedulerStarted = true;
	console.log(`[JobRowScheduler] Started with cron '${schedule}' (${timezone})`);
};
