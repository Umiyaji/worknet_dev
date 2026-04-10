import Card from "@mui/material/Card";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import React, { useMemo, useRef, useState } from "react";
import Conversation from "../components/Conversation";
import ImageIcon from "@mui/icons-material/Image";
import SendIcon from "@mui/icons-material/Send";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { connectSocket } from "../lib/socket";

const fallbackAvatar = "https://i.sstatic.net/CpC9A.png";

const getSafeRelativeTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDistanceToNow(date, { addSuffix: true });
};

const getMessageList = (payload) =>
  Array.isArray(payload?.messages) ? payload.messages : [];

const getConversationList = (payload) => (Array.isArray(payload) ? payload : []);

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Messages = () => {
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const fileInputRef = useRef(null);
  const activeUserIdRef = useRef(null);

  const { data: conversationsData = [], isLoading: isConversationsLoading } =
    useQuery({
      queryKey: ["conversations"],
      queryFn: async () => {
        const res = await axiosInstance.get("/messages/conversations");
        return res.data;
      },
    });

  const conversations = getConversationList(conversationsData);

  const filteredConversations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const name = conversation.user?.name?.toLowerCase() || "";
      const username = conversation.user?.username?.toLowerCase() || "";
      const text = conversation.lastMessage?.text?.toLowerCase() || "";

      return (
        name.includes(normalized) ||
        username.includes(normalized) ||
        text.includes(normalized)
      );
    });
  }, [conversations, searchTerm]);

  const activeUserId =
    selectedUserId ||
    filteredConversations[0]?.user?._id ||
    conversations[0]?.user?._id ||
    null;

  React.useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  React.useEffect(() => {
    if (!selectedUserId && conversations[0]?.user?._id) {
      setSelectedUserId(conversations[0].user._id);
    }
  }, [conversations, selectedUserId]);

  const { data: activeConversation, isLoading: isMessagesLoading } = useQuery({
    queryKey: ["messages", activeUserId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/messages/${activeUserId}`);
      return res.data;
    },
    enabled: Boolean(activeUserId),
  });

  const { mutate: markConversationRead } = useMutation({
    mutationFn: async (userId) => {
      if (!userId) {
        return null;
      }

      const res = await axiosInstance.put(`/messages/read/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, payload }) => {
      const res = await axiosInstance.post(`/messages/${userId}`, payload);
      return res.data;
    },
    onSuccess: (message) => {
      setMessageText("");
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      queryClient.setQueryData(["messages", activeUserId], (previous) => {
        if (!previous) {
          return previous;
        }

        const previousMessages = getMessageList(previous);
        const alreadyExists = previousMessages.some(
          (existingMessage) => existingMessage._id === message._id,
        );

        if (alreadyExists) {
          return previous;
        }

        return {
          ...previous,
          messages: [...previousMessages, message],
        };
      });

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send message");
    },
  });

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      return;
    }

    try {
      const imageData = await readFileAsDataUrl(file);
      setSelectedImage({
        name: file.name,
        preview: imageData,
        data: imageData,
      });
    } catch {
      toast.error("Failed to read image");
    }
  };

  const handleSendMessage = () => {
    if (!activeUserId) {
      toast.error("Select a conversation first");
      return;
    }

    if (!messageText.trim() && !selectedImage?.data) {
      return;
    }

    sendMessageMutation.mutate({
      userId: activeUserId,
      payload: {
        text: messageText,
        image: selectedImage?.data,
      },
    });
  };

  const activeUser = activeConversation?.user;
  const messages = getMessageList(activeConversation);
  const isActiveUserOnline = activeUser?._id
    ? onlineUsers.includes(activeUser._id)
    : false;

  React.useEffect(() => {
    if (!authUser?._id) {
      return undefined;
    }

    const socket = connectSocket();

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleIncomingMessage = (message) => {
      const senderId = message.sender?._id || message.sender;
      const recipientId = message.recipient?._id || message.recipient;
      const belongsToCurrentUser =
        senderId === authUser._id || recipientId === authUser._id;

      if (!belongsToCurrentUser) {
        return;
      }

      const otherUserId = senderId === authUser._id ? recipientId : senderId;

      queryClient.setQueryData(["messages", otherUserId], (previous) => {
        if (!previous) {
          if (otherUserId !== activeUserIdRef.current) {
            return previous;
          }

          return {
            user:
              senderId === authUser._id ? message.recipient : message.sender,
            messages: [message],
            onlineUsers: [],
          };
        }

        const previousMessages = getMessageList(previous);
        const alreadyExists = previousMessages.some(
          (existingMessage) => existingMessage._id === message._id,
        );

        if (alreadyExists) {
          return previous;
        }

        return {
          ...previous,
          messages: [...previousMessages, message],
        };
      });

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (
        otherUserId === activeUserIdRef.current &&
        senderId !== authUser._id
      ) {
        markConversationRead(otherUserId);
      }
    };

    const handleDeletedMessage = ({ messageId, senderId, recipientId }) => {
      const otherUserId = senderId === authUser._id ? recipientId : senderId;

      queryClient.setQueryData(["messages", otherUserId], (previous) => {
        if (!previous) {
          return previous;
        }

        const previousMessages = getMessageList(previous);

        return {
          ...previous,
          messages: previousMessages.filter(
            (message) => message._id !== messageId,
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("users:online", handleOnlineUsers);
    socket.on("message:new", handleIncomingMessage);
    socket.on("message:deleted", handleDeletedMessage);

    return () => {
      socket.off("users:online", handleOnlineUsers);
      socket.off("message:new", handleIncomingMessage);
      socket.off("message:deleted", handleDeletedMessage);
    };
  }, [authUser?._id, markConversationRead, queryClient]);

  React.useEffect(() => {
    if (activeConversation?.onlineUsers) {
      setOnlineUsers(activeConversation.onlineUsers);
    }
  }, [activeConversation]);

  React.useEffect(() => {
    if (activeUserId) {
      markConversationRead(activeUserId);
    }
  }, [activeUserId, markConversationRead]);

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      const res = await axiosInstance.delete(`/messages/message/${messageId}`);
      return res.data;
    },
    onSuccess: ({ messageId }) => {
      queryClient.setQueryData(["messages", activeUserId], (previous) => {
        if (!previous) {
          return previous;
        }

        const previousMessages = getMessageList(previous);

        return {
          ...previous,
          messages: previousMessages.filter(
            (message) => message._id !== messageId,
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Message deleted");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete message");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 px-4 md:px-8 xl:px-20 py-8">
      <div className="max-w-7xl mx-auto">
        <Card className="rounded-3xl shadow-xl border border-gray-200 overflow-hidden !bg-white">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Messaging</h1>
              <p className="text-sm text-gray-500">
                Stay connected with your conversations
              </p>
            </div>

            <div className="mt-3 md:mt-0">
              <button className="flex items-center gap-1 px-4 py-2 rounded-full bg-green-700 hover:bg-green-800 text-white text-sm font-medium transition-all shadow-sm">
                Focused <ArrowDropDownIcon fontSize="small" />
              </button>
            </div>
          </div>

          {/* Main Section */}
          <div className="flex flex-col md:flex-row h-[760px]">
            {/* Left Sidebar */}
            <div className="w-full md:w-[34%] border-r border-gray-200 bg-gray-50">
              <div className="px-5 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="h-[calc(100%-73px)] overflow-y-auto px-2 py-2">
                {isConversationsLoading ? (
                  <div className="px-4 py-6 text-sm text-gray-500">
                    Loading conversations...
                  </div>
                ) : filteredConversations.length ? (
                  filteredConversations.map((conversation) => (
                    <div key={conversation._id} className="mb-2">
                      <Conversation
                        conversation={conversation}
                        isActive={conversation.user?._id === activeUserId}
                        onClick={() =>
                          setSelectedUserId(conversation.user?._id)
                        }
                      />
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-gray-500">
                    No conversations yet. Connect with someone and send your
                    first message.
                  </div>
                )}
              </div>
            </div>

            {/* Chat Section */}
            <div className="w-full md:w-[66%] flex flex-col bg-white">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <img
                    className="w-12 h-12 rounded-full object-cover"
                    src={activeUser?.profilePicture || fallbackAvatar}
                    alt={activeUser?.name || "Profile"}
                  />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {activeUser?.name || "Select a conversation"}
                    </p>
                    <p className="text-sm text-green-600">
                      {activeUser
                        ? isActiveUserOnline
                          ? "Online"
                          : activeUser.headline || "Offline"
                        : "Your messages will appear here"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 bg-gradient-to-b from-white to-gray-50 space-y-5">
                {!activeUserId ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Pick a conversation from the left to start messaging.
                  </div>
                ) : isMessagesLoading ? (
                  <div className="text-sm text-gray-500">
                    Loading messages...
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <img
                        className="rounded-full w-20 h-20 object-cover shadow-md"
                        src={activeUser?.profilePicture || fallbackAvatar}
                        alt={activeUser?.name || "Profile"}
                      />
                      <div className="mt-3">
                        <p className="font-semibold text-lg text-gray-800">
                          {activeUser?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activeUser?.headline ||
                            `@${activeUser?.username || ""}`}
                        </p>
                      </div>
                    </div>

                    {messages.length ? (
                      messages.map((message) => {
                        const isOwnMessage =
                          message.sender?._id === authUser?._id ||
                          message.sender === authUser?._id;

                        return isOwnMessage ? (
                          <div key={message._id} className="flex justify-end">
                            <div className="max-w-[75%] group">
                              {message.text ? (
                                <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                                  <p className="text-sm whitespace-pre-wrap">
                                    {message.text}
                                  </p>
                                </div>
                              ) : null}
                              {message.image ? (
                                <div className="mt-3">
                                  <img
                                    className="w-[260px] max-w-full rounded-2xl object-cover shadow-md border border-gray-200"
                                    src={message.image}
                                    alt="Attachment"
                                  />
                                </div>
                              ) : null}
                              <p className="text-xs text-gray-400 mt-1 text-right">
                                {getSafeRelativeTime(message.createdAt)}
                              </p>
                              <div className="mt-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteMessageMutation.mutate(message._id)
                                  }
                                  disabled={deleteMessageMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={message._id}
                            className="flex items-start gap-3"
                          >
                            <img
                              className="w-10 h-10 rounded-full object-cover"
                              src={activeUser?.profilePicture || fallbackAvatar}
                              alt={activeUser?.name || "Profile"}
                            />
                            <div className="max-w-[75%]">
                              <p className="text-sm font-medium text-gray-700 mb-1">
                                {activeUser?.name}
                              </p>
                              {message.text ? (
                                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {message.text}
                                  </p>
                                </div>
                              ) : null}
                              {message.image ? (
                                <div className="mt-3">
                                  <img
                                    className="w-[260px] max-w-full rounded-2xl object-cover shadow-md border border-gray-200"
                                    src={message.image}
                                    alt="Attachment"
                                  />
                                </div>
                              ) : null}
                              <p className="text-xs text-gray-400 mt-1">
                                {getSafeRelativeTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-sm text-gray-500">
                        No messages yet. Say hello to start the conversation.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-white px-4 py-4">
                {selectedImage ? (
                  <div className="mb-3 flex items-center justify-between rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-600">
                    <span className="truncate pr-3">{selectedImage.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
                <div className="flex items-end gap-3">
                  <label
                    htmlFor="messageImage"
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer transition"
                  >
                    <ImageIcon className="text-gray-600" />
                  </label>
                  <input
                    id="messageImage"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />

                  <textarea
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white transition"
                    placeholder="Type a message..."
                  />

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || !activeUserId}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium shadow-md transition"
                  >
                    <SendIcon fontSize="small" />
                    {sendMessageMutation.isPending ? "Sending" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Messages;
