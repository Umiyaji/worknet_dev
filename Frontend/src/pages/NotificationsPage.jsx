import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import {
  Bell,
  Briefcase,
  CheckCheck,
  ExternalLink,
  Loader,
  MessageSquare,
  Trash2,
  UserPlus,
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import SmartImage from "../components/SmartImage";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "hiring", label: "Hiring" },
  { key: "messages", label: "Messages" },
  { key: "network", label: "Network" },
  { key: "social", label: "Social" },
];

const NOTIFICATION_STYLES = {
  social: {
    icon: MessageSquare,
    badgeClass: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  },
  messages: {
    icon: MessageSquare,
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  network: {
    icon: UserPlus,
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  hiring: {
    icon: Briefcase,
    badgeClass: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
  general: {
    icon: Bell,
    badgeClass: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

const getNotificationStyle = (notification) =>
  NOTIFICATION_STYLES[notification.presentation?.group] ||
  NOTIFICATION_STYLES.general;

const getFilterCount = (notifications, filterKey) => {
  if (filterKey === "all") return notifications.length;
  if (filterKey === "unread") return notifications.filter((item) => !item.read).length;
  return notifications.filter(
    (item) => item.presentation?.group === filterKey,
  ).length;
};

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData(["authUser"]);
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => axiosInstance.get("/notifications"),
  });

  const notifications = useMemo(
    () => notificationsResponse?.data || [],
    [notificationsResponse],
  );

  const { mutate: markAsReadMutation, isPending: isMarkingRead } = useMutation({
    mutationFn: (id) => axiosInstance.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { mutate: markAllAsReadMutation, isPending: isMarkingAllRead } =
    useMutation({
      mutationFn: () => axiosInstance.put("/notifications/read-all"),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast.success("All notifications marked as read");
      },
    });

  const { mutate: deleteNotificationMutation } = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
  });

  const { mutate: bulkDeleteNotificationsMutation, isPending: isBulkDeleting } =
    useMutation({
      mutationFn: ({ ids }) =>
        axiosInstance.delete("/notifications", {
          data: ids?.length ? { ids } : {},
        }),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast.success(
          variables?.ids?.length
            ? "Selected notifications deleted"
            : "All notifications deleted",
        );
      },
    });

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const groupedSummary = useMemo(
    () => ({
      hiring: getFilterCount(notifications, "hiring"),
      messages: getFilterCount(notifications, "messages"),
      network: getFilterCount(notifications, "network"),
      social: getFilterCount(notifications, "social"),
    }),
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case "unread":
        return notifications.filter((item) => !item.read);
      case "hiring":
      case "messages":
      case "network":
      case "social":
        return notifications.filter(
          (item) => item.presentation?.group === activeFilter,
        );
      default:
        return notifications;
    }
  }, [activeFilter, notifications]);

  const filteredNotificationIds = useMemo(
    () => filteredNotifications.map((item) => item._id).filter(Boolean),
    [filteredNotifications],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div className="hidden h-[calc(100vh-110px)] overflow-y-auto lg:sticky lg:top-[78px] lg:col-span-1 lg:block">
        <Sidebar user={authUser} />
      </div>

      <div className="lg:col-span-3">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(135deg,_#f8fafc,_#ffffff_55%,_#eef6ff)] px-6 py-6 md:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Inbox
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                  Notifications
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Cleaner updates for hiring, messages, networking, and post
                  activity. Every notification now keeps a stable structure and
                  meaningful fallback details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => markAllAsReadMutation()}
                disabled={!unreadCount || isMarkingAllRead}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMarkingAllRead ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <CheckCheck size={16} />
                )}
                Mark all as read
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    bulkDeleteNotificationsMutation({
                      ids:
                        activeFilter === "all" ? [] : filteredNotificationIds,
                    })
                  }
                  disabled={
                    !filteredNotificationIds.length || isBulkDeleting
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBulkDeleting ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  {activeFilter === "all"
                    ? "Delete all"
                    : `Delete ${activeFilter}`}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Total
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {notifications.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Unread
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {unreadCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Hiring updates
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {groupedSummary.hiring}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Messages
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {groupedSummary.messages}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 px-6 py-4 md:px-8">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {getFilterCount(notifications, filter.key)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-6 md:px-8">
            {isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-slate-600">
                <Loader size={18} className="animate-spin" />
                <span>Loading notifications...</span>
              </div>
            ) : filteredNotifications.length ? (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  const style = getNotificationStyle(notification);
                  const Icon = style.icon;
                  const actor = notification.actor || {
                    name: "Worknet",
                    profilePicture: "/avatar.png",
                    username: "",
                  };
                  const href = notification.presentation?.href;
                  const about = notification.presentation?.about;

                  return (
                    <article
                      key={notification._id}
                      className={`rounded-3xl border p-5 transition ${
                        notification.read
                          ? "border-slate-200 bg-white"
                          : "border-sky-200 bg-sky-50/50 shadow-sm"
                      }`}
                      onClick={() => {
                        if (!notification.read && !isMarkingRead) {
                          markAsReadMutation(notification._id);
                        }
                      }}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <SmartImage
                            src={actor.profilePicture || "/avatar.png"}
                            alt={actor.name}
                            className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.badgeClass}`}
                              >
                                <Icon size={14} />
                                {notification.presentation?.group || "general"}
                              </span>
                              {!notification.read ? (
                                <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                  New
                                </span>
                              ) : null}
                            </div>

                            <h2 className="mt-3 text-base font-semibold text-slate-900">
                              {notification.presentation?.title || "New notification"}
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {notification.presentation?.description ||
                                "You have a new update on Worknet."}
                            </p>

                            {about?.value ? (
                              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  {about.label || "About"}
                                </p>
                                <p className="mt-1 text-sm text-slate-700">
                                  {about.value}
                                </p>
                                {about.path ? (
                                  <Link
                                    to={about.path}
                                    className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800"
                                  >
                                    <ExternalLink size={14} />
                                    {about.pathLabel || "Open related item"}
                                  </Link>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              {notification.relatedApplication?.status ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                  {notification.relatedApplication.status}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              {href ? (
                                <Link
                                  to={href}
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                                >
                                  <ExternalLink size={14} />
                                  {notification.presentation?.actionLabel || "Open"}
                                </Link>
                              ) : null}

                              {!notification.read ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    markAsReadMutation(notification._id);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <CheckCheck size={14} />
                                  Mark as read
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteNotificationMutation(notification._id);
                          }}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                          aria-label="Delete notification"
                          title="Delete notification"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                  <Bell size={24} />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">
                  {activeFilter === "all"
                    ? "No notifications yet"
                    : `No ${activeFilter} notifications`}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  New activity from jobs, messages, and your network will show
                  up here with clearer details and direct actions.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NotificationsPage;
