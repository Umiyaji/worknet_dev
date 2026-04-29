import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

let io;
const onlineUsers = new Map();

const parseCookies = (cookieHeader = "") =>
	cookieHeader.split(";").reduce((cookies, part) => {
		const [rawName, ...rawValue] = part.trim().split("=");
		if (!rawName) {
			return cookies;
		}

		cookies[rawName] = decodeURIComponent(rawValue.join("=") || "");
		return cookies;
	}, {});

const emitOnlineUsers = () => {
	if (!io) {
		return;
	}

	io.volatile.emit("users:online", Array.from(onlineUsers.keys()));
};

export const createSocketServer = (app) => {
	const server = http.createServer(app);

	io = new Server(server, {
		cors: {
			origin: process.env.CLIENT_URL,
			credentials: true,
		},
		connectionStateRecovery: {
			maxDisconnectionDuration: Number(process.env.SOCKET_RECOVERY_MS || 120000),
			skipMiddlewares: false,
		},
		maxHttpBufferSize: Number(process.env.SOCKET_MAX_BUFFER_BYTES || 1_000_000),
		pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS || 25000),
		pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT_MS || 20000),
	});

	io.use(async (socket, next) => {
		try {
			const cookies = parseCookies(socket.handshake.headers.cookie);
			const token = cookies["jwt-linkedin"];

			if (!token) {
				return next(new Error("Unauthorized"));
			}

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			const user = await User.findById(decoded.userId).select("-password").lean();

			if (!user) {
				return next(new Error("Unauthorized"));
			}

			socket.user = user;
			next();
		} catch (error) {
			next(new Error("Unauthorized"));
		}
	});

	io.on("connection", (socket) => {
		const userId = socket.user._id.toString();
		socket.data.currentPage = "";

		socket.join(`user:${userId}`);

		const sockets = onlineUsers.get(userId) || new Set();
		sockets.add(socket.id);
		onlineUsers.set(userId, sockets);
		emitOnlineUsers();

		socket.on("page:view", (page) => {
			socket.data.currentPage = typeof page === "string" ? page : "";
		});

		socket.on("disconnect", () => {
			const activeSockets = onlineUsers.get(userId);

			if (!activeSockets) {
				return;
			}

			activeSockets.delete(socket.id);
			if (!activeSockets.size) {
				onlineUsers.delete(userId);
			}

			emitOnlineUsers();
		});
	});

	return server;
};

export const emitToUser = (userId, event, payload) => {
	if (!io) {
		return;
	}

	io.to(`user:${userId.toString()}`).emit(event, payload);
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());

export const isUserViewingMessagesPage = (userId) => {
	const userSocketIds = onlineUsers.get(userId.toString());

	if (!userSocketIds?.size || !io) {
		return false;
	}

	for (const socketId of userSocketIds) {
		const socket = io.sockets.sockets.get(socketId);
		if (socket?.data?.currentPage?.startsWith("/messages")) {
			return true;
		}
	}

	return false;
};
