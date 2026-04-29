import User from "../models/user.model.js";
import Post from "../models/post.model.js";

const normalizeTargetContext = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const getTargetLists = async (req, res) => {
  try {
    const colleges = await User.distinct("college", { college: { $ne: "" } });
    const cities = await User.distinct("city", { city: { $ne: "" } });

    // Normalize and sort
    const normalize = (arr) =>
      (arr || [])
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    res.status(200).json({ colleges: normalize(colleges), cities: normalize(cities) });
  } catch (error) {
    console.error("Error fetching target lists:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFeedStats = async (req, res) => {
  try {
    const now = new Date();

    // build filters similar to getFeedPosts in post.controller
    const college = normalizeTargetContext(req.user?.college);
    const city = normalizeTargetContext(req.user?.city);
    const targetedMatchOr = [];
    if (college) targetedMatchOr.push({ "jobDetails.targetColleges": { $in: [college] } });
    if (city) targetedMatchOr.push({ "jobDetails.targetCities": { $in: [city] } });

    const publicOrLegacyJobVisibility = [
      { "jobDetails.visibilityType": "public" },
      { "jobDetails.visibilityType": { $exists: false } },
    ];

    const jobVisibilityFilters =
      targetedMatchOr.length > 0
        ? [
            ...publicOrLegacyJobVisibility,
            {
              "jobDetails.visibilityType": "targeted",
              $or: targetedMatchOr,
            },
          ]
        : publicOrLegacyJobVisibility;

    const postsQuery = {
      $or: [
        {
          postType: "job",
          publishAt: { $lte: now },
          $or: jobVisibilityFilters,
        },
        {
          postType: { $ne: "job" },
          author: { $in: [...(req.user?.connections || []), req.user._id] },
          publishAt: { $lte: now },
        },
      ],
    };

    const postsCount = await Post.countDocuments(postsQuery);

    // suggested users count (new people) — reuse existing logic used by frontend suggestions endpoint
    const suggestedUsers = await User.find({})
      .limit(4)
      .lean();
    const peopleCount = suggestedUsers.length || 0;

    res.status(200).json({ postsCount, peopleCount });
  } catch (error) {
    console.error("Error fetching feed stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
