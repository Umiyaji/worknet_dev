import { useRef, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import ProfileHeader from "../components/ProfileHeader";
import AboutSection from "../components/AboutSection";
import ExperienceSection from "../components/ExperienceSection";
import EducationSection from "../components/EducationSection";
import SkillsSection from "../components/SkillsSection";
import PostCard from "../components/PostCard";
import ProfileCompletenessCard from "../components/ProfileCompletenessCard";

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
      queryClient.invalidateQueries({ queryKey: ["targetLists"] });

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

  const goToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isUserProfileLoading || !userProfile || !authUser) {
    return (
      <div className="flex h-screen items-center justify-center">
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
    <div className="mx-auto max-w-4xl pb-4">
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

      <div id="profile-header">
        <ProfileHeader
          userData={userData}
          isOwnProfile={isOwnProfile}
          onSave={handleSave}
        />
      </div>

      {isOwnProfile ? (
        <ProfileCompletenessCard userData={userData} onGoToSection={goToSection} />
      ) : null}

      <div id="profile-about">
        <AboutSection
          userData={userData}
          isOwnProfile={isOwnProfile}
          onSave={handleSave}
        />
      </div>
      <div id="profile-experience">
        <ExperienceSection
          userData={userData}
          isOwnProfile={isOwnProfile}
          onSave={handleSave}
        />
      </div>
      <div id="profile-education">
        <EducationSection
          userData={userData}
          isOwnProfile={isOwnProfile}
          onSave={handleSave}
        />
      </div>
      <div id="profile-skills">
        <SkillsSection
          userData={userData}
          isOwnProfile={isOwnProfile}
          onSave={handleSave}
        />
      </div>

      {userPosts && userPosts.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_30%),linear-gradient(180deg,_#ffffff,_#f8fbff)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Activity
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  Recent posts and profile momentum
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {userPosts.length} posts
                </p>
              </div>
            </div>
          </div>

          {isUserPostsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="relative p-6">
              {postsToDisplay?.length > 2 ? (
                <button
                  onClick={() => scrollPosts("left")}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-2 shadow hover:bg-gray-50"
                >
                  <ChevronLeft size={20} />
                </button>
              ) : null}

              {postsToDisplay?.length > 2 ? (
                <button
                  onClick={() => scrollPosts("right")}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-2 shadow hover:bg-gray-50"
                >
                  <ChevronRight size={20} />
                </button>
              ) : null}

              <div
                ref={scrollContainerRef}
                className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth px-8 pb-2"
              >
                {postsToDisplay?.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    likePost={likePost}
                    handleCommentPost={handleCommentPost}
                    handleSharePost={handleSharePost}
                  />
                ))}
              </div>

              {userPosts.length > 8 ? (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAllPosts(!showAllPosts)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {showAllPosts
                      ? "Show less posts"
                      : `Show all posts (${userPosts.length} total)`}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ProfilePage;
