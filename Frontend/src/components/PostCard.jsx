import { useState } from "react";
import { ThumbsUp, MessageCircle, Share2 } from "lucide-react";
import SmartImage from "./SmartImage";

const PostCard = ({ post, likePost, handleCommentPost, handleSharePost }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const content = post?.content || "";
  const shouldShowToggle = content.length > 120;
  const displayedText =
    isExpanded || !shouldShowToggle ? content : `${content.slice(0, 120)}...`;

  return (
    <div className="min-w-[340px] max-w-[340px] border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 bg-white flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <SmartImage
              src={post.author.profilePicture || "/avatar.png"}
              alt={post.author.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {post.author.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {post.author.headline || ""}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {displayedText}
          {shouldShowToggle && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-1 text-gray-500 hover:text-gray-700 font-medium"
            >
              {isExpanded ? "less" : "more"}
            </button>
          )}
        </p>
      </div>

      {post.image && (
        <div className="px-4 py-2">
          <img
            src={post.image}
            alt="Post"
            className="w-full h-56 object-cover rounded-lg"
          />
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ThumbsUp size={16} /> {post.likes?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={16} /> {post.comments?.length || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-around text-gray-600 border-t border-gray-100 pt-3">
          <button
            onClick={() => likePost(post._id)}
            className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded text-sm transition-colors"
          >
            <ThumbsUp size={16} />
            Like
          </button>
          <button
            onClick={() => handleCommentPost(post._id)}
            className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded text-sm transition-colors"
          >
            <MessageCircle size={16} />
            Comment
          </button>
          <button
            onClick={() => handleSharePost(post._id)}
            className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded text-sm transition-colors"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
