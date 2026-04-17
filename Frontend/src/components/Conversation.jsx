import { formatDistanceToNow } from "date-fns";
import SmartImage from "./SmartImage";

const fallbackAvatar = "/avatar.png";

const getRelativeTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDistanceToNow(date, { addSuffix: true });
};

const Conversation = ({ conversation, isActive, onClick }) => {
  const lastMessage = conversation?.lastMessage;
  const preview = lastMessage?.text || (lastMessage?.image ? "Sent an image" : "Start the conversation");
  const conversationTime = lastMessage?.createdAt
    ? getRelativeTime(lastMessage.createdAt)
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition ${
        isActive ? "bg-green-50 border border-green-200 shadow-sm" : "hover:bg-white"
      }`}
    >
      <div className="shrink-0">
        <SmartImage
          className="h-12 w-12 rounded-full object-cover"
          src={conversation?.user?.profilePicture || fallbackAvatar}
          alt={conversation?.user?.name || "Profile"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-semibold text-gray-800">
            {conversation?.user?.name}
          </p>
          <span className="shrink-0 text-xs text-gray-400">
            {conversationTime}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-gray-500">{preview}</p>
          {conversation?.unreadCount > 0 ? (
            <span className="shrink-0 rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
              {conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
};

export default Conversation;
