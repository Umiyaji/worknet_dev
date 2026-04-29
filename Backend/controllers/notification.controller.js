import Notification from "../models/notification.model.js";
import { getPagination } from "../lib/pagination.js";

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const getEntityId = (value) => {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (isObject(value) && value._id) return String(value._id);
	if (typeof value.toString === "function") {
		const serialized = value.toString();
		return serialized && serialized !== "[object Object]" ? serialized : "";
	}
	return "";
};
const getEntityField = (value, field) => (isObject(value) ? cleanText(value[field]) : "");

const getActorSummary = (notification) => {
	const actor = notification.relatedUser;

	if (!actor) {
		return {
			name: "Worknet",
			username: "",
			profilePicture: "/avatar.png",
			isSystem: true,
		};
	}

	return {
		name: getEntityField(actor, "name") || "Worknet user",
		username: getEntityField(actor, "username"),
		profilePicture: getEntityField(actor, "profilePicture") || "/avatar.png",
		isSystem: !getEntityField(actor, "username") && !getEntityField(actor, "name"),
	};
};

const getRelativePath = (notification) => {
	const postId = getEntityId(notification.relatedPost);
	const jobId = getEntityId(notification.relatedJob);
	const applicationId = getEntityId(notification.relatedApplication);

	switch (notification.type) {
		case "like":
		case "comment":
			return postId
				? `/posts/${postId}`
				: "";
		case "connectionAccepted":
			return getEntityField(notification.relatedUser, "username")
				? `/profile/${getEntityField(notification.relatedUser, "username")}`
				: "";
		case "message":
			return applicationId && jobId
				? `/recruiter/jobs/${jobId}/applicants/${applicationId}`
				: "/messages";
		case "applicationSubmitted":
			return applicationId && jobId
				? `/recruiter/jobs/${jobId}/applicants/${applicationId}`
				: jobId
					? `/recruiter/jobs/${jobId}/applicants`
					: "";
		case "applicationStatusUpdated":
			return jobId
				? `/jobs/${jobId}`
				: "/applications";
		case "targetedJob":
			return jobId
				? `/jobs/${jobId}`
				: "";
		default:
			return "";
	}
};

const getAboutDetails = (notification) => {
	const postContent = getEntityField(notification.relatedPost, "content");
	const jobTitle = cleanText(notification.metadata?.jobTitle) || getEntityField(notification.relatedJob, "title");
	const applicationName = getEntityField(notification.relatedApplication, "fullName");

	if (notification.type === "like" || notification.type === "comment") {
		return {
			label: "About post",
			value: postContent || "Open the related post",
			path: getEntityId(notification.relatedPost) ? `/posts/${getEntityId(notification.relatedPost)}` : "",
			pathLabel: "View post",
		};
	}

	if (notification.type === "targetedJob") {
		return {
			label: "About job",
			value: jobTitle || "Targeted hiring opening",
			path: getEntityId(notification.relatedJob) ? `/jobs/${getEntityId(notification.relatedJob)}` : "",
			pathLabel: "View job",
		};
	}

	if (notification.type === "applicationSubmitted" || notification.type === "applicationStatusUpdated") {
		return {
			label: "About application",
			value: applicationName || jobTitle || "Candidate application update",
			path: getRelativePath(notification),
			pathLabel: notification.type === "applicationSubmitted" ? "Review application" : "Open application",
		};
	}

	if (notification.type === "message") {
		return {
			label: "About message",
			value: jobTitle || cleanText(notification.relatedMessage?.text) || "Conversation update",
			path: getRelativePath(notification),
			pathLabel: "Open chat",
		};
	}

	if (notification.type === "connectionAccepted") {
		return {
			label: "About connection",
			value: getActorSummary(notification).name,
			path: getRelativePath(notification),
			pathLabel: "View profile",
		};
	}

	return {
		label: "About",
		value:
			cleanText(notification.metadata?.title) ||
			cleanText(notification.metadata?.message) ||
			"Worknet update",
		path: getRelativePath(notification),
		pathLabel: "Open",
	};
};

const buildPresentation = (notification) => {
	const actor = getActorSummary(notification);
	const jobTitle = cleanText(notification.metadata?.jobTitle) || getEntityField(notification.relatedJob, "title");
	const applicationStatus = cleanText(notification.metadata?.status);
	const applicationNote = cleanText(notification.metadata?.note);
	const messageText = getEntityField(notification.relatedMessage, "text");
	const postContent = getEntityField(notification.relatedPost, "content");
	const about = getAboutDetails(notification);

	switch (notification.type) {
		case "like":
			return {
				title: `${actor.name} liked your post`,
				description: "Someone appreciated the post you shared.",
				actionLabel: "Open post",
				group: "social",
				about,
			};
		case "comment":
			return {
				title: `${actor.name} commented on your post`,
				description: "There is a new comment waiting on your post.",
				actionLabel: "View comment",
				group: "social",
				about,
			};
		case "connectionAccepted":
			return {
				title: `${actor.name} accepted your connection request`,
				description: "Your network just grew by one new professional contact.",
				actionLabel: actor.username ? "View profile" : "Open network",
				group: "network",
				about,
			};
		case "message":
			return {
				title: `${actor.name} sent you a message`,
				description:
					messageText ||
					(jobTitle
						? `Conversation update for ${jobTitle}.`
						: "Open the conversation to read the latest update."),
				actionLabel:
					getEntityId(notification.relatedApplication) && getEntityId(notification.relatedJob)
						? "Open applicant chat"
						: "Open chat",
				group: "messages",
				about,
			};
		case "applicationSubmitted":
			return {
				title: `${actor.name} applied for ${jobTitle || "your job"}`,
				description:
					applicationStatus
						? `Current status: ${applicationStatus}.`
						: "A new candidate application is ready for review.",
				actionLabel: "Review application",
				group: "hiring",
				about,
			};
		case "applicationStatusUpdated":
			return {
				title: `${jobTitle || "Your application"} status was updated`,
				description:
					applicationNote ||
					(applicationStatus
						? `New status: ${applicationStatus}.`
						: "A recruiter updated your application."),
				actionLabel: getEntityId(notification.relatedJob) ? "View job" : "View applications",
				group: "hiring",
				about,
			};
		case "targetedJob":
			return {
				title: `${actor.name} posted a targeted opening`,
				description:
					jobTitle
						? `${jobTitle}${cleanText(notification.metadata?.companyName) ? ` at ${cleanText(notification.metadata.companyName)}` : ""}`
						: "A job matching your college or city is available.",
				actionLabel: "View job",
				group: "hiring",
				about,
			};
		default:
			return {
				title:
					cleanText(notification.metadata?.title) ||
					(notification.type ? `${notification.type} notification` : "New notification"),
				description:
					cleanText(notification.metadata?.message) ||
					cleanText(notification.metadata?.description) ||
					"You have a new update on Worknet.",
				actionLabel: about.path ? about.pathLabel : "Open",
				group: "general",
				about,
			};
	}
};

const serializeNotification = (notification) => {
	const actor = getActorSummary(notification);
	const presentation = buildPresentation(notification);
	const href = getRelativePath(notification);

	return {
		...notification,
		actor,
		presentation: {
			...presentation,
			href,
		},
	};
};

export const getUserNotifications = async (req, res) => {
	try {
		const { limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 100 });
		const notifications = await Notification.find({ recipient: req.user._id })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate("relatedUser", "name username profilePicture")
			.populate("relatedPost", "content image")
			.populate("relatedMessage", "text image createdAt")
			.populate("relatedJob", "title companyName")
			.populate("relatedApplication", "status fullName")
			.lean();

		res.status(200).json(notifications.map(serializeNotification));
	} catch (error) {
		console.error("Error in getUserNotifications controller:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const markNotificationAsRead = async (req, res) => {
	const notificationId = req.params.id;
	try {
		const notification = await Notification.findOneAndUpdate(
			{ _id: notificationId, recipient: req.user._id },
			{ read: true },
			{ new: true }
		).lean();

		if (!notification) {
			return res.status(404).json({ message: "Notification not found" });
		}

		res.json(notification);
	} catch (error) {
		console.error("Error in markNotificationAsRead controller:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const markAllNotificationsAsRead = async (req, res) => {
	try {
		const result = await Notification.updateMany(
			{ recipient: req.user._id, read: false },
			{ $set: { read: true } }
		);

		res.json({
			message: "Notifications marked as read",
			modifiedCount: result.modifiedCount || 0,
		});
	} catch (error) {
		console.error("Error in markAllNotificationsAsRead controller:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const deleteNotification = async (req, res) => {
	const notificationId = req.params.id;

	try {
		const deletedNotification = await Notification.findOneAndDelete({
			_id: notificationId,
			recipient: req.user._id,
		});

		if (!deletedNotification) {
			return res.status(404).json({ message: "Notification not found" });
		}

		res.json({ message: "Notification deleted successfully" });
	} catch (error) {
		console.error("Error in deleteNotification controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const bulkDeleteNotifications = async (req, res) => {
	try {
		const requestedIds = Array.isArray(req.body?.ids)
			? req.body.ids
					.map((id) => String(id || "").trim())
					.filter(Boolean)
			: [];

		const deleteQuery = { recipient: req.user._id };
		if (requestedIds.length) {
			deleteQuery._id = { $in: requestedIds };
		}

		const result = await Notification.deleteMany(deleteQuery);

		res.json({
			message: requestedIds.length
				? "Selected notifications deleted successfully"
				: "All notifications deleted successfully",
			deletedCount: result.deletedCount || 0,
		});
	} catch (error) {
		console.error("Error in bulkDeleteNotifications controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
