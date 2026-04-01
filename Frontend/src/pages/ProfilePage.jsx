import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";

import ProfileHeader from "../components/ProfileHeader";
import AboutSection from "../components/AboutSection";
import ExperienceSection from "../components/ExperienceSection";
import EducationSection from "../components/EducationSection";
import SkillsSection from "../components/SkillsSection";
import PostCard from "../components/PostCard";

import toast from "react-hot-toast";
import { Loader, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const scrollContainerRef = useRef(null);

  const { data: userProfile, isLoading: isUserProfileLoading } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const res = await axiosInstance.get(`/users/${username}`);
      return res.data;
    },
    enabled: !!username,
  });

  const { data: userPosts, isLoading: isUserPostsLoading } = useQuery({
    queryKey: ["userPosts", username],
    queryFn: async () => {
      const res = await axiosInstance.get(`/posts/user/${username}`);
      return res.data;
    },
    enabled: !!username,
  });

  const { mutate: updateProfile } = useMutation({
    mutationFn: async (updatedData) => {
      const res = await axiosInstance.put("/users/profile", updatedData);
      return res.data;
    },
    onSuccess: (updatedUser) => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["userProfile", username] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });

      if (updatedUser) {
        queryClient.setQueryData(["authUser"], (prev) => ({
          ...prev,
          ...updatedUser,
        }));
      }
    },
  });

  const { mutate: likePost } = useMutation({
    mutationFn: async (postId) => {
      await axiosInstance.post(`/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPosts", username] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to like post");
    },
  });

  const handleSave = (updatedData) => {
    updateProfile(updatedData);
  };

  const handleSharePost = async (postId) => {
    const postUrl = `${window.location.origin}/posts/${postId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this post!",
          url: postUrl,
        });
      } catch (err) {
        console.error("Share cancelled:", err);
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

  const handleCommentPost = (postId) => {
    navigate(`/posts/${postId}`);
  };

  const scrollPosts = (direction) => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 380;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isUserProfileLoading || !userProfile || !authUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  const isOwnProfile = authUser.username === userProfile.username;
  const userData = isOwnProfile ? authUser : userProfile;
  const postsToDisplay = showAllPosts ? userPosts : userPosts?.slice(0, 8);

  if (userProfile.role === "recruiter") {
    return <Navigate to={`/company/${userProfile.username}`} replace />;
  }

  return (
    <div className="max-w-4xl mx-auto pb-4">
      <div className="mb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
      <ProfileHeader
        userData={userData}
        isOwnProfile={isOwnProfile}
        onSave={handleSave}
      />
      <AboutSection
        userData={userData}
        isOwnProfile={isOwnProfile}
        onSave={handleSave}
      />
      <ExperienceSection
        userData={userData}
        isOwnProfile={isOwnProfile}
        onSave={handleSave}
      />
      <EducationSection
        userData={userData}
        isOwnProfile={isOwnProfile}
        onSave={handleSave}
      />
      <SkillsSection
        userData={userData}
        isOwnProfile={isOwnProfile}
        onSave={handleSave}
      />

      {userPosts && userPosts.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Activity</h2>
                <p className="text-sm text-gray-600">
                  {userPosts.length} posts
                </p>
              </div>
            </div>
          </div>

          {isUserPostsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-6 relative">
              {postsToDisplay?.length > 2 && (
                <button
                  onClick={() => scrollPosts("left")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-2 shadow hover:bg-gray-50"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {postsToDisplay?.length > 2 && (
                <button
                  onClick={() => scrollPosts("right")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-2 shadow hover:bg-gray-50"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-8 no-scrollbar"
              >
                {postsToDisplay &&
                  postsToDisplay.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      likePost={likePost}
                      handleCommentPost={handleCommentPost}
                      handleSharePost={handleSharePost}
                    />
                  ))}
              </div>

              {userPosts && userPosts.length > 8 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAllPosts(!showAllPosts)}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                  >
                    {showAllPosts
                      ? "Show less posts ↑"
                      : `Show all posts → (${userPosts.length} total)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
