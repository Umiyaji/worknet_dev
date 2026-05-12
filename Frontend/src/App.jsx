import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import toast, { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./lib/axios";
import GlobalUploadProgressBar from "./components/GlobalUploadProgressBar";

const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignUpPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NetworkPage = lazy(() => import("./pages/NetworkPage"));
const PostSharePage = lazy(() => import("./pages/PostSharePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SuggestionsPage = lazy(() => import("./pages/SuggestionsPage"));
const PostCreateMobile = lazy(() => import("./pages/PostCreateMobile"));
const Resume = lazy(() => import("./pages/Resume"));
const Messages = lazy(() => import("./pages/messages"));
const RecruiterSignUpPage = lazy(() => import("./pages/auth/RecruiterSignUpPage"));
const RecruiterDashboardPage = lazy(() => import("./pages/RecruiterDashboardPage"));
const RecruiterJobsPage = lazy(() => import("./pages/RecruiterJobsPage"));
const RecruiterJobFormPage = lazy(() => import("./pages/RecruiterJobFormPage"));
const RecruiterApplicantsPage = lazy(() => import("./pages/RecruiterApplicantsPage"));
const RecruiterApplicantDetailPage = lazy(() => import("./pages/RecruiterApplicantDetailPage"));
const RecruiterAutomatedJobPostingPage = lazy(
  () => import("./pages/RecruiterAutomatedJobPostingPage"),
);
const JobsListingPage = lazy(() => import("./pages/JobsListingPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));
const RecruiterProfilePage = lazy(() => import("./pages/RecruiterProfilePage"));
const MyApplicationsPage = lazy(() => import("./pages/MyApplicationsPage"));

const RecruiterRoute = ({ authUser, children }) => {
  if (!authUser) return <Navigate to="/login" />;
  if (authUser.role !== "recruiter") return <Navigate to="/" />;
  return children;
};

function App() {
  const { data: authUser, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        return res.data;
      } catch (err) {
        if (err.response?.status === 401) {
          console.log("Auth Check: 401 Unauthorized - User is not logged in.");
          return null;
        }
        toast.error(err.response?.data?.message || "Something went wrong");
        return null;
      }
    },
    retry: false,
  });

  if (isLoading) return null;

  return (
    <Layout>
      <GlobalUploadProgressBar />
      <Suspense fallback={<div className="p-4 text-center text-sm text-gray-600">Loading...</div>}>
        <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/signup/recruiter"
          element={!authUser ? <RecruiterSignUpPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/create-post"
          element={authUser ? <PostCreateMobile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/notifications"
          element={
            authUser ? <NotificationsPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/Resume"
          element={authUser && authUser.role !== "recruiter" ? <Resume /> : <Navigate to={authUser ? "/" : "/login"} replace />}
        />
        <Route
          path="/resume/:username"
          element={authUser && authUser.role !== "recruiter" ? <Resume /> : <Navigate to={authUser ? "/" : "/login"} replace />}
        />

        <Route
          path="/messages"
          element={authUser ? <Messages /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/jobs"
          element={authUser ? <JobsListingPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/jobs/:jobId"
          element={authUser ? <JobDetailPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/applications"
          element={authUser ? <MyApplicationsPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/company/:username"
          element={authUser ? <RecruiterProfilePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/recruiter/dashboard"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterDashboardPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterJobsPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/new"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterJobFormPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/edit"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterJobFormPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/applicants"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterApplicantsPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/applicants/:applicationId"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterApplicantDetailPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/applicants"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterApplicantsPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/upload-excel"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterAutomatedJobPostingPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/automated-jobs"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterAutomatedJobPostingPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/network"
          element={authUser ? <NetworkPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/post/:postId"
          element={authUser ? <PostSharePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/posts/:postId"
          element={authUser ? <PostSharePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/:username"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/suggestions"
          element={authUser ? <SuggestionsPage /> : <Navigate to="/login" replace />}
        />
        </Routes>
      </Suspense>
      <Toaster />
    </Layout>
  );
}

export default App;
