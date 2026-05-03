import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const decodeJwtPayload = (token) => {
  try {
    const [, base64UrlPayload] = token.split(".");
    if (!base64UrlPayload) return null;

    const base64 = base64UrlPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch (error) {
    console.error("Failed to decode Google credential payload:", error);
    return null;
  }
};

const GoogleLoginComp = ({ authRole = "user", extraPayload = {}, onSuccessNavigateTo = "/" }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleonSuccess = async (credResponse) => {
    try {
      const profile = decodeJwtPayload(credResponse.credential);

      // Send the token to your backend
      await axiosInstance.post("/auth/google", {
        token: credResponse.credential,
        role: authRole,
        ...extraPayload,
        profile: {
          email: profile?.email || "",
          name: profile?.name || "",
          picture: profile?.picture || "",
        },
      });

      toast.success("Login successful!");
      // Invalidate auth query to update the logged-in user
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate(onSuccessNavigateTo);
    } catch (error) {
      console.error("Google login error:", error);
      toast.error(error.response?.data?.message || "Google login failed");
    }
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={(credentialResponse) => handleonSuccess(credentialResponse)}
        onError={() => {
          toast.error("Google login failed");
          console.log("Login Failed");
        }}
      />
    </div>
  );
};

export default GoogleLoginComp;
