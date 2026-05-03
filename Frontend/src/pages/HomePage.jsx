import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Loader,
  Sparkles,
  Users,
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import PostCreation from "../components/PostCreation";
import Post from "../components/Post";
import RecommendedUser from "../components/RecommendedUser";

const HomePage = () => {
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);

  const { data: recommendedUsersData, isLoading: recommendedLoading } = useQuery({
    queryKey: ["recommendedUsers"],
    queryFn: () =>
      axiosInstance.get("/users/suggestions?limit=4").then((res) => res.data),
  });

  const recommendedUsers = useMemo(() => {
    if (Array.isArray(recommendedUsersData)) return recommendedUsersData;
    if (recommendedUsersData?.users && Array.isArray(recommendedUsersData.users)) return recommendedUsersData.users;
    return [];
  }, [recommendedUsersData]);

  const { data: feedStatsData, isLoading: feedStatsLoading } = useQuery({
    queryKey: ["feedStats"],
    queryFn: () =>
      axiosInstance.get("/lookups/feed-stats").then((res) => res.data),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await axiosInstance.get("/posts");
      return res.data;
    },
  });
  const { data: myAnalytics } = useQuery({
    queryKey: ["myAnalytics"],
    queryFn: async () => {
      const res = await axiosInstance.get("/users/analytics/me");
      return res.data;
    },
  });

  const feedStats = useMemo(
    () => ({
      posts: feedStatsData?.postsCount ?? posts?.length ?? 0,
      people: feedStatsData?.peopleCount ?? recommendedUsers?.length ?? 0,
      hasMomentum: Boolean(
        (feedStatsData?.postsCount ?? posts?.length ?? 0) +
        (feedStatsData?.peopleCount ?? recommendedUsers?.length ?? 0),
      ),
    }),
    [posts, recommendedUsers, feedStatsData],
  );

  if (postsLoading || recommendedLoading || feedStatsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-4 lg:gap-6">
      <div className="sticky top-[78px] hidden h-[calc(100vh-110px)] overflow-y-auto md:col-span-1 md:block lg:col-span-1">
        <Sidebar user={authUser} />
      </div>

      <div className="order-first space-y-5 md:order-none md:col-span-2 lg:col-span-2">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(17,94,89,0.92)_55%,_rgba(14,165,233,0.82))] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 backdrop-blur">
                <Sparkles size={14} />
                Professional momentum
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Build visibility, discover openings, and keep your network
                moving.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 md:text-base">
                Your feed should feel alive, relevant, and career-focused. Share
                updates, spot opportunities faster, and stay close to the people
                who matter.
              </p>
            </div>

          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              <BriefcaseBusiness size={16} />
              Explore jobs
            </Link>
            <Link
              to="/network"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <Users size={16} />
              Grow network
            </Link>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Create
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Share something worth noticing
              </h2>
            </div>
            <span className="hidden rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700 md:inline-flex">
              Feed-first publishing
            </span>
          </div>
          <div className="hidden md:block">
            <PostCreation user={authUser} />
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Analytics
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Your profile and post performance
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Profile views</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{myAnalytics?.profileViews || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Post reach</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{myAnalytics?.postReach || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Total shares</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{myAnalytics?.totalShares || 0}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Feed
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                What your network is talking about
              </h2>
            </div>
            {feedStats.hasMomentum ? (
              <Link
                to="/notifications"
                className="hidden items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 md:inline-flex"
              >
                Check updates
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>

          {Array.isArray(posts) && posts.length ? (
            posts.map((post) => <Post key={post._id} post={post} />)
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Users size={30} />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                Your feed is waiting for momentum
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                Connect with professionals, explore suggestions, and start
                sharing updates so Worknet feels active from day one.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/suggestions"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Find people
                </Link>
                <Link
                  to="/jobs"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Browse jobs
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      {Array.isArray(recommendedUsers) && recommendedUsers.length > 0 ? (
        <div className="sticky top-[78px] hidden h-[calc(100vh-110px)] overflow-y-auto md:col-span-1 md:block lg:col-span-1">
          <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Suggestions
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  People worth knowing
                </h2>
              </div>
              <Link
                to="/suggestions"
                className="text-sm font-medium text-cyan-700 transition hover:text-cyan-800"
              >
                See all
              </Link>
            </div>
            <div className="space-y-1">
              {Array.isArray(recommendedUsers) ? (
                recommendedUsers.map((user) => (
                  <RecommendedUser
                    key={user._id}
                    user={user}
                    headlineWidth="max-w-[90px]"
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500">No suggestions found.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default HomePage;
