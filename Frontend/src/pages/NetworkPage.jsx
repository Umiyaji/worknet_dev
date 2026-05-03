import { useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader, Sparkles, UserPlus, Users } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import FriendRequest from "../components/FriendRequest";
import UserCard from "../components/UserCard";
import RecommendedUser from "../components/RecommendedUser";

const NetworkPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = queryClient.getQueryData(["authUser"]);
  const requestsSectionRef = useRef(null);
  const connectionsSectionRef = useRef(null);

  const { data: connectionRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["connectionRequests"],
    queryFn: () => axiosInstance.get("/connections/requests"),
  });

  const { data: connections, isLoading: loadingConnections } = useQuery({
    queryKey: ["connections"],
    queryFn: () => axiosInstance.get("/connections"),
  });

  const { data: suggestionMeta, isLoading: loadingSuggestions } = useQuery({
    queryKey: ["suggestionsMeta"],
    queryFn: () =>
      axiosInstance
        .get("/users/suggestions?limit=4&includeTotal=true")
        .then((res) => res.data),
  });
  const recommendedUsers = useMemo(() => {
    if (Array.isArray(suggestionMeta)) return suggestionMeta;
    if (suggestionMeta?.users && Array.isArray(suggestionMeta.users)) return suggestionMeta.users;
    return [];
  }, [suggestionMeta]);

  const isLoading =
    loadingRequests ||
    loadingConnections ||
    loadingSuggestions;

  const requestCount = connectionRequests?.data?.length || 0;
  const connectionCount = connections?.data?.length || 0;
  const recommendationCount = Array.isArray(suggestionMeta)
    ? suggestionMeta.length
    : suggestionMeta?.total ?? recommendedUsers.length;

  const connectionCards = useMemo(
    () => connections?.data?.filter(Boolean) || [],
    [connections],
  );

  const scrollToSection = (sectionRef) => {
    if (!sectionRef?.current) return;
    sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div className="hidden lg:col-span-1 lg:block">
        <Sidebar user={user} />
      </div>

      <div className="lg:col-span-3">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff,_#f7fbff)] px-5 py-6 sm:px-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)] xl:items-end">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                  <Sparkles size={14} />
                  Network
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-slate-950">
                  Grow meaningful professional relationships
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Keep up with requests, discover relevant people, and stay close
                  to the strongest opportunities in your circle.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:justify-self-end">
                <button
                  type="button"
                  onClick={() => scrollToSection(requestsSectionRef)}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                >
                  <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">
                    Requests
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {requestCount}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(connectionsSectionRef)}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                >
                  <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">
                    Connections
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {connectionCount}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/suggestions")}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                >
                  <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">
                    Suggestions
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {recommendationCount}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-4 py-5 sm:px-6">
            <section
              ref={requestsSectionRef}
              className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Requests
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Pending connection requests
                  </h2>
                </div>
                {requestCount ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {requestCount} pending
                  </span>
                ) : null}
              </div>

              {requestCount ? (
                <div className="space-y-3">
                  {connectionRequests.data
                    .filter(Boolean)
                    .map((request, index) => (
                      <FriendRequest
                        key={request._id || index}
                        request={request}
                      />
                    ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <UserPlus size={24} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    No requests waiting
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    You&apos;re all caught up. Explore suggested people below to keep
                    your network growing.
                  </p>
                </div>
              )}
            </section>

            {Array.isArray(recommendedUsers) && recommendedUsers.length > 0 ? (
              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Suggestions
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      People you may know
                    </h2>
                  </div>
                  <Link
                    to="/suggestions"
                    className="text-sm font-medium text-cyan-700 transition hover:text-cyan-800"
                  >
                    See all
                  </Link>
                </div>
                <div className="space-y-3">
                  {Array.isArray(recommendedUsers) ? (
                    recommendedUsers.map((suggestedUser) => (
                      <RecommendedUser
                        key={suggestedUser._id}
                        user={suggestedUser}
                        headlineWidth="max-w-[130px]"
                      />
                    ))
                  ) : null}
                </div>
              </section>
            ) : null}

            <section
              ref={connectionsSectionRef}
              className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Connections
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Your professional circle
                  </h2>
                </div>
                {connectionCount ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {connectionCount} total
                  </span>
                ) : null}
              </div>

              {connectionCards.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {connectionCards.map((connection) => (
                    <UserCard
                      key={connection._id}
                      user={connection}
                      isConnection={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <Users size={24} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    Start building your network
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    Connect with classmates, colleagues, and recruiters to unlock
                    more recommendations and better opportunities.
                  </p>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NetworkPage;
