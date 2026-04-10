import Post from "../models/post.model.js";

const formatWorkMode = (jobType) => {
  if (jobType === "remote") return "Remote";
  if (jobType === "on-site") return "In Office";
  return "Hybrid";
};

const buildJobPostContent = (job) => {
  const formattedDeadline = new Date(job.lastDateToApply).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lines = [
    `We're hiring for ${job.title}.`,
    "",
    `Location: ${job.location}`,
    `Work mode: ${formatWorkMode(job.jobType)}`,
    `Experience: ${job.experienceRequired}`,
  ];

  if (job.salaryRange) {
    lines.push(`Compensation: ${job.salaryRange}`);
  }

  if (Array.isArray(job.skillsRequired) && job.skillsRequired.length) {
    lines.push(`Skills: ${job.skillsRequired.join(", ")}`);
  }

  lines.push(`Apply by: ${formattedDeadline}`);

  return lines.join("\n");
};

const buildJobDetails = (job) => ({
  companyName: job.companyName,
  role: job.title,
  totalOpenings: 1,
  experienceRequired: job.experienceRequired,
  workMode: formatWorkMode(job.jobType),
  officeLocation: job.location,
  skillsRequired: job.skillsRequired || [],
  lastDateToApply: job.lastDateToApply,
  visibilityType: job.visibilityType || "public",
  targetColleges: job.targetColleges || [],
  targetCities: job.targetCities || [],
  source: "worknet-job",
  sourceRowId: job._id.toString(),
});

export const syncJobPost = async (job) => {
  const payload = {
    author: job.companyId,
    postType: "job",
    publishAt: job.publishAt || new Date(),
    relatedJob: job._id,
    content: buildJobPostContent(job),
    jobDetails: buildJobDetails(job),
  };

  const existingPost = await Post.findOne({ relatedJob: job._id });
  if (existingPost) {
    Object.assign(existingPost, payload);
    await existingPost.save();
    return existingPost;
  }

  return Post.create(payload);
};

export const deleteJobPost = async (jobId) => {
  await Post.deleteOne({ relatedJob: jobId });
};
