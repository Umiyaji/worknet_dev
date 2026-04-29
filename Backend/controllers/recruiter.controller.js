import User from "../models/user.model.js";
import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import JobRow from "../models/jobRow.model.js";
import Post from "../models/post.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getPagination } from "../lib/pagination.js";

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

export const getRecruiterDashboard = async (req, res) => {
	try {
		const recruiterId = req.user._id;

		const [
			totalJobsPosted,
			activeJobs,
			recentJobs,
			applicationsByJob,
			statusBreakdown,
			recentApplications,
			jobRowStats,
			conversionByJob,
		] = await Promise.all([
			Job.countDocuments({ companyId: recruiterId }),
			Job.countDocuments({ companyId: recruiterId, lastDateToApply: { $gte: new Date() } }),
			Job.find({ companyId: recruiterId }).sort({ createdAt: -1 }).limit(5),
			Application.aggregate([
				{
					$lookup: {
						from: "jobs",
						localField: "jobId",
						foreignField: "_id",
						as: "job",
					},
				},
				{ $unwind: "$job" },
				{ $match: { "job.companyId": recruiterId } },
				{
					$group: {
						_id: null,
						totalApplicants: { $sum: 1 },
					},
				},
			]),
			Application.aggregate([
				{
					$lookup: {
						from: "jobs",
						localField: "jobId",
						foreignField: "_id",
						as: "job",
					},
				},
				{ $unwind: "$job" },
				{ $match: { "job.companyId": recruiterId } },
				{
					$group: {
						_id: "$status",
						count: { $sum: 1 },
					},
				},
			]),
			Application.find()
				.populate({
					path: "jobId",
					match: { companyId: recruiterId },
					select: "title",
				})
				.populate("userId", "name username profilePicture")
				.sort({ createdAt: -1 })
				.limit(8),
			JobRow.aggregate([
				{ $match: { recruiterId } },
				{
					$group: {
						_id: "$status",
						count: { $sum: 1 },
					},
				},
			]),
			Application.aggregate([
				{
					$lookup: {
						from: "jobs",
						localField: "jobId",
						foreignField: "_id",
						as: "job",
					},
				},
				{ $unwind: "$job" },
				{ $match: { "job.companyId": recruiterId } },
				{
					$group: {
						_id: "$jobId",
						applicants: { $sum: 1 },
						hired: {
							$sum: {
								$cond: [{ $eq: ["$status", "hired"] }, 1, 0],
							},
						},
					},
				},
			]),
		]);

		const filteredRecentApplications = recentApplications.filter((item) => item.jobId);

		return res.json({
			totalJobsPosted,
			activeJobs,
			totalApplicants: applicationsByJob[0]?.totalApplicants || 0,
			automatedJobRows: jobRowStats.reduce(
				(acc, item) => {
					acc.total += item.count;
					acc[item._id] = item.count;
					return acc;
				},
				{ total: 0, draft: 0, scheduled: 0, posted: 0, error: 0 }
			),
			recentJobs,
			statusBreakdown: statusBreakdown.reduce((acc, item) => {
				acc[item._id] = item.count;
				return acc;
			}, {}),
			conversionFunnel: {
				applied: statusBreakdown.find((item) => item._id === "applied")?.count || 0,
				reviewing: statusBreakdown.find((item) => item._id === "reviewing")?.count || 0,
				shortlisted: statusBreakdown.find((item) => item._id === "shortlisted")?.count || 0,
				hired: statusBreakdown.find((item) => item._id === "hired")?.count || 0,
			},
			averageJobConversionRate: conversionByJob.length
				? conversionByJob.reduce((sum, item) => sum + (item.applicants ? item.hired / item.applicants : 0), 0) /
				  conversionByJob.length
				: 0,
			recentApplications: filteredRecentApplications,
		});
	} catch (error) {
		console.error("Error in getRecruiterDashboard controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getRecruiterAnalytics = async (req, res) => {
	try {
		const recruiterId = req.user._id;
		const [jobs, applications, sourceBreakdown, postViews] = await Promise.all([
			Job.find({ companyId: recruiterId }).select("_id").lean(),
			Application.aggregate([
				{
					$lookup: {
						from: "jobs",
						localField: "jobId",
						foreignField: "_id",
						as: "job",
					},
				},
				{ $unwind: "$job" },
				{ $match: { "job.companyId": recruiterId } },
				{
					$group: {
						_id: "$status",
						count: { $sum: 1 },
					},
				},
			]),
			Application.aggregate([
				{
					$lookup: {
						from: "jobs",
						localField: "jobId",
						foreignField: "_id",
						as: "job",
					},
				},
				{ $unwind: "$job" },
				{ $match: { "job.companyId": recruiterId } },
				{
					$group: {
						_id: {
							$cond: [
								{ $gt: [{ $strLenCP: { $ifNull: ["$portfolioUrl", ""] } }, 0] },
								"portfolio",
								{ $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$linkedinUrl", ""] } }, 0] }, "linkedin", "direct"] },
							],
						},
						count: { $sum: 1 },
					},
				},
			]),
			Post.aggregate([
				{ $match: { author: recruiterId } },
				{ $group: { _id: null, totalPostViews: { $sum: { $ifNull: ["$viewCount", 0] } } } },
			]),
		]);

		const totalApplications = applications.reduce((sum, item) => sum + item.count, 0);
		const hiredCount = applications.find((item) => item._id === "hired")?.count || 0;
		return res.json({
			jobViews: postViews[0]?.totalPostViews || 0,
			totalJobs: jobs.length,
			totalApplications,
			hiredCount,
			conversionRate: totalApplications ? hiredCount / totalApplications : 0,
			sourceTracking: sourceBreakdown.reduce((acc, item) => {
				acc[item._id] = item.count;
				return acc;
			}, {}),
		});
	} catch (error) {
		console.error("Error in getRecruiterAnalytics controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getRejectionTemplates = async (req, res) => {
	try {
		const recruiter = await User.findById(req.user._id).select("recruiterRejectionTemplates").lean();
		return res.json({ templates: recruiter?.recruiterRejectionTemplates || [] });
	} catch (error) {
		console.error("Error in getRejectionTemplates controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const saveRejectionTemplates = async (req, res) => {
	try {
		const templates = Array.isArray(req.body?.templates)
			? req.body.templates.map((item) => cleanString(item)).filter(Boolean).slice(0, 20)
			: [];
		await User.updateOne({ _id: req.user._id }, { $set: { recruiterRejectionTemplates: templates } });
		return res.json({ templates });
	} catch (error) {
		console.error("Error in saveRejectionTemplates controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const updateRecruiterCompanyProfile = async (req, res) => {
	try {
		const recruiter = await User.findById(req.user._id);
		if (!recruiter) {
			return res.status(404).json({ message: "Recruiter not found" });
		}

		recruiter.role = "recruiter";
		recruiter.companyName = cleanString(req.body.companyName) || recruiter.companyName;
		recruiter.companyWebsite = cleanString(req.body.companyWebsite) || recruiter.companyWebsite;
		recruiter.companySize = cleanString(req.body.companySize) || recruiter.companySize;
		recruiter.industry = cleanString(req.body.industry) || recruiter.industry;
		recruiter.companyLocation = cleanString(req.body.companyLocation) || recruiter.companyLocation;
		recruiter.HRName = cleanString(req.body.HRName) || recruiter.HRName;

		if (Object.prototype.hasOwnProperty.call(req.body, "aboutCompany")) {
			recruiter.aboutCompany = cleanString(req.body.aboutCompany);
		}

		if (req.body.companyLogo) {
			const uploadedLogo = await cloudinary.uploader.upload(req.body.companyLogo);
			recruiter.companyLogo = uploadedLogo.secure_url;
		}
		if (req.body.removeCompanyLogo) {
			recruiter.companyLogo = "";
		}

		if (req.body.companyBanner) {
			const uploadedBanner = await cloudinary.uploader.upload(req.body.companyBanner);
			recruiter.companyBanner = uploadedBanner.secure_url;
		}
		if (req.body.removeCompanyBanner) {
			recruiter.companyBanner = "";
		}

		await recruiter.save();

		const safeRecruiter = await User.findById(req.user._id).select("-password");
		return res.json(safeRecruiter);
	} catch (error) {
		console.error("Error in updateRecruiterCompanyProfile controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};

export const getRecruiterPublicProfile = async (req, res) => {
	try {
		const { limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 100 });
		const recruiter = await User.findOne({
			username: req.params.username,
			role: "recruiter",
		}).select("-password").lean();

		if (!recruiter) {
			return res.status(404).json({ message: "Recruiter not found" });
		}

		const openJobs = await Job.find({
			companyId: recruiter._id,
			lastDateToApply: { $gte: new Date() },
		})
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		const totalOpenings = openJobs.length;
		return res.json({
			recruiter,
			openJobs,
			totalOpenings,
		});
	} catch (error) {
		console.error("Error in getRecruiterPublicProfile controller:", error);
		return res.status(500).json({ message: "Server error" });
	}
};
