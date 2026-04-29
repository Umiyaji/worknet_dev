import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { emitToUser, getOnlineUsers } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getPagination } from "../lib/pagination.js";

const conversationPopulate = "name username profilePicture headline";

const buildConversationSummary = (message, currentUserId) => {
	if (!message?.sender?._id || !message?.recipient?._id) {
		return null;
	}

	const isSender = message.sender._id.toString() === currentUserId.toString();
	const otherUser = isSender ? message.recipient : message.sender;

	if (!otherUser?._id) {
		return null;
	}

	return {
		_id: otherUser._id,
		user: otherUser,
		lastMessage: {
			_id: message._id,
			text: message.text,
			image: message.image,
			sender: message.sender._id,
			recipient: message.recipient._id,
			createdAt: message.createdAt,
			read: message.read,
		},
		updatedAt: message.createdAt,
		unreadCount: 0,
	};
};

const getTimestampValue = (value) => {
	if (!value) {
		return Number.NEGATIVE_INFINITY;
	}

	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

export const getConversations = async (req, res) => {
	try {
		const currentUserId = req.user._id;
		const { limit } = getPagination(req.query, { defaultLimit: 100, maxLimit: 200 });

		const recentMessages = await Message.aggregate([
			{
				$match: {
					$or: [{ sender: currentUserId }, { recipient: currentUserId }],
				},
			},
			{ $sort: { createdAt: -1 } },
			{
				$addFields: {
					otherUser: {
						$cond: [{ $eq: ["$sender", currentUserId] }, "$recipient", "$sender"],
					},
				},
			},
			{
				$group: {
					_id: "$otherUser",
					messageId: { $first: "$_id" },
				},
			},
			{ $limit: limit },
		]);

		const userWithConnections = await User.findById(currentUserId).populate(
			"connections",
			conversationPopulate
		).lean();
		const unreadCounts = await Message.aggregate([
			{
				$match: {
					recipient: currentUserId,
					read: false,
				},
			},
			{
				$group: {
					_id: "$sender",
					unreadCount: { $sum: 1 },
				},
			},
		]);
		const unreadCountMap = new Map(
			unreadCounts.map((entry) => [entry._id.toString(), entry.unreadCount])
		);

		const conversationsByUserId = new Map();

		if (recentMessages.length) {
			const messageIds = recentMessages.map((entry) => entry.messageId);
			const messages = await Message.find({ _id: { $in: messageIds } })
				.populate("sender", conversationPopulate)
				.populate("recipient", conversationPopulate)
				.sort({ createdAt: -1 })
				.lean();

			messages.forEach((message) => {
				const conversation = buildConversationSummary(message, currentUserId);
				if (!conversation) {
					return;
				}
				conversation.unreadCount = unreadCountMap.get(conversation._id.toString()) || 0;
				conversationsByUserId.set(conversation._id.toString(), conversation);
			});
		}

		for (const connection of userWithConnections?.connections || []) {
			const connectionId = connection._id.toString();
			if (!conversationsByUserId.has(connectionId)) {
				conversationsByUserId.set(connectionId, {
					_id: connection._id,
					user: connection,
					lastMessage: null,
					updatedAt: null,
					unreadCount: unreadCountMap.get(connectionId) || 0,
				});
			}
		}

		const conversations = Array.from(conversationsByUserId.values()).sort(
			(a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt)
		);

		res.json(conversations);
	} catch (error) {
		console.error("Error in getConversations controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getMessagesWithUser = async (req, res) => {
	try {
		const currentUserId = req.user._id;
		const { userId } = req.params;

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ message: "Invalid user id" });
		}

		const otherUser = await User.findById(userId).select(conversationPopulate).lean();
		if (!otherUser) {
			return res.status(404).json({ message: "User not found" });
		}

		await Message.updateMany(
			{
				sender: userId,
				recipient: currentUserId,
				read: false,
			},
			{
				$set: { read: true },
			}
		);

		const { limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });
		const messages = await Message.find({
			$or: [
				{ sender: currentUserId, recipient: userId },
				{ sender: userId, recipient: currentUserId },
			],
		})
			.populate("sender", conversationPopulate)
			.populate("recipient", conversationPopulate)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		res.json({
			user: otherUser,
			messages: messages.reverse(),
			onlineUsers: getOnlineUsers(),
		});
	} catch (error) {
		console.error("Error in getMessagesWithUser controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const sendMessage = async (req, res) => {
	try {
		const senderId = req.user._id;
		const { userId } = req.params;
		const { text = "", image } = req.body;

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ message: "Invalid recipient id" });
		}

		if (senderId.toString() === userId) {
			return res.status(400).json({ message: "You can't message yourself" });
		}

		const trimmedText = text.trim();
		if (!trimmedText && !image) {
			return res.status(400).json({ message: "Message text or image is required" });
		}

		const recipient = await User.findById(userId);
		if (!recipient) {
			return res.status(404).json({ message: "Recipient not found" });
		}

		let imageUrl = "";
		if (image) {
			const uploadResult = await cloudinary.uploader.upload(image, {
				folder: "worknet/messages",
			});
			imageUrl = uploadResult.secure_url;
		}

		const newMessage = await Message.create({
			sender: senderId,
			recipient: userId,
			text: trimmedText,
			image: imageUrl,
			read: false,
		});

		const populatedMessage = await Message.findById(newMessage._id)
			.populate("sender", conversationPopulate)
			.populate("recipient", conversationPopulate);

		emitToUser(userId, "message:new", populatedMessage);
		emitToUser(senderId, "message:new", populatedMessage);

		res.status(201).json(populatedMessage);
	} catch (error) {
		console.error("Error in sendMessage controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const deleteMessage = async (req, res) => {
	try {
		const { messageId } = req.params;
		const currentUserId = req.user._id;

		if (!mongoose.Types.ObjectId.isValid(messageId)) {
			return res.status(400).json({ message: "Invalid message id" });
		}

		const message = await Message.findById(messageId);

		if (!message) {
			return res.status(404).json({ message: "Message not found" });
		}

		if (message.sender.toString() !== currentUserId.toString()) {
			return res.status(403).json({ message: "You can only delete your own messages" });
		}

		await Message.findByIdAndDelete(messageId);

		const payload = {
			messageId,
			senderId: message.sender.toString(),
			recipientId: message.recipient.toString(),
		};

		emitToUser(message.sender, "message:deleted", payload);
		emitToUser(message.recipient, "message:deleted", payload);

		res.json({ message: "Message deleted successfully", ...payload });
	} catch (error) {
		console.error("Error in deleteMessage controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const markConversationAsRead = async (req, res) => {
	try {
		const currentUserId = req.user._id;
		const { userId } = req.params;

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ message: "Invalid user id" });
		}

		await Message.updateMany(
			{
				sender: userId,
				recipient: currentUserId,
				read: false,
			},
			{
				$set: { read: true },
			}
		);

		res.json({ message: "Conversation marked as read" });
	} catch (error) {
		console.error("Error in markConversationAsRead controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
