import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  SquarePlus,
  User,
  Users,
  X,
} from "lucide-react";
import { connectSocket, disconnectSocket } from "../../lib/socket";
import SmartImage from "../SmartImage";

const getBadgeCount = (count) => {
  if (!count) return "";
  return count > 9 ? "9+" : String(count);
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => axiosInstance.get("/notifications"),
    enabled: !!authUser,
  });

  const { data: connectionRequests } = useQuery({
    queryKey: ["connectionRequests"],
    queryFn: async () => axiosInstance.get("/connections/requests"),
    enabled: !!authUser,
  });

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await axiosInstance.get("/messages/conversations");
      return res.data;
    },
    enabled: !!authUser,
  });

  const { mutate: logout } = useMutation({
    mutationFn: () => axiosInstance.post("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["authUser"], null);
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/login", { replace: true });
      toast.success("Logged out successfully");
    },
    onError: () => {
      toast.error("Logout failed. Try again!");
    },
  });

  const { data: searchData, isFetching } = useQuery({
    queryKey: ["searchUsers", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await axiosInstance.get(`/search?query=${searchQuery}`);
      return res.data;
    },
    enabled: !!searchQuery.trim(),
    staleTime: 500,
  });

  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData);
      setHighlightedIndex(-1);
    } else {
      setSearchResults([]);
    }
  }, [searchData]);

  useEffect(() => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }

      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setHighlightedIndex(-1);
        if (!searchQuery.trim()) {
          setIsSearchOpen(false);
        }
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest("[data-mobile-menu-trigger='true']")
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchQuery]);

  const unreadNotificationCount =
    notifications?.data?.filter((notif) => !notif.read).length || 0;
  const unreadConnectionRequestsCount =
    connectionRequests?.data?.length || 0;
  const unreadMessagesCount =
    conversations?.reduce(
      (total, conversation) => total + (conversation.unreadCount || 0),
      0,
    ) || 0;

  const desktopNavItems = useMemo(() => {
    const items = [
      { to: "/", label: "Home", icon: Home },
      {
        to: "/network",
        label: "Network",
        icon: Users,
        badge: unreadConnectionRequestsCount,
      },
      {
        to: "/notifications",
        label: "Notifications",
        icon: Bell,
        badge: unreadNotificationCount,
      },
      {
        to: "/messages",
        label: "Messages",
        icon: MessageSquare,
        badge: unreadMessagesCount,
      },
      { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
    ];

    if (authUser?.role !== "recruiter") {
      items.splice(3, 0, {
        to: "/resume",
        label: "Resume",
        icon: ClipboardList,
      });
      items.push({
        to: "/applications",
        label: "Applications",
        icon: ClipboardList,
      });
    }

    if (authUser?.role === "recruiter") {
      items.push({
        to: "/recruiter/dashboard",
        label: "Recruiter",
        icon: Building2,
      });
    }

    return items;
  }, [
    authUser?.role,
    unreadConnectionRequestsCount,
    unreadMessagesCount,
    unreadNotificationCount,
  ]);

  const mobileNavItems = useMemo(() => {
    const items = [
      { to: "/", label: "Home", icon: Home },
      {
        to: "/network",
        label: "Network",
        icon: Users,
        badge: unreadConnectionRequestsCount,
      },
      { to: "/create-post", label: "Post", icon: SquarePlus },
      {
        to: "/notifications",
        label: "Alerts",
        icon: Bell,
        badge: unreadNotificationCount,
      },
      {
        to:
          authUser?.role === "recruiter"
            ? "/recruiter/dashboard"
            : `/profile/${authUser?.username}`,
        label: authUser?.role === "recruiter" ? "Recruiter" : "Me",
        icon: authUser?.role === "recruiter" ? Building2 : User,
      },
    ];

    return items;
  }, [
    authUser?.role,
    authUser?.username,
    unreadConnectionRequestsCount,
    unreadNotificationCount,
  ]);

  const quickLinks = useMemo(() => {
    const links = [
      { to: "/messages", label: "Messages", badge: unreadMessagesCount },
      { to: "/jobs", label: "Jobs" },
      { to: "/notifications", label: "Notifications", badge: unreadNotificationCount },
    ];

    if (authUser?.role !== "recruiter") {
      links.unshift({ to: "/resume", label: "Resume" });
      links.push({ to: "/applications", label: "Applications" });
    } else {
      links.push({ to: "/recruiter/dashboard", label: "Recruiter dashboard" });
    }

    return links;
  }, [authUser?.role, unreadMessagesCount, unreadNotificationCount]);

  const isPathActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleSearchResultClick = (username) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
    navigate(`/profile/${username}`);
  };

  const handleKeyDown = (event) => {
    if (!searchResults.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (event.key === "Enter" && highlightedIndex !== -1) {
      event.preventDefault();
      handleSearchResultClick(searchResults[highlightedIndex].username);
    } else if (event.key === "Escape") {
      setIsSearchOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (!authUser?._id) {
      return;
    }

    const socket = connectSocket();
    socket.emit("page:view", location.pathname);
    return () => {
      disconnectSocket();
    };
  }, [authUser?._id, location.pathname]);

  const searchPanel = authUser ? (
    <div ref={searchContainerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsSearchOpen((prev) => !prev)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 md:hidden"
        aria-label="Open search"
      >
        {isSearchOpen ? <X size={18} /> : <Search size={18} />}
      </button>

      <div className="hidden md:block">
        <div className="flex min-h-11 w-[320px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-600 transition focus-within:border-cyan-300 focus-within:bg-white focus-within:shadow-sm lg:w-[360px]">
          <Search size={16} className="text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search people by name"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
        </div>
      </div>

      {isSearchOpen ? (
        <>
          <div className="fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-[1px] md:hidden" />
          <div className="absolute right-0 top-full z-40 mt-3 w-[calc(100vw-2rem)] max-w-[560px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:left-0 md:right-auto md:w-full">
            <div className="border-b border-slate-200 p-4 md:hidden">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Search size={16} className="text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search people by name"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
              </div>
            </div>

            {!searchQuery.trim() ? (
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Search
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Find professionals by name and jump straight to their profile.
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {isFetching ? (
                  <div className="px-5 py-4 text-sm text-slate-500">
                    Searching...
                  </div>
                ) : searchResults.length ? (
                  searchResults.map((user, index) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleSearchResultClick(user.username)}
                      className={`flex w-full items-center gap-3 px-5 py-3 text-left transition ${
                        index === highlightedIndex
                          ? "bg-slate-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <SmartImage
                        src={user.profilePicture || "/avatar.png"}
                        alt={user.name}
                        className="h-10 w-10 rounded-2xl object-cover ring-1 ring-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          @{user.username}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-4 text-sm text-slate-500">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {authUser ? (
              <button
                type="button"
                data-mobile-menu-trigger="true"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>
            ) : null}

            <Link
              to="/"
              className="flex min-w-0 items-center gap-3 rounded-2xl px-1 transition hover:opacity-90"
            >
              <img
                className="h-10 w-10 rounded-2xl object-contain"
                src="/favicon-logo1.png"
                alt="Worknet"
              />
              <div className="hidden min-w-0 2xl:block">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                  Worknet
                </p>
                <p className="truncate text-xs text-slate-500">
                  Professional network
                </p>
              </div>
            </Link>
          </div>

          <div className="mx-2 hidden min-w-0 flex-1 justify-center md:flex lg:max-w-[320px] xl:max-w-[360px] 2xl:max-w-[420px]">
            {searchPanel}
          </div>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            {authUser ? (
              <>
                <div className="no-scrollbar flex max-w-[720px] items-center gap-1 overflow-x-auto rounded-[22px] border border-slate-200 bg-white px-2 py-1 shadow-sm 2xl:max-w-[860px]">
                  {desktopNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isPathActive(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`relative inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                        {item.badge ? (
                          <span
                            className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {getBadgeCount(item.badge)}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
                  >
                    <SmartImage
                      src={
                        authUser?.role === "recruiter"
                          ? authUser?.companyLogo ||
                            authUser?.profilePicture ||
                            "/avatar.png"
                          : authUser?.profilePicture || "/avatar.png"
                      }
                      alt={authUser?.name || "Profile"}
                      className="h-9 w-9 rounded-2xl object-cover ring-1 ring-slate-200"
                    />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">
                        Me
                      </p>
                      <p className="text-xs text-slate-500">
                        {authUser?.role === "recruiter" ? "Recruiter" : "Profile"}
                      </p>
                    </div>
                  </button>

                  {isProfileMenuOpen ? (
                    <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                      <div className="border-b border-slate-200 px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {authUser?.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {authUser?.role === "recruiter"
                            ? authUser?.companyName || "Recruiter account"
                            : `@${authUser?.username}`}
                        </p>
                      </div>
                      <div className="p-2">
                        <Link
                          to={
                            authUser?.role === "recruiter"
                              ? `/company/${authUser?.username}`
                              : `/profile/${authUser?.username}`
                          }
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                          <User size={16} />
                          View profile
                        </Link>
                        {authUser?.role === "recruiter" ? (
                          <Link
                            to="/recruiter/dashboard"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <Building2 size={16} />
                            Recruiter dashboard
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            logout();
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                          <LogOut size={16} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Join now
                </Link>
              </div>
            )}
          </div>

          {authUser ? (
            <div className="flex items-center gap-2 xl:hidden">
              <div className="md:hidden">{searchPanel}</div>
              <Link
                to="/notifications"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadNotificationCount ? (
                  <span className="absolute right-1 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {getBadgeCount(unreadNotificationCount)}
                  </span>
                ) : null}
              </Link>
              <Link
                to={
                  authUser?.role === "recruiter"
                    ? "/recruiter/dashboard"
                    : `/profile/${authUser?.username}`
                }
                className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
                aria-label="Open profile"
              >
                <SmartImage
                  src={
                    authUser?.role === "recruiter"
                      ? authUser?.companyLogo ||
                        authUser?.profilePicture ||
                        "/avatar.png"
                      : authUser?.profilePicture || "/avatar.png"
                  }
                  alt={authUser?.name || "Profile"}
                  className="h-full w-full object-cover"
                />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                to="/login"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </nav>

      {authUser && isMobileMenuOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/30 md:hidden" />
          <div
            ref={mobileMenuRef}
            className="fixed inset-x-4 top-20 z-50 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:hidden"
          >
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <SmartImage
                src={
                  authUser?.role === "recruiter"
                    ? authUser?.companyLogo ||
                      authUser?.profilePicture ||
                      "/avatar.png"
                    : authUser?.profilePicture || "/avatar.png"
                }
                alt={authUser?.name || "Profile"}
                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-200"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {authUser?.name}
                </p>
                <p className="text-xs text-slate-500">
                  {authUser?.role === "recruiter"
                    ? authUser?.companyName || "Recruiter account"
                    : `@${authUser?.username}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <span>{link.label}</span>
                  {link.badge ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {getBadgeCount(link.badge)}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </>
      ) : null}

      {authUser ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/92 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
          <div className="grid grid-cols-5 px-2 py-2">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const active = isPathActive(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span
                      className={`absolute right-3 top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        active ? "bg-white/20 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {getBadgeCount(item.badge)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Navbar;
