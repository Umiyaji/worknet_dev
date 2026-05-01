/**
 * 📖 ENHANCED NAVBAR WITH SAFE DATA ACCESS
 *
 * This is an alternative approach using the safeDataAccess utilities
 * You can use either this pattern or the Array.isArray() pattern in the original Navbar
 *
 * KEY IMPROVEMENTS:
 * ✅ All data guaranteed to be correct type
 * ✅ Safe array operations (reduce, filter, map)
 * ✅ Better debugging with validateData()
 * ✅ Reusable pattern across the app
 * ✅ Centralized error handling
 */

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import {
  toArray,
  safeReduce,
  safeFilter,
  validateData,
} from "../../lib/safeDataAccess";
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

  // ✅ SAFE DATA EXTRACTION WITH DEBUGGING
  const notificationsList = toArray(notifications?.data);
  const connectionRequestsList = toArray(connectionRequests?.data);
  const conversationsList = toArray(conversations);

  // ✅ DEBUG: Validate data in development
  if (process.env.NODE_ENV === "development") {
    validateData(notificationsList, "array", "notificationsList");
    validateData(connectionRequestsList, "array", "connectionRequestsList");
    validateData(conversationsList, "array", "conversationsList");
  }

  const unreadNotificationCount = safeFilter(
    notificationsList,
    (notif) => !notif?.read,
  ).length;

  const unreadConnectionRequestsCount = connectionRequestsList.length;

  // ✅ SAFE REDUCE - guaranteed to work even if conversations is not an array
  const unreadMessagesCount = safeReduce(
    conversationsList,
    (total, conversation) => total + (conversation?.unreadCount || 0),
    0,
  );

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

  // ... (rest of the component remains the same)

  return (
    // Your JSX here
    <div>Navbar Component</div>
  );
};

export default Navbar;
