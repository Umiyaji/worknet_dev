import cloudinary from "../lib/cloudinary.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js"
import Notification from "../models/notification.model.js";

const normalizeSkills = (skillsRequired) => {
	if (Array.isArray(skillsRequired)) {
		return skillsRequired
			.map((skill) => String(skill).trim())
			.filter(Boolean);
	}

	if (typeof skillsRequired === "string") {
		return skillsRequired
			.split(",")
			.map((skill) => skill.trim())
			.filter(Boolean);
	}

	return [];
};

const buildJobPostContent = ({
	companyName,
	role,
	totalOpenings,
	experienceRequired,
	workMode,
	officeLocation,
	skillsRequired,
	lastDateToApply,
}) => {
	const formattedDeadline = new Date(lastDateToApply).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const contentLines = [
		`Hiring: ${role}`,
		"",
		`Company: ${companyName}`,
		`Openings: ${totalOpenings}`,
		`Experience: ${experienceRequired}`,
		`Mode: ${workMode}`,
		`Location: ${officeLocation}`,
		`Skills: ${skillsRequired.join(", ")}`,
		`Apply Before: ${formattedDeadline}`,
	];

	return contentLines.join("\n");
};

const createJobDetailsPayload = ({
	companyName,
	role,
	totalOpenings,
	experienceRequired,
	workMode,
	officeLocation,
	skillsRequired,
	lastDateToApply,
	source,
	sourceRowId,
}) => ({
	companyName,
	role,
	totalOpenings,
	experienceRequired,
	workMode,
	officeLocation,
	skillsRequired,
	lastDateToApply: new Date(lastDateToApply),
	source,
	sourceRowId,
});

const validateAutomationPayload = ({
	companyUsername,
	companyName,
	role,
	totalOpenings,
	experienceRequired,
	workMode,
	officeLocation,
	skillsRequired,
	lastDateToApply,
	sourceRowId,
}) => {
	const requiredFields = {
		companyUsername,
		companyName,
		role,
		totalOpenings,
		experienceRequired,
		workMode,
		officeLocation,
		lastDateToApply,
		sourceRowId,
	};

	const missingField = Object.entries(requiredFields).find(([, value]) => value === undefined || value === null || value === "");
	if (missingField) {
		return `Missing required field: ${missingField[0]}`;
	}

	const allowedModes = ["Remote", "In Office", "Hybrid"];
	if (!allowedModes.includes(workMode)) {
		return "workMode must be one of: Remote, In Office, Hybrid";
	}

	if (!Number.isFinite(Number(totalOpenings)) || Number(totalOpenings) < 1) {
		return "totalOpenings must be a number greater than 0";
	}

	if (!skillsRequired.length) {
		return "skillsRequired must include at least one skill";
	}

	if (Number.isNaN(new Date(lastDateToApply).getTime())) {
		return "lastDateToApply must be a valid date";
	}

	return null;
};

const normalizeTargetContext = (value) =>
	typeof value === "string" ? value.trim().toLowerCase() : "";

const sanitizeJobDetailsForViewer = (jobDetails, viewer, { isOwner = false } = {}) => {
	if (!jobDetails) {
		return jobDetails;
	}

	if (isOwner || viewer?.role === "recruiter") {
		return jobDetails;
	}

	const sanitizedDetails = { ...jobDetails };
	delete sanitizedDetails.targetColleges;
	delete sanitizedDetails.targetCities;
	return sanitizedDetails;
};


export const getFeedPosts = async (req, res) => {
	try {
		const now = new Date();
		const college = normalizeTargetContext(req.user?.college);
		const city = normalizeTargetContext(req.user?.city);
		const targetedMatchOr = [];
		if (college) {
			targetedMatchOr.push({ "jobDetails.targetColleges": { $in: [college] } });
		}
		if (city) {
			targetedMatchOr.push({ "jobDetails.targetCities": { $in: [city] } });
		}

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

		const posts = await Post.find({
			$or: [
				{
					postType: "job",
					publishAt: { $lte: now },
					$or: jobVisibilityFilters,
				},
				{
					postType: { $ne: "job" },
					author: { $in: [...req.user.connections, req.user._id] },
					publishAt: { $lte: now },
				},
			],
		})
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture")
			.sort({ publishAt: -1, createdAt: -1 });

		res.status(200).json(
			posts.map((post) => {
				const isOwner = req.user?._id?.toString() === post.author?._id?.toString();
				const postObject = post.toObject();

				if (postObject.postType === "job" && postObject.jobDetails) {
					postObject.jobDetails = sanitizeJobDetailsForViewer(postObject.jobDetails, req.user, { isOwner });
				}

				return postObject;
			})
		);
	} catch (error) {
		console.error("Error in getFeedPosts controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const createPost = async (req, res) => {
	try {
		const { content } = req.body;
		console.log("Creating post - Content:", content, "Has file:", !!req.file, "Content-Type:", req.headers["content-type"]);
		
		let newPost;

		// Check if file was uploaded via multer
		if (req.file) {
			console.log("Processing image upload - File size:", req.file.size, "MIME type:", req.file.mimetype);
			try {
				// Convert buffer to data URI for Cloudinary
				const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
				console.log("Uploading to Cloudinary...");
				const imgResult = await cloudinary.uploader.upload(dataUri);
				console.log("Cloudinary upload successful:", imgResult.secure_url);
				newPost = new Post({
					author: req.user._id,
					content,
					image: imgResult.secure_url,
				});
			} catch (cloudinaryError) {
				console.error("Cloudinary upload error:", cloudinaryError);
				return res.status(500).json({ 
					message: cloudinaryError.message || "Failed to upload image to Cloudinary" 
				});
			}
		} else {
			// Handle text-only post (from JSON)
			console.log("Creating text-only post");
			newPost = new Post({
				author: req.user._id,
				content,
			});
		}

		await newPost.save();
		console.log("Post saved successfully");

		res.status(201).json(newPost);
	} catch (error) {
		console.error("Error in createPost controller:", error);
		console.error("Error stack:", error.stack);
		res.status(500).json({ 
			message: error.message || "Server error",
			error: process.env.NODE_ENV === "development" ? error.stack : undefined
		});
	}
};

export const createAutomatedJobPost = async (req, res) => {
	try {
		const {
			companyUsername,
			companyName,
			role,
			totalOpenings,
			experienceRequired,
			workMode,
			officeLocation,
			skillsRequired: rawSkillsRequired,
			lastDateToApply,
			source = "google-sheet",
			sourceRowId,
			content: providedContent,
		} = req.body;

		const skillsRequired = normalizeSkills(rawSkillsRequired);
		const validationError = validateAutomationPayload({
			companyUsername,
			companyName,
			role,
			totalOpenings,
			experienceRequired,
			workMode,
			officeLocation,
			skillsRequired,
			lastDateToApply,
			sourceRowId,
		});

		if (validationError) {
			return res.status(400).json({ message: validationError });
		}

		const companyUser = await User.findOne({ username: companyUsername.toLowerCase().trim() }).select("_id name username");
		if (!companyUser) {
			return res.status(404).json({ message: "Company account not found for the provided username" });
		}

		const existingPost = await Post.findOne({
			postType: "job",
			author: companyUser._id,
			"jobDetails.source": source,
			"jobDetails.sourceRowId": sourceRowId,
		});

		if (existingPost) {
			return res.status(200).json({
				message: "Job post already exists for this sheet row",
				postId: existingPost._id,
				duplicate: true,
			});
		}

		const normalizedTotalOpenings = Number(totalOpenings);
		const jobDetails = createJobDetailsPayload({
			companyName: companyName.trim(),
			role: role.trim(),
			totalOpenings: normalizedTotalOpenings,
			experienceRequired: experienceRequired.trim(),
			workMode,
			officeLocation: officeLocation.trim(),
			skillsRequired,
			lastDateToApply,
			source,
			sourceRowId: String(sourceRowId).trim(),
		});

		const trimmedProvidedContent =
			typeof providedContent === "string" ? providedContent.trim() : "";

		const newPost = new Post({
			author: companyUser._id,
			postType: "job",
			content: trimmedProvidedContent || buildJobPostContent(jobDetails),
			jobDetails,
		});

		await newPost.save();

		const populatedPost = await Post.findById(newPost._id)
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture username headline");

		res.status(201).json({
			message: "Automated job post created successfully",
			post: populatedPost,
		});
	} catch (error) {
		console.error("Error in createAutomatedJobPost controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};


export const updatePost = async (req, res) => {
	try {
		const { id } = req.params;
		const { content, image } = req.body;
		const userId = req.user._id;

		const post = await Post.findById(id);
		if (!post) return res.status(404).json({ message: "Post not found" });
		if (post.relatedJob) {
			return res.status(400).json({ message: "Job posts are managed from the jobs section" });
		}

		if (post.author.toString() !== userId.toString()) {
			return res.status(403).json({ message: "You can't edit this post" });
		}

		if (content !== undefined) post.content = content;
		if (image !== undefined) post.image = image;

		const updatedPost = await post.save();
		res.status(200).json(updatedPost);
	} catch (err) {
		console.error("Error updating post:", err);
		res.status(500).json({ message: "Failed to update post" });
	}
};


export const deletePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const userId = req.user._id;

		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}
		if (post.relatedJob) {
			return res.status(400).json({ message: "Delete the job from the jobs section to remove this post" });
		}

		if (post.author.toString() !== userId.toString()) {
			return res.status(403).json({ message: "You are not authorized to delete this post" });
		}

		if (post.image) {
			await cloudinary.uploader.destroy(post.image.split("/").pop().split(".")[0]);
		}

		await Post.findByIdAndDelete(postId);

		res.status(200).json({ message: "Post deleted successfully" });
	} catch (error) {
		console.log("Error in delete post controller", error.message);
		res.status(500).json({ message: "Server error" });
	}
};

export const getPostById = async (req, res) => {
	try {
		const postId = req.params.id;
		const post = await Post.findById(postId)
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture username headline");

		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}

		const isOwner = req.user?._id?.toString() === post.author?._id?.toString();
		if (post.publishAt && new Date(post.publishAt).getTime() > Date.now() && !isOwner) {
			return res.status(404).json({ message: "Post not found" });
		}

		if (!isOwner && post.postType === "job" && post.jobDetails?.visibilityType === "targeted") {
			const college = normalizeTargetContext(req.user?.college);
			const city = normalizeTargetContext(req.user?.city);
			const targetColleges = Array.isArray(post.jobDetails?.targetColleges) ? post.jobDetails.targetColleges : [];
			const targetCities = Array.isArray(post.jobDetails?.targetCities) ? post.jobDetails.targetCities : [];
			const matchesCollege = college && targetColleges.includes(college);
			const matchesCity = city && targetCities.includes(city);
			if (!matchesCollege && !matchesCity) {
				return res.status(404).json({ message: "Post not found" });
			}
		}

		const postObject = post.toObject();
		if (postObject.postType === "job" && postObject.jobDetails) {
			postObject.jobDetails = sanitizeJobDetailsForViewer(postObject.jobDetails, req.user, { isOwner });
		}

		res.status(200).json(postObject);
	} catch (error) {
		console.error("Error in getPostById controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

// Create Comment 
export const createComment = async (req, res) => {
	try {
		const postId = req.params.id;
		const { content } = req.body;
		const userId = req.user._id;

		const updatedPost = await Post.findByIdAndUpdate(
			postId,
			{ $push: { comments: { user: userId, content } } },
			{ new: true }
		);

		if (!updatedPost) {
			return res.status(404).json({ message: "Post not found" });
		}

		const postWithAuthor = await Post.findById(postId)
			.populate("author", "name email username")
			.populate("comments.user", "name profilePicture username headline");

		const newComment = postWithAuthor.comments.slice(-1)[0];

		res.status(201).json({
			message: "Comment created successfully",
			comment: newComment,
		});

		if (postWithAuthor.author._id.toString() !== userId.toString()) {
			(async () => {
				try {
					const newNotification = new Notification({
						recipient: postWithAuthor.author._id,
						type: "comment",
						relatedUser: userId,
						relatedPost: postId,
					});
					await newNotification.save();
				} catch (emailError) {
					console.error("Error while creating comment notification:", emailError);
				}
			})();
		}
	} catch (error) {
		console.error("Error in createComment controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};


// Delete a comment
export const deleteComment = async (req, res) => {
	const { postId, commentId } = req.params;

	try {
		const post = await Post.findById(postId);
		if (!post) return res.status(404).json({ message: "Post not found" });

		const comment = post.comments.id(commentId);
		if (!comment) return res.status(404).json({ message: "Comment not found" });

		if (comment.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "Not authorized" });
		}

		comment.deleteOne();
		await post.save();

		res.json({ message: "Comment deleted" });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
};


export const getUserPosts = async (req, res) => {
	try {
		const { username } = req.params;
		
		// Find user by username
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Get all posts by this user
		const postQuery = { author: user._id };
		const isOwner = req.user?._id?.toString() === user._id.toString();
		if (!isOwner) {
			postQuery.publishAt = { $lte: new Date() };
		}

		const posts = await Post.find(postQuery)
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture username headline")
			.sort({ publishAt: -1, createdAt: -1 });

		res.status(200).json(posts);
	} catch (error) {
		console.error("Error in getUserPosts controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const likePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const post = await Post.findById(postId);
		const userId = req.user._id;

		if (post.likes.includes(userId)) {
			post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
		} else {
			post.likes.push(userId);
			if (post.author.toString() !== userId.toString()) {
				const newNotification = new Notification({
					recipient: post.author,
					type: "like",
					relatedUser: userId,
					relatedPost: postId,
				});

				await newNotification.save();
			}
		}

		await post.save();

		res.status(200).json(post);
	} catch (error) {
		console.error("Error in likePost controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

