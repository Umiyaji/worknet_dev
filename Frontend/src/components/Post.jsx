import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import {
  Briefcase,
  Calendar,
  MapPin,
  Loader,
  MessageCircle,
  MonitorSmartphone,
  Send,
  Tag,
  Share2,
  ThumbsUp,
  Trash2,
  MoreHorizontal,
  Image,
} from "lucide-react";
import PostAction from "./PostAction";
import SmartImage from "./SmartImage";

const renderContentWithMentions = (text = "", mentions = []) => {
  const lines = String(text).split("\n");
  const mentionSet = new Set(
    (Array.isArray(mentions) ? mentions : [])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const tokenizeRegex = /(^|\s)(@?[a-zA-Z0-9_]{2,30})(?=\b)/g;

  return lines.map((line, lineIndex) => {
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenizeRegex.exec(line)) !== null) {
      const prefix = match[1] || "";
      const token = match[2] || "";
      const tokenStart = match.index + prefix.length;
      const tokenEnd = tokenStart + token.length;
      const username = token.replace(/^@/, "").toLowerCase();

      if (tokenStart > lastIndex) {
        segments.push(line.slice(lastIndex, tokenStart));
      }

      if (mentionSet.has(username)) {
        segments.push(
          <Link
            key={`mention-${lineIndex}-${tokenStart}`}
            to={`/profile/${username}`}
            className="font-medium text-blue-700 hover:underline"
          >
            {token.replace(/^@/, "")}
          </Link>,
        );
      } else {
        segments.push(token);
      }

      lastIndex = tokenEnd;
    }

    if (lastIndex < line.length) {
      segments.push(line.slice(lastIndex));
    }

    return (
      <span key={`line-${lineIndex}`}>
        {segments.map((part, partIndex) => (
          <span key={`part-${lineIndex}-${partIndex}`}>{part}</span>
        ))}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
};

const Post = ({ post }) => {
  const { postId } = useParams();
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);

  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(post?.comments || []);

  const [showMenu, setShowMenu] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(post?.content ?? "");
  const [editedImage, setEditedImage] = useState(post?.image ?? null);
  const [imagePreview, setImagePreview] = useState(post?.image ?? null);

  const [expandedContent, setExpandedContent] = useState(false);
  const maxLength = 200;
  const isLongContent = post?.content && post.content.length > maxLength;
  const displayedContent =
    expandedContent || !isLongContent
      ? post?.content
      : post?.content.slice(0, maxLength);
  const mediaItems = Array.isArray(post?.media) && post.media.length ? post.media : [];
  const isJobPost = post?.postType === "job" && post?.jobDetails;
  const authorName =
    post?.author?.name || (isJobPost ? post?.jobDetails?.companyName : "") || "Worknet member";
  const authorUsername = post?.author?.username || "";
  const hasAuthorProfile = Boolean(authorUsername);
  const formattedDeadline =
    isJobPost && post.jobDetails.lastDateToApply
      ? new Date(post.jobDetails.lastDateToApply).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  // guard authUser and post.author
  const isOwner =
    authUser?._id && post?.author?._id && authUser._id === post.author._id;
  const canViewExactTargeting = authUser?.role === "recruiter" || isOwner;
  const isLiked =
    Array.isArray(post?.likes) && authUser?._id
      ? post.likes.includes(authUser._id)
      : false;

  const commentSectionRef = useRef(null);
  const commentButtonRef = useRef(null);
  const menuRef = useRef(null);
  const modalRef = useRef(null);

  // Delete Post
  const { mutate: deletePost, isLoading: isDeletingPost } = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(`/posts/delete/${post._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      toast.success("Post deleted successfully");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to delete post",
      );
    },
  });

  // Update Post
  const { mutate: updatePost, isLoading: isUpdating } = useMutation({
    mutationFn: async () => {
      const postData = { content: editedContent };
      if (editedImage && typeof editedImage !== "string") {
        postData.image = await readFileAsDataURL(editedImage);
      }
      await axiosInstance.put(`/posts/update/${post._id}`, postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["post", postId]);
      toast.success("Post updated successfully");
      setIsEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update post");
    },
  });

  // Like Post
  const { mutate: likePost, isLoading: isLikingPost } = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(`/posts/${post._id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["post", postId]);
    },
  });

  // Create Comment (with optimistic update)
  const { mutate: createComment, isLoading: isAddingComment } = useMutation({
    mutationFn: async (commentContent) => {
      const response = await axiosInstance.post(`/posts/${post._id}/comment`, {
        content: commentContent,
      });
      return response.data.comment;
    },
    onMutate: async (newCommentContent) => {
      await queryClient.cancelQueries(["posts"]);

      const tempId = `temp-${Date.now()}`;
      const tempComment = {
        _id: tempId,
        content: newCommentContent,
        user: {
          _id: authUser?._id,
          name: authUser?.name,
          profilePicture: authUser?.profilePicture,
        },
        createdAt: new Date().toISOString(),
      };

      setComments((prev) => [...prev, tempComment]);
      setNewComment("");
      return { tempId };
    },
    onSuccess: (serverComment, _, context) => {
      setComments((prev) =>
        prev.map((c) => (c._id === context.tempId ? serverComment : c)),
      );
      toast.success("Comment added successfully");
      queryClient.invalidateQueries(["posts"]);
    },
    onError: (err, _, context) => {
      setComments((prev) => prev.filter((c) => c._id !== context.tempId));
      toast.error(err?.response?.data?.message || "Failed to add comment");
    },
  });

  // Delete Comment
  const { mutate: deleteComment, isLoading: isDeletingComment } = useMutation({
    mutationFn: async (commentId) => {
      await axiosInstance.delete(`/posts/${post._id}/comments/${commentId}`);
    },
    onSuccess: (_, commentId) => {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success("Comment deleted");
      queryClient.invalidateQueries(["posts"]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete comment");
    },
  });

  // Close menu when click outside
  useEffect(() => {
    const handleClickOutsideMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideMenu);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, []);

  // Close comments when click outside
  useEffect(() => {
    const handleClickOutsideComments = (e) => {
      const clickedOutsideSection =
        commentSectionRef.current &&
        !commentSectionRef.current.contains(e.target);
      const clickedOutsideButton =
        commentButtonRef.current &&
        !commentButtonRef.current.contains(e.target);

      if (showComments && clickedOutsideSection && clickedOutsideButton) {
        setShowComments(false);
      }
    };

    if (showComments) {
      document.addEventListener("mousedown", handleClickOutsideComments);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideComments);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideComments);
    };
  }, [showComments]);

  // Close modal when click outside
  useEffect(() => {
    const handleClickOutsideModal = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsEditModalOpen(false);
      }
    };
    if (isEditModalOpen) {
      document.addEventListener("mousedown", handleClickOutsideModal);
    }
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideModal);
  }, [isEditModalOpen]);

  // Sync comments when post prop changes (optional)
  useEffect(() => {
    setComments(post?.comments || []);
  }, [post?.comments]);

  // Handlers
  const handleDeletePost = () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    deletePost();
  };

  const handleLikePost = () => {
    if (isLikingPost) return;
    likePost();
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    createComment(content);
  };

  const handleSharePost = async () => {
    const postUrl = `${window.location.origin}/posts/${post._id}`;
    await axiosInstance.post(`/posts/${post._id}/share`).catch(() => null);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Check out this post!", url: postUrl });
      } catch (err) {
        console.error("Share cancelled or failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        toast.success("Link copied to clipboard!");
      } catch {
        toast.error("Share not supported in this browser");
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setEditedImage(null);
      setImagePreview(null);
      return;
    }
    setEditedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.onerror = () => {
      setImagePreview(null);
      toast.error("Failed to read image");
    };
    reader.readAsDataURL(file);
  };

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  if (isDeletingPost) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black/30 z-50">
        <Loader size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-secondary rounded-lg shadow mb-2 md:mb-4 lg:mb-4">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {hasAuthorProfile ? (
              <Link to={`/profile/${authorUsername}`}>
                <SmartImage
                  src={post?.author?.profilePicture || "/avatar.png"}
                  alt={authorName}
                  className="size-14 rounded-full mr-3"
                />
              </Link>
            ) : (
              <SmartImage
                src={post?.author?.profilePicture || "/avatar.png"}
                alt={authorName}
                className="size-14 rounded-full mr-3"
              />
            )}
            <div>
              {hasAuthorProfile ? (
                <Link to={`/profile/${authorUsername}`}>
                  <h3 className="font-semibold">{authorName}</h3>
                </Link>
              ) : (
                <h3 className="font-semibold">{authorName}</h3>
              )}
              <p className="text-xs text-info truncate max-w-[200px] md:max-w-[250px] lg:max-w-[350px]">
                {post?.author?.headline || ""}
              </p>
              <p className="text-xs text-info">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {isOwner && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"
              >
                <MoreHorizontal size={18} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg shadow-gray-300 z-10">
                  <button
                    onClick={() => {
                      setIsEditModalOpen(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      handleDeletePost();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-200 flex items-center justify-between"
                    disabled={isDeletingPost}
                  >
                    <span>Delete</span>
                    {isDeletingPost && (
                      <Loader size={16} className="animate-spin" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post content */}
        <div className="mb-4">
          {isJobPost && (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                    <Briefcase size={14} className="mr-1.5" />
                    Job Opening
                  </div>
                  {post.jobDetails.visibilityType === "targeted" ? (
                    <div className="mb-2 ml-2 inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                      Targeted Hiring
                    </div>
                  ) : null}
                  <h4 className="text-lg font-semibold text-slate-900">
                    {post.jobDetails.role}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {post.jobDetails.companyName}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-blue-100">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Openings
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {post.jobDetails.totalOpenings}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200">
                  <MonitorSmartphone size={16} className="text-blue-600" />
                  <span>{post.jobDetails.workMode}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200">
                  <MapPin size={16} className="text-blue-600" />
                  <span>{post.jobDetails.officeLocation}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200">
                  <Briefcase size={16} className="text-blue-600" />
                  <span>{post.jobDetails.experienceRequired}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200">
                  <Calendar size={16} className="text-blue-600" />
                  <span>Apply by {formattedDeadline}</span>
                </div>
              </div>

              {post.jobDetails.skillsRequired?.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Tag size={16} className="text-blue-600" />
                    <span>Skills required</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.jobDetails.skillsRequired.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {post.jobDetails.visibilityType === "targeted" ? (
                <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700 ring-1 ring-indigo-100">
                  <p className="font-semibold">Targeted Hiring</p>
                  {canViewExactTargeting ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(post.jobDetails.targetColleges || []).map((college) => (
                        <span
                          key={`post-college-${college}`}
                          className="rounded-full bg-white px-2 py-1"
                        >
                          College: {college}
                        </span>
                      ))}
                      {(post.jobDetails.targetCities || []).map((city) => (
                        <span
                          key={`post-city-${city}`}
                          className="rounded-full bg-white px-2 py-1"
                        >
                          City: {city}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs leading-5">
                      This opening is part of a targeted hiring campaign.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <p className="text-base text-gray-800 mb-1">
            {renderContentWithMentions(displayedContent, post?.mentions)}
            {isLongContent && !expandedContent && (
              <span
                onClick={() => setExpandedContent(true)}
                className="text-gray-500 text-sm hover:text-blue-800 cursor-pointer hover:underline"
              >
                .... more
              </span>
            )}
            {expandedContent && (
              <span
                onClick={() => setExpandedContent(false)}
                className="text-gray-500 text-sm hover:text-blue-800 cursor-pointer hover:underline"
              >
                .... less
              </span>
            )}
          </p>
          {(post?.mentions?.length || post?.hashtags?.length || (isOwner && post?.editHistory?.length)) ? (
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {(post.mentions || []).map((mention) => (
                <Link
                  key={`mention-${mention}`}
                  to={`/profile/${mention}`}
                  className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100 hover:underline"
                >
                  {mention}
                </Link>
              ))}
              {(post.hashtags || []).map((tag) => (
                <span key={`tag-${tag}`} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                  #{tag}
                </span>
              ))}
              {isOwner && post.editHistory?.length ? (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                  Edited {post.editHistory.length} time(s)
                </span>
              ) : null}
            </div>
          ) : null}

          {mediaItems.length > 1 ? (
            <div className="mb-4 flex snap-x gap-3 overflow-x-auto">
              {mediaItems.map((media, index) => (
                <div key={`media-${index}`} className="w-full min-w-[280px] max-w-[560px] snap-start overflow-hidden rounded-lg">
                  <img
                    src={media.url}
                    alt={`Post media ${index + 1}`}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : post.image ? (
            <div className="w-full max-h-[500px] overflow-hidden rounded-lg mb-4">
              <img
                src={post.image}
                alt="Post content"
                className="w-full h-auto object-cover transition-transform duration-200 hover:scale-105"
              />
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex justify-between text-info">
          <PostAction
            icon={
              <ThumbsUp
                size={18}
                className={isLiked ? "text-blue-500 fill-blue-300" : ""}
              />
            }
            text={`Like (${post?.likes?.length || 0})`}
            onClick={handleLikePost}
          />

          <div ref={commentButtonRef}>
            <PostAction
              icon={<MessageCircle size={18} />}
              text={`Comment (${comments.length})`}
              onClick={() => setShowComments(!showComments)}
            />
          </div>

          {/* <button
						ref={commentButtonRef}
						type="button"
						onClick={() => setShowComments(!showComments)}
						className="inline-flex items-center focus:outline-none"
					>
						<PostAction
							icon={<MessageCircle size={18} />}
							text={`Comment (${comments.length})`}
						/>
					</button> */}

          {/* <PostAction
						icon={<MessageCircle size={18} />}
						text={`Comment (${comments.length})`}
						onClick={() => setShowComments(!showComments)}
					/> */}

          <PostAction
            icon={<Share2 size={18} />}
            text="Share"
            onClick={handleSharePost}
          />
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div ref={commentSectionRef} className="px-4 pb-4">
          <div className="mb-4 max-h-60 overflow-y-auto">
            {comments.map((comment, index) => (
              <div
                key={
                  comment._id ||
                  `${comment.user._id}-${comment.createdAt}-${index}`
                }
                className="mb-2 bg-base-100 p-2 rounded flex items-start"
              >
                <SmartImage
                  src={comment.user.profilePicture || "/avatar.png"}
                  alt={comment.user.name}
                  className="w-8 h-8 rounded-full mr-2 flex-shrink-0"
                />
                <div className="flex-grow">
                  <div className="flex items-center mb-1">
                    <span className="font-semibold mr-2">
                      {comment.user.name}
                    </span>
                    <span className="text-xs text-info">
                      {formatDistanceToNow(new Date(comment.createdAt))}
                    </span>
                  </div>
                  <p>{comment.content}</p>
                </div>

                {/* Delete comment */}
                {authUser?._id === comment.user._id && (
                  <button
                    onClick={() => deleteComment(comment._id)}
                    className="text-red-500 hover:text-red-700 cursor-pointer pt-1 pr-1"
                    disabled={isDeletingComment}
                  >
                    {isDeletingComment ? (
                      <Loader size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddComment} className="flex items-center">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-grow p-2 pl-4 rounded-l-full bg-base-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <button
              type="submit"
              className="bg-primary text-white p-2 rounded-r-full hover:bg-primary-dark transition duration-300 cursor-pointer"
              disabled={isAddingComment}
            >
              {isAddingComment ? (
                <Loader size={22} className="animate-spin" />
              ) : (
                <Send size={22} />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-secondary rounded-lg w-full max-w-[700px] max-h-[600px] p-6 relative"
          >
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-2 right-2 text-black text-[20px] p-1 rounded-full h-10 w-10 hover:bg-gray-200 cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4">Edit Post</h2>

            <textarea
              className="w-full p-3 rounded-lg bg-base-100 hover:bg-base-200 focus:outline-none resize-none mb-2"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={8}
            />

            {imagePreview && (
              <div className="w-25 md:w-30 overflow-hidden rounded-lg mb-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full object-cover"
                />
              </div>
            )}

            <div className="flex justify-end items-center space-x-3 my-4">
              <label className="flex items-center text-info hover:text-info-dark cursor-pointer p-2 bg-gray-200 hover:bg-gray-300 rounded">
                <Image size={20} className="mr-1" />
                <span>Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>

              <button
                onClick={() => updatePost()}
                className=" px-4 py-2 text-base rounded bg-primary text-white hover:bg-primary-dark"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;
